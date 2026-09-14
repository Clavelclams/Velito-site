---
titre: "TDD : écrire le test d'abord, et pourquoi ça change ce que tu codes"
parcours: "tests"
ordre: 8
niveau: "expert"
duree: 25
date: 2026-09-09
---

## Le cours

Jusqu'ici tu as écrit des tests **après** le code, pour le protéger. Le *Test-Driven Development* inverse l'ordre : le test **avant**, comme une spécification exécutable. Ce n'est pas une religion ; c'est une technique avec des cas où elle brille et des cas où elle gêne.

**Le cycle : rouge, vert, refactor.**

1. **Rouge** — écris un test pour un comportement qui n'existe pas encore. Lance-le : il échoue (la fonction n'existe pas, ou rend faux). C'est le moment où tu décides **ce que** tu veux, avant de penser à **comment**.
2. **Vert** — écris le code **minimal** qui fait passer le test. Pas plus. Si le test dit « à notes égales, K=20, le vainqueur gagne 10 », le code le plus simple qui passe est peut-être `return { noteA: noteA + 10, noteB: noteB - 10 }`. Oui, c'est faux en général. C'est le but : le prochain test le forcera à devenir juste.
3. **Refactor** — maintenant que c'est vert, améliore le code (nomme, extrais, simplifie) **sans changer le comportement**. Les tests te disent si tu as cassé quelque chose.

Puis un nouveau test, un nouveau cycle. Chaque tour dure quelques minutes.

**Ce que ça change, concrètement.**

- **Tu conçois l'interface avant l'implémentation.** Pour écrire `expect(notesApresDuel(1000, 1000, "A", 20, 20).noteA).toBe(1010)`, tu as dû décider : le nom, les arguments, leur ordre, le type de retour. Tu l'as fait en tant qu'**utilisateur** de la fonction, pas en tant qu'auteur. Les interfaces conçues comme ça sont plus simples — parce que tu as ressenti la douleur de les appeler avant de les écrire.
- **Le code est testable par construction.** Impossible d'écrire un test avant du code qui touche la base sans injection : le test te force à extraire, à injecter, à découper. La leçon 3 devient automatique.
- **Tu ne codes que ce qui est demandé.** Pas de « et si un jour on a besoin de… » : s'il n'y a pas de test, il n'y a pas de code. Le YAGNI (*You Aren't Gonna Need It*) devient mécanique.
- **Tu as toujours un point de retour.** Tout vert il y a trois minutes. Si tu t'embourbes, `git checkout .` et tu repars du dernier vert.

**Où le TDD brille.** Les algorithmes et les règles métier : bracket, ELO, poules, classement, calcul de série, règles de convocation. Tout ce qui a des entrées et sorties claires et des cas limites nombreux. Les modules purs d'ARENA auraient pu être écrits en TDD — et le double-bye à 5 joueurs aurait été un test rouge avant d'être un bug.

**Où il gêne.** L'exploration (« je ne sais pas encore ce que je veux ») : écris du code jetable, comprends, jette, **puis** TDD. L'interface (un composant React, une page Twig) : le test visuel coûte plus qu'il ne rapporte, on vérifie à l'œil. Le code de plomberie (une action qui lit et écrit) : pas de logique à spécifier. Et le prototype d'une soirée : le TDD ralentit le premier jet, et c'est un investissement qui ne se justifie que si le code doit vivre.

**Le test comme spécification.** Un fichier de test bien nommé se lit comme un cahier des charges :

```
elo
  probabiliteVictoire
    ✓ à notes égales, c'est 50/50
    ✓ 400 points d'écart = 10 fois plus de chances
    ✓ les deux probabilités sont complémentaires
  facteurK
    ✓ K élevé pendant la période de placement, réduit ensuite
  notesApresDuel
    ✓ à notes égales, le vainqueur prend exactement K/2
    ✓ battre bien plus fort que soi rapporte beaucoup
```

C'est `vitest run --reporter=verbose` (ou `--testdox` en PHPUnit) sur ton propre code. Montré à un jury, ça dit : « voici ce que mon système garantit », dans un langage que le jury comprend sans lire une ligne de TypeScript. **Un test est la seule documentation qui ne peut pas mentir** — si elle ment, elle est rouge.

**Comment le présenter au jury.** Pas « j'ai fait du TDD » (invérifiable, et souvent faux). Plutôt : « mes modules métier sont des fonctions pures, testées, avec les cas limites ; voici la sortie de la suite ; voici un bug de production qui a produit un test de non-régression ; voici ce que je ne teste pas et pourquoi ». Ça, c'est vérifiable dans ton dépôt, et c'est ce qui compte.

## À retenir

- Rouge → vert (code minimal) → refactor. Cycles de quelques minutes.
- Le test avant force : interface pensée par l'utilisateur, code testable, pas de superflu.
- Brille sur les algorithmes et règles métier. Gêne sur l'exploration, l'UI, la plomberie.
- Un fichier de test bien nommé est une spécification lisible. `--reporter=verbose`.
- Au jury : montre la suite, un bug devenu test, et tes non-tests assumés.

## Mise en pratique

Objectif : écrire une vraie fonctionnalité d'ARENA en TDD strict, du premier test rouge au refactor.

1. La fonctionnalité : `attribuerBadges(joueur, tournoisTermines): string[]` — rend les codes de badges qu'un joueur mérite (`PREMIER_TOURNOI` s'il a fini au moins un tournoi, `CHAMPION` s'il en a gagné un, `FIDELE` s'il en a fini cinq). C'est le Lot 4 d'ARENA, posé en schéma, jamais implémenté.
2. Crée `apps/arena/lib/arena/badges.test.ts`. **Premier test** : joueur sans tournoi → `[]`. Lance : rouge (la fonction n'existe pas). Crée `badges.ts` avec `export function attribuerBadges() { return []; }`. Vert.
3. **Deuxième test** : un tournoi fini → `["PREMIER_TOURNOI"]`. Rouge. Code minimal : `return tournois.length > 0 ? ["PREMIER_TOURNOI"] : []`. Vert.
4. **Troisième** : un tournoi gagné → contient `"CHAMPION"`. Rouge. Étends. Vert. **Quatrième** : cinq finis → contient `"FIDELE"`. **Cinquième** : cinq finis dont un gagné → les trois. **Sixième** (bord) : quatre finis → pas `FIDELE`.
5. Refactor : le code a grossi en `if` empilés. Réécris-le proprement (une liste de règles `{ code, condition }` filtrée) **sans toucher aux tests**. Relance : toujours vert. C'est le refactor sous filet.
6. `npx vitest run lib/arena/badges --reporter=verbose` : lis la spécification que tu viens d'écrire. Commit `feat(arena): attribution des badges (TDD)`.
7. Bonus : l'action qui appelle `attribuerBadges` et écrit dans `badges_joueurs` est de la plomberie — écris-la sans test, mais avec `requireStaff` et `service_role`. Note en commentaire pourquoi elle n'est pas testée unitairement.

Résultat attendu : une fonctionnalité réelle de ton projet, née de six tests rouges, refactorée sous filet, et une spécification lisible à montrer.
