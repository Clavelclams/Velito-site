---
titre: "Open redirect : ton domaine comme tremplin, et la liste blanche exacte"
parcours: "securite-web"
ordre: 7
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Le hub redirige après la connexion (`?return=…`), après le logout, après une autorisation OAuth (`redirect_uri`). Chaque fois que la **destination vient d'un paramètre**, il y a un risque d'*open redirect*.

**L'attaque.** `https://hub.velito.fr/logout?return=https://evil.com/velito-login` envoyé à une victime. Elle voit `hub.velito.fr` au début du lien — un domaine de confiance — clique, est déconnectée, puis redirigée vers une copie de ta page de connexion. Elle tape ses identifiants. Ton domaine a servi d'appât ; ta réputation, de caution. Les filtres anti-phishing laissent passer parce que le lien pointe bien vers toi.

C'est aussi une brique d'autres attaques : dans OAuth, un `redirect_uri` non validé envoie le **code d'autorisation** chez l'attaquant. C'est pour ça que les serveurs OAuth exigent une correspondance **exacte** du `redirect_uri` avec ceux enregistrés.

**La parade : une liste blanche d'origines exactes.**

```ts
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://hub.velito.fr",
  "https://velito.fr",
  "https://vea.velito.fr",
  "https://interactive.velito.fr",
  "https://arena.velito.fr",
  "http://localhost:3000",
]);

function returnSur(candidat: string): string {
  try {
    const u = new URL(candidat);
    return ALLOWED_RETURN_ORIGINS.has(u.origin) ? candidat : "/";
  } catch {
    return "/";
  }
}
```

`new URL()` parse ; `.origin` donne protocole + domaine + port, sans le chemin. On compare **l'origine entière** à un ensemble fermé. Tout ce qui n'y est pas retombe sur `/`.

**Ce qui est refusé, et pourquoi c'est important.**

- `startsWith("https://velito.fr")` → laisse passer `https://velito.fr.evil.com`. Le domaine est `velito.fr.evil.com`, pas `velito.fr`.
- `includes("velito.fr")` → laisse passer `https://evil.com/?x=velito.fr`.
- `endsWith(".velito.fr")` sur le **host** → mieux (c'est ce que fait `MarqueResolver` sur Venaball), mais accepte n'importe quel sous-domaine — y compris un que tu aurais délégué à un tiers un jour.
- Un motif `*.velito.fr` → même problème.
- Une URL relative `//evil.com` → certains parseurs la lisent comme `https://evil.com`. `new URL("//evil.com", base)` résout vers evil.com. D'où l'importance de comparer l'**origine** après parsing, pas la chaîne brute.

Seule l'**égalité exacte sur l'origine** tient contre tous ces cas.

**L'ordre des opérations dans OAuth.** L'endpoint `/oauth/authorize` du hub a un détail crucial : quand un paramètre est invalide, la spec dit de rediriger vers le `redirect_uri` avec `?error=…`. Mais **tant que le `redirect_uri` n'est pas validé**, cette redirection serait elle-même un open redirect — l'attaquant fournit un `client_id` faux et un `redirect_uri` à lui, et le message d'erreur le redirige chez lui. Donc :

1. `client_id` manquant ou inconnu → page d'erreur affichée **sur le hub**, pas de redirection.
2. `redirect_uri` absent ou pas dans la liste du client → page d'erreur sur le hub.
3. **Seulement après** ces deux validations : toute erreur suivante peut rediriger vers le `redirect_uri` avec `error=`.

Le commentaire du fichier le dit en majuscules : « on N'A PAS le droit de rediriger vers une URL non validée ». Le mécanisme de report d'erreur ne doit jamais devenir le vecteur.

**Où vit la liste.** Les origines du logout sont **en dur dans le code** : ce sont tes propres apps, elles changent rarement, et une liste dans le code est auditable (dans le diff, dans la revue) et non modifiable par quelqu'un qui aurait accès à la base. Les `redirect_uri` OAuth sont **en base** (`oauth_clients`) : ce sont des tiers, potentiellement enregistrés dynamiquement. Même exigence d'exactitude, lieu différent. La règle : mon périmètre dans le code, les tiers en base.

**Le cas Venaball.** Le commit sécurité du 26 juillet mentionne « open redirect » parmi les corrections : le paramètre de retour après login acceptait n'importe quelle URL. Même faille, même parade. Cherche-la dans `CompteController` ou l'authenticator.

## À retenir

- Open redirect = ton domaine de confiance redirige vers l'attaquant. Phishing, et vol de code OAuth.
- Parade : `new URL()`, `.origin`, comparaison exacte avec un `Set` fermé. Sinon `/`.
- `startsWith`, `includes`, jokers, `endsWith` sur la chaîne brute : tous contournables.
- OAuth : ne jamais rediriger vers un `redirect_uri` non encore validé, même pour signaler une erreur.
- Mon périmètre en dur dans le code ; les tiers en base. Même exactitude.

## Mise en pratique

Objectif : attaquer tes redirections avec cinq URL piégées, et vérifier que chacune est rejetée.

1. Écris `tests/redirect.test.ts` (Vitest, dans `apps/hub`) qui importe la fonction de validation du `return` (extrais-la de `app/logout/route.ts` si elle est inline). Cinq cas : `https://hub.velito.fr/account` (accepté), `https://velito.fr.evil.com` (rejeté), `https://evil.com/?x=velito.fr` (rejeté), `//evil.com` (rejeté), `javascript:alert(1)` (rejeté — `new URL` le parse, l'origine est `null`).
2. Lance. Si un cas passe alors qu'il devrait être rejeté, corrige la fonction (probablement un `startsWith` ou une comparaison de chaîne). Commit.
3. Hub local : `http://localhost:3000/logout` en POST avec `return=https://evil.com`. Tu atterris sur `/` du hub. Puis avec `return=http://localhost:3001/x` (si dans la liste) → tu y vas.
4. OAuth : `http://localhost:3000/oauth/authorize?client_id=inconnu&redirect_uri=https://evil.com` → page d'erreur **sur le hub**, pas de redirection. Puis `client_id` valide + `redirect_uri` non enregistré → idem. Puis `client_id` valide + `redirect_uri` enregistré + `response_type=token` (invalide) → redirection vers le `redirect_uri` avec `error=unsupported_response_type`. C'est l'ordre correct.
5. Venaball : trouve le paramètre de retour après login (`_target_path` ou custom). Tente `?_target_path=https://evil.com`. Doit retomber sur l'accueil. Si tu atterris sur evil.com, applique la liste blanche (ou n'accepte que des chemins relatifs commençant par `/` et pas `//`).
6. `findstr /s "redirect(" apps\*\app apps\*\src` : pour chaque `redirect(x)` où `x` n'est pas une chaîne littérale, d'où vient `x` ? S'il vient d'un paramètre, quelle validation ?

Résultat attendu : cinq URL piégées rejetées par tes tests, l'ordre OAuth vérifié, et un audit de chaque `redirect` dynamique.
