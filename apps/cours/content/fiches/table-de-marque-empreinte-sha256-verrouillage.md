---
titre: "Verrouiller une feuille signée avec une empreinte SHA-256, et savoir ce qu'elle ne prouve pas"
projet: "table-de-marque"
bloc: 1
themes: ["securite-applicative"]
source: "maquette/emarque-unss/js/empreinte.js"
date: 2026-10-10
---

## Le concept

Une fois que l'arbitre et les deux profs ont signé, la feuille de match ne doit plus bouger. La table de marque fait deux choses au verrouillage.

1. **Bloquer les modifications** dans l'app : `MATCH_VERROUILLER` (`js/match.js`) n'accepte de verrouiller qu'un match terminé avec les trois signatures obligatoires (`arbitre1`, `profA`, `profB`), puis toute action sur ce match est ignorée (`if (m.verrouillage) return m;`).
2. **Calculer une empreinte** du contenu, imprimée sur la feuille PDF :

```js
/** Ce qui fait foi sur la feuille : équipes, réglages, événements, officiels, signatures. */
function contenu(match) {
  const { equipes, reglages, evenements, officiels, signatures, sportId, competitionId } = match;
  return JSON.stringify({ sportId, competitionId, equipes, reglages, evenements, officiels, signatures });
}

export async function calculerEmpreinte(match) {
  const texte = contenu(match);
  try {
    const octets = new TextEncoder().encode(texte);
    const hache = await crypto.subtle.digest('SHA-256', octets);
    return 'sha256:' + [...new Uint8Array(hache)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'simple:' + fnv1a(texte);
  }
}
```

(`maquette/emarque-unss/js/empreinte.js`)

Une **fonction de hachage** transforme un texte de n'importe quelle taille en une suite de taille fixe (64 caractères hexadécimaux pour SHA-256). Changer un seul caractère du texte change complètement le résultat, et on ne sait pas fabriquer un autre texte qui donne la même empreinte. Si quelqu'un recalcule plus tard l'empreinte du même match et trouve la même valeur, le contenu n'a pas bougé.

Trois détails du code comptent :
- `contenu()` choisit **ce qui fait foi** et construit l'objet toujours dans le même ordre de clés. `JSON.stringify` respecte l'ordre d'insertion : un ordre différent donnerait une autre empreinte pour le même match.
- Les **signatures** (images PNG en base64 issues du canvas, `js/signature.js`) sont dans l'empreinte : remplacer une signature la change.
- `crypto.subtle` n'existe qu'en contexte sécurisé (https ou localhost). Ailleurs, le code se replie sur FNV-1a, un hachage de 32 bits rapide mais pas cryptographique, et le **préfixe** `simple:` le dit sur la feuille au lieu de le cacher. En production, le site est en https, donc c'est SHA-256.

## Comment je l'explique au jury

« Au verrouillage, l'app refuse toute modification du match, et je calcule une empreinte SHA-256 de tout ce qui fait foi : équipes, réglages, journal d'événements, officiels et signatures. Elle est imprimée sur la feuille. Si on recalcule plus tard l'empreinte du même contenu et qu'on retrouve la même valeur, on sait que rien n'a changé après les signatures. J'utilise l'API Web Crypto du navigateur, qui n'est disponible qu'en https ; sinon je me replie sur un hachage simple et je le signale par un préfixe, je ne fais pas semblant. Et je sais ce que ça ne prouve pas : sans serveur, c'est une preuve d'intégrité, pas une preuve d'authenticité. »

## La question vicieuse du jury

**« Un prof un peu malin ouvre les outils de développement, modifie le score dans le localStorage et recalcule l'empreinte. Votre verrou sert à quoi ? »**

Dans la maquette actuelle, il ne l'en empêche pas, et je le dis. Un hachage seul prouve qu'un contenu n'a pas changé **par rapport à une empreinte qu'on a gardée ailleurs**. Ici l'empreinte est stockée dans le même `localStorage` que les données, sans clé secrète ni horodatage externe : qui peut modifier l'un peut recalculer l'autre. En plus, aucun code ne revérifie l'empreinte aujourd'hui : elle est calculée et affichée, c'est tout.

Ce qu'elle apporte quand même : le PDF imprimé ou envoyé juste après le match porte l'empreinte. Si la feuille est modifiée ensuite, l'empreinte recalculée ne correspondra plus à celle du PDF déjà diffusé.

La vraie correction passe par le serveur, qui n'existe pas encore : envoyer la feuille verrouillée dès qu'il y a du réseau, que le serveur recalcule et horodate l'empreinte de son côté, et la garde. À partir de là, c'est la copie serveur qui fait foi, et une tablette modifiée ne peut plus tricher. Une signature numérique (clé privée par établissement) irait plus loin, mais la gestion des clés sur des tablettes partagées est un vrai chantier, à discuter avec l'UNSS.
