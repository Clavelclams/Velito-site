---
titre: "Trois octets invisibles qui décident si Excel affiche « Aurélie » ou « AurÃ©lie »"
projet: "arena"
bloc: 3
themes: ["interoperabilite", "http"]
source: "apps/arena/lib/arena/csv.ts"
date: 2026-09-04
---

## Le concept

ARENA promet qu'un club peut « tester sur un tournoi sans rien migrer et repartir sans rien perdre ». L'export CSV est la moitié « repartir » de cette phrase — et c'est précisément ce que les plateformes pro facturent (l'accès API de Toornament démarre à 229 €/mois). Ici, c'est un lien.

Un CSV a l'air trivial. Il ne l'est pas, parce que le vrai destinataire n'est pas un parseur : c'est un bénévole d'association qui va double-cliquer sur le fichier et l'ouvrir dans Excel en français. Trois décisions en découlent.

**Séparateur `;` et non `,`.** En configuration française, Excel utilise la virgule comme séparateur *décimal*. Un CSV à virgules s'ouvre en une seule colonne illisible ; un CSV à point-virgule s'ouvre correctement. On optimise pour l'utilisateur réel, pas pour la norme.

**BOM UTF-8 en tête.** Sans lui, Excel sous Windows suppose du latin-1 et affiche `AurÃ©lie`. Le *Byte Order Mark* (`﻿`) est un marqueur de trois octets qui lui dit « c'est de l'UTF-8 ». Invisible pour tous les autres outils.

**Échappement RFC 4180.** Un champ qui contient le séparateur, un guillemet ou un saut de ligne est entouré de guillemets, et ses guillemets internes sont doublés :

```ts
export function echapperChampCsv(valeur: string): string {
  const doitCiter =
    valeur.includes(SEPARATEUR_CSV) || valeur.includes('"') ||
    valeur.includes("\n") || valeur.includes("\r");
  return doitCiter ? `"${valeur.replace(/"/g, '""')}"` : valeur;
}
```

Sans ça, un pseudo contenant `;` casse toutes les colonnes suivantes. C'est le cousin CSV de l'injection SQL : **une donnée utilisateur qu'on colle dans une syntaxe sans l'échapper**.

Côté HTTP, le nom de fichier accentué a aussi son piège :

```ts
"Content-Disposition":
  `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`,
"Cache-Control": "no-store",
```

`filename` en ASCII pour les vieux clients, `filename*` en UTF-8 (RFC 5987) pour les autres. Et `no-store`, parce qu'un export reflète l'instant du clic : un CDN ne doit jamais servir le classement d'hier.

## Comment je l'explique au jury

« L'export CSV est une promesse produit — les données appartiennent au club, il peut repartir avec. Techniquement, j'ai optimisé pour le destinataire réel : un bénévole qui ouvre le fichier dans Excel en français. Donc séparateur point-virgule, parce que la virgule est le séparateur décimal en français ; BOM UTF-8, sans lequel Excel Windows casse les accents ; et échappement RFC 4180, qui protège des pseudos contenant le séparateur ou un guillemet — c'est le même réflexe que l'échappement SQL, une donnée utilisateur qu'on injecte dans une syntaxe. Le module est pur et testé, parce qu'un export ne peut pas être "à peu près juste". »

## La question vicieuse du jury

**« Le BOM et le point-virgule cassent la compatibilité avec les outils standards. Vous avez choisi Excel contre tout le monde. »**

C'est le bon reproche, et j'assume l'arbitrage. En pratique le BOM ne gêne quasiment personne : `pandas.read_csv` avec `encoding="utf-8-sig"`, les tableurs modernes et la plupart des bibliothèques le sautent — le cas qui souffre, c'est un script naïf qui lit le fichier octet par octet et se retrouve avec un caractère invisible dans son premier en-tête. Le séparateur est plus discutable, mais il est déclaré : je le publie dans le module (`SEPARATEUR_CSV`) et un outil qui ingère mes fichiers le paramètre une fois. Surtout, le CSV n'est pas ma seule sortie : la route `GET /api/export/[token]` rend le même tournoi en **JSON**, avec un champ `format: "arena-export-v1"`. Le CSV vise l'humain avec un tableur, le JSON vise la machine. Je n'ai pas eu à choisir un seul format, j'ai choisi de servir deux publics différents avec deux formats adaptés.
