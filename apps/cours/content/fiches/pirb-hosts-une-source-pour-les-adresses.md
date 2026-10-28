---
titre: "Une seule source pour les adresses : l'app déduit tout du serveur qu'elle vise au build"
projet: "pirb"
bloc: 3
themes: ["deploiement", "mobile"]
source: "src/services/hosts.ts"
date: 2026-10-10
---

## Le concept

Mon app joueuse parle à un serveur, mais elle ouvre aussi des pages web de ce serveur : « mot de passe oublié », « créer mon compte », l'espace club, le Playground. Or il existe deux instances du même code Symfony : `pirb.mabb.fr` (le club MABB, comptes réels) et `api.venaball.fr` (l'instance produit). Le profil de build choisit laquelle, dans `eas.json` :

- `development` et `preview` : `EXPO_PUBLIC_API_URL=https://pirb.mabb.fr`
- `preview-venaball` et `production` : `EXPO_PUBLIC_API_URL=https://api.venaball.fr`

Une variable `EXPO_PUBLIC_*` est **recopiée dans le code JavaScript au moment du build**. Elle n'est pas lue au lancement : le binaire contient la valeur en dur. La doc `instruction/20_BASCULE_VENABALL_2026-09-09.md` le dit : changer le `.env` après coup ne change rien à un binaire déjà construit, il faut rebuilder.

Le problème du 30/09 : chaque écran recopiait `process.env.EXPO_PUBLIC_API_URL ?? 'https://pirb.mabb.fr'`, et deux écrans avaient `manager.mabb.fr` écrit en dur. Le premier APK de test visant Venaball envoyait donc « mot de passe oublié » vers l'instance MABB, et vers une page qui n'existait pas (`/reset-password`). La correction (commits `42c6808` et `991e451`) : un seul fichier qui dérive toutes les adresses de la variable du build.

```ts
// src/services/hosts.ts
export const API_BASE: string = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.venaball.fr';

export const MANAGER_BASE: string = (() => {
  try {
    const u = new URL(API_BASE);
    const parts = u.hostname.split('.');
    const sous = parts[0];
    const reste = parts.slice(1).join('.');
    if (sous === 'pirb') return `${u.protocol}//manager.${reste}`;
    if (sous === 'app' || sous === 'api') return `${u.protocol}//club.${reste}`;
    return API_BASE;
  } catch {
    return API_BASE;
  }
})();

export const URLS = {
  motDePasseOublie: `${MANAGER_BASE}/mot-de-passe-oublie`,
  inscription: `${MANAGER_BASE}/inscription`,
  creerClub: `${MANAGER_BASE}/creer-un-club`,
} as const;
```

Le mécanisme : l'espace joueuse et l'espace club sont deux sous-domaines du même serveur. Je lis le premier morceau du nom d'hôte de l'API et j'en déduis l'espace club (`pirb` donne `manager`, `api` ou `app` donnent `club`). Tout autre hôte, par exemple une adresse locale de développement, reste tel quel. Le même fichier fournit `DOMAINE_AFFICHE` et `NOM_ESPACE_CLUB` pour les textes : « Connecte-toi avec ton compte Venaball Club » ou « MABB Manager » selon l'instance. Les écrans (`LoginScreen.tsx`, `club.tsx`, `documents.tsx`, les deux écrans du Playground) importent ces constantes au lieu d'écrire un domaine.

Le pourquoi : une adresse écrite à dix endroits, c'est dix endroits à ne pas oublier le jour où le serveur change, et le jour est arrivé (l'hébergement MABB ferme le 22/10/2026). Sans ce fichier, un club qui n'est pas le MABB aurait pu se retrouver à créer son compte sur l'instance d'un autre club. L'app Club (`venaball club-store`) a repris le même principe le 03/10 dans son propre `src/services/hosts.ts`.

## Comment je l'explique au jury

J'ai deux serveurs qui font tourner le même code, et c'est le profil de build qui décide lequel mon app vise, parce qu'une variable `EXPO_PUBLIC` est figée dans le binaire à la compilation. Au premier APK de test, le lien « mot de passe oublié » partait sur le mauvais serveur et sur une page inexistante, parce que chaque écran recopiait son adresse. J'ai créé `src/services/hosts.ts`, qui lit la variable une fois et en déduit toutes les adresses, y compris celle de l'espace club par le sous-domaine. Les écrans n'écrivent plus de domaine, ils importent une constante. Le jour où le MABB migre sur l'instance Venaball, je change une valeur par profil dans `eas.json` et je rebuild, sans toucher au code des écrans.

## La question vicieuse du jury

**« Vous parlez d'une source unique, mais `session.ts` et `data/index.ts` lisent encore `process.env.EXPO_PUBLIC_API_URL` directement. Et il reste un `mabb.fr` en dur dans l'app. »**

C'est vrai, et je le montre. `src/services/auth/session.ts` (connexion) et `src/services/data/index.ts` (fabrique des données) lisent la variable eux-mêmes et lèvent une erreur si elle manque, alors que `hosts.ts` retombe sur `https://api.venaball.fr`. Ce sont deux comportements différents pour la même absence. En pratique le cas ne se produit pas dans un build EAS, parce que `eas.json` pose la variable sur les quatre profils, mais c'est une incohérence. La correction propre : faire de `hosts.ts` le seul lecteur de la variable, et lui faire lever l'erreur en release au lieu d'un repli silencieux. Pour le domaine en dur, `app/claveliito.tsx` ouvre encore `https://mabb.fr/clavel` : c'est une page perso, pas une adresse du serveur, mais elle contredit la règle de mon `CLAUDE.md` et elle est dans ma liste de corrections avant la soumission. Enfin, je n'ai pas encore revérifié sur un téléphone que la déduction du sous-domaine donne la bonne page après la correction : c'est un test prévu sur le prochain build preview-venaball.
