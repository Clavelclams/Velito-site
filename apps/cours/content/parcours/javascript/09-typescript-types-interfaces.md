---
titre: "TypeScript : le filet de sécurité de ton code"
parcours: "javascript"
ordre: 9
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Surprise : tu n'écris pas du JavaScript. Tes fichiers finissent en `.ts` et `.tsx` — c'est du **TypeScript**. Bonne nouvelle : TypeScript, c'est JavaScript + des **annotations de types**. Tout ce que tu as appris reste vrai ; on ajoute juste des étiquettes.

Pourquoi ? En JavaScript pur, si tu passes un texte à une fonction qui attend un nombre, tu ne le découvres qu'à l'exécution, quand ça plante. TypeScript vérifie AVANT, pendant que tu écris : c'est le correcteur orthographique de tes types. Les soulignés rouges de VS Code dans tes projets, c'est lui. À la compilation, les annotations sont **effacées** : le navigateur ne reçoit que du JavaScript pur. TypeScript n'existe qu'au moment de l'écriture — zéro effet à l'exécution.

L'annotation de base : deux-points après le nom, puis le type.

```ts
const titre: string = "Ma fiche";   // souvent inutile : TS devine tout seul
let score: number = 0;

// Là où ça compte : les fonctions — entrées ET sortie
function marquerFicheLue(slug: string): number {
  // slug DOIT être un texte ; la fonction DOIT renvoyer un nombre
  return 20;
}
```

C'est la vraie signature de ta fonction dans `lib/progression.ts`. Elle se lit : « entre un texte, sort un nombre ». Si un jour tu écris `marquerFicheLue(42)`, VS Code souligne en rouge immédiatement — pas de plantage surprise trois semaines plus tard.

Pour décrire un OBJET (leçon 6), on déclare une **interface** — le plan de fabrication, la liste des champs obligatoires et leurs types :

```ts
interface ResultatQuiz {
  meilleurScore: number;
  total: number;
  dernierPassage: string;
}
```

C'est mot pour mot l'interface de ton `progression.ts`. Tout objet étiqueté `ResultatQuiz` doit avoir CES trois champs, avec CES types. Champ manquant, champ en trop, mauvais type : souligné rouge.

Trois raffinements que ton code utilise partout :

```ts
interface FicheMeta {
  slug: string;
  source?: string;        // "?" = champ OPTIONNEL : peut être absent
  bloc: 1 | 2 | 3;        // UNION de littéraux : uniquement 1, 2 ou 3
  themes: string[];       // tableau de textes
}
```

C'est (en résumé) ta vraie `FicheMeta` de `lib/fiches/fiches.ts`. Le `bloc: 1 | 2 | 3` est une **union** : la barre verticale se lit « ou ». Impossible d'y mettre 4 — le référentiel CDA a trois blocs, le type le grave dans le marbre. Ton app Pirb pousse plus loin : `type PosteBasket = 'Meneuse' | 'Arrière' | 'Ailière' | 'Ailière forte' | 'Pivot'` dans `src/types/pirb.ts` — cinq textes précis autorisés, aucun autre. Une faute de frappe (`'Meneuze'`) devient une erreur de compilation au lieu d'un bug silencieux.

Une interface peut aussi en **étendre** une autre : dans `fiches.ts`, `interface Fiche extends FicheMeta { contenu: string }` — « tout FicheMeta, plus le contenu ». Le spread de la leçon 6, version types.

Dernier point, que tu as vu passer en leçon sur ta recherche : **`import type`**.

```ts
import type { FicheMeta } from "@/lib/fiches/fiches";
```

Ça importe UNIQUEMENT le type, pas le code du fichier. Comme les types sont effacés à la compilation, cet import disparaît complètement. C'est crucial dans `RechercheFiches.tsx` : `fiches.ts` utilise `fs` (lecture de fichiers, serveur uniquement) — grâce à `import type`, aucun code serveur ne part dans le navigateur. Une phrase en or pour le jury : « j'utilise `import type` pour partager les contrats de données entre serveur et client sans embarquer le code serveur dans le bundle ».

## À retenir

- TypeScript = JavaScript + annotations de types, vérifiées à l'écriture et EFFACÉES à la compilation.
- `function f(slug: string): number` : types des entrées et de la sortie — les erreurs se voient dans VS Code, pas en production.
- Une `interface` est le plan d'un objet : champs, types, `?` pour optionnel.
- Une union `1 | 2 | 3` restreint aux valeurs listées ; `extends` ajoute des champs à une interface existante.
- `import type` importe le contrat sans le code : c'est ce qui garde `fs` hors du navigateur dans ton site.

## Mise en pratique

Direction VS Code, dans ton projet `apps/cours` :

1. Ouvre `lib/progression.ts`. Lis l'interface `Progression` et dis à voix haute le type de chaque champ (`xp`, `fichesLues`, `quiz`, `serie`). Note que `serie` a un type objet écrit directement : `{ jours: number; derniereActivite: string }`.
2. Survole avec la souris l'appel `chargerProgression()` quelque part : VS Code t'affiche `(): Progression`. C'est le contrat : aucune entrée, sortie garantie `Progression`.
3. Provoque une erreur : dans `progression.ts`, change temporairement `return XP_FICHE_LUE;` en `return "20";` dans `marquerFicheLue`. **Résultat attendu :** souligné rouge immédiat — la fonction promet `number`, tu renvoies un `string`. Lis le message d'erreur en entier, puis remets le code d'origine.
4. Ouvre `lib/fiches/fiches.ts` : trouve `bloc: 1 | 2 | 3` dans `FicheMeta`, puis `interface Fiche extends FicheMeta`. Explique à voix haute ce que `extends` apporte.
5. Ouvre `src/types/pirb.ts` (projet Pirb store) : lis `PosteBasket` et `JoueurProfil`. Repère trois champs qui utilisent `| null` et dis pourquoi (indice : un profil peut ne pas avoir de poste renseigné — le type FORCE ton code à gérer ce cas).
6. Ouvre `app/components/RechercheFiches.tsx` ligne 18 : lis `import type { FicheMeta }` et redis la phrase jury : pourquoi `import type` et pas `import` ?
