---
titre: "Premier test Vitest : describe, it, expect — sur ton propre code"
parcours: "tests"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Vitest est le lanceur de tests de ton monorepo (`"test": "vitest run"` dans `package.json`). Il comprend TypeScript, tourne en quelques millisecondes, et son API tient en trois mots.

**La structure d'un fichier de test.** Convention : `truc.test.ts` à côté de `truc.ts`. Vitest les trouve tout seul.

```ts
import { describe, expect, it } from "vitest";
import { probabiliteVictoire, facteurK } from "./elo";

describe("probabiliteVictoire", () => {
  it("à notes égales, c'est 50/50", () => {
    expect(probabiliteVictoire(1000, 1000)).toBeCloseTo(0.5, 10);
  });

  it("400 points d'écart = 10 fois plus de chances", () => {
    expect(probabiliteVictoire(1400, 1000)).toBeCloseTo(10 / 11, 6);
  });
});
```

- **`describe("…", () => { … })`** : un groupe. Nomme-le comme la fonction ou le comportement testé. Les groupes s'imbriquent.
- **`it("…", () => { … })`** (ou `test`) : un cas. Le nom est une **phrase qui décrit le comportement attendu** — « à notes égales, c'est 50/50 » — pas « test 1 ». Quand il échoue, ce nom est ce que tu lis.
- **`expect(valeur).matcher(attendu)`** : l'assertion. Si elle est fausse, le test échoue avec un message qui montre les deux valeurs.

**Les matchers à connaître.**

- `toBe(x)` — égalité stricte (`===`). Pour les nombres, chaînes, booléens.
- `toEqual(obj)` — égalité **structurelle**, en profondeur. Pour les objets et tableaux : `expect(poules).toEqual([["a","c"],["b"]])`.
- `toBeCloseTo(x, décimales)` — pour les flottants. `0.1 + 0.2` n'est pas `0.3` en JavaScript ; `toBeCloseTo(0.3, 10)` tolère l'erreur d'arrondi. **Jamais `toBe` sur un calcul à virgule.**
- `toBeNull()`, `toBeUndefined()`, `toBeTruthy()`, `toBeFalsy()`.
- `toContain(x)` — un tableau contient x, ou une chaîne contient x.
- `toHaveLength(n)`.
- `toThrow("message")` — la fonction lève une erreur. Attention : on passe **une fonction** : `expect(() => repartirEnPoules([], 2)).toThrow("Il faut au moins")`.

**Le motif AAA : Arrange, Act, Assert.** Chaque test suit trois temps, souvent séparés par une ligne vide :

```ts
it("battre bien plus fort que soi rapporte beaucoup", () => {
  // Arrange : préparer
  const noteA = 1000, noteB = 1400;
  // Act : agir
  const r = notesApresDuel(noteA, noteB, "A", 20, 20);
  // Assert : vérifier
  expect(r.noteA).toBe(1018);
  expect(r.noteB).toBe(1382);
});
```

Un test qui n'a pas cette forme est souvent un test qui teste trop de choses. **Un `it` = un comportement.** Si tu écris « et » dans le nom, coupe en deux.

**Lire un échec.** Vitest affiche :

```
FAIL lib/elo.test.ts > notesApresDuel > à notes égales, le vainqueur prend exactement K/2
AssertionError: expected 1011 to be 1010
  - Expected  1010
  + Received  1011
```

Fichier, groupe, cas, valeur attendue, valeur reçue. Tout ce qu'il faut pour comprendre sans ouvrir le code. C'est pour ça que les noms de `describe`/`it` comptent.

**Les commandes.** `npx vitest run` : tout, une fois. `npx vitest` (sans `run`) : mode *watch*, relance à chaque sauvegarde — c'est comme ça qu'on développe. `npx vitest run lib/elo` : un fichier. `npx vitest run -t "50/50"` : les cas dont le nom contient ce texte.

**Où Vitest ne va pas.** Il teste du TypeScript/JavaScript pur. Pour un composant React, il faut ajouter `@testing-library/react` et un environnement DOM (`jsdom`) — hors programme ici, parce que tes composants sont fins et ta logique est dans `lib/`. C'est un choix d'architecture qui rend les tests unitaires suffisants.

## À retenir

- `describe` groupe, `it` décrit un comportement, `expect().matcher()` vérifie.
- Le nom d'un `it` est une phrase : « ce que ça fait quand ». Tu la liras à l'échec.
- `toBe` strict, `toEqual` structurel, `toBeCloseTo` pour les flottants, `toThrow` avec une fonction.
- AAA : préparer, agir, vérifier. Un `it` = un comportement.
- `vitest` en watch pour développer, `vitest run` pour vérifier.

## Mise en pratique

Objectif : écrire ton premier fichier de test sur du code existant qui n'en a pas.

1. `cd "C:\Users\Velito Adventure\Documents\Velito-site\apps\cours"`. Vérifie que Vitest est disponible : `npx vitest --version`. Sinon, `npm i -D vitest` **à la racine du monorepo**, et ajoute `"test": "vitest run"` dans `apps/cours/package.json`.
2. Ouvre `lib/progression.ts`. Il y a des fonctions pures dedans (calcul d'XP, série…). Choisis-en une qui ne touche pas `localStorage` — ou extrais le calcul pur dans une fonction exportée si tout est mélangé (c'est la leçon 3, mais fais-le en petit maintenant).
3. Crée `lib/progression.test.ts`. Un `describe` sur la fonction, trois `it` : le cas normal, un cas limite (zéro, vide), un cas qui doit lever ou renvoyer une valeur par défaut. AAA dans chaque.
4. `npx vitest` (watch). Tout est vert ? Casse volontairement une assertion (`toBe(21)` au lieu de `toBe(20)`) : lis l'échec en entier. Répare.
5. Ajoute un test qui **doit** échouer parce qu'il révèle un vrai comportement discutable (par exemple : que se passe-t-il avec un XP négatif ?). Si le code fait quelque chose de bizarre, tu viens de trouver un bug avec un test. Décide : corriger le code ou documenter le comportement dans le test.
6. `npx vitest run` : tout vert. Commit `test(cours): premiers tests sur progression`.

Résultat attendu : un fichier de test à toi, vert, qui protège un vrai calcul de ton site — et tu as lu un échec de bout en bout.
