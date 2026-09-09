---
titre: "Pourquoi tester, et les trois étages de la pyramide"
parcours: "tests"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-09-09
---

## Le cours

Un test automatisé, c'est du code qui vérifie que ton code fait ce qu'il doit. Tu en as déjà 26 fichiers (11 sur ARENA, 15 sur Compta, une dizaine sur Venaball). Mais la question que le jury pose n'est pas « avez-vous des tests ? » — c'est « **que prouvent-ils ?** ». Cette leçon te donne le vocabulaire pour y répondre.

**Pourquoi tester, en trois raisons concrètes.**

1. **Pour vérifier aujourd'hui.** Ton calcul ELO donne-t-il 1010 et 990 après un match à notes égales avec K=20 ? Tu peux le vérifier à la main une fois. Le test le vérifie à chaque fois, en une milliseconde.
2. **Pour protéger demain.** Dans six mois, tu modifies `facteurK`. Le test `notesApresDuel` casse : tu as changé un comportement sans le vouloir. Sans test, tu l'aurais découvert quand un orga se serait plaint d'un classement bizarre. C'est la **non-régression** : un test est un garde-fou contre ton futur toi.
3. **Pour documenter.** `it("400 points d'écart = 10 fois plus de chances")` dit ce que fait la fonction plus clairement qu'un commentaire, et contrairement au commentaire, il ne peut pas devenir faux sans qu'on le sache. Le fichier `UserTest.php` de Venaball commence par expliquer la règle métier qu'il protège (« Employé et Bénévole sont mutuellement exclusifs, demande Willy ») : le test est la spécification.

**La pyramide : trois étages, trois coûts.**

```
        /  E2E  \          peu, lents, fragiles : un vrai navigateur qui clique
       / intégr. \         quelques-uns : plusieurs briques ensemble (base, HTTP)
      /  unitaires \       beaucoup, rapides, isolés : une fonction, un résultat
```

- **Unitaire** : une fonction, des entrées, une sortie attendue. Pas de base, pas de réseau, pas de fichier. `elo.test.ts` : `expect(probabiliteVictoire(1000, 1000)).toBeCloseTo(0.5)`. Des centaines peuvent tourner en une seconde. C'est la base de la pyramide : on en écrit **beaucoup**.
- **Intégration** (ou *fonctionnel* en vocabulaire Symfony) : plusieurs briques branchées ensemble. `PirbSeancesIdorTest.php` monte le noyau Symfony, crée des données en base de test, envoie une requête HTTP, vérifie la réponse. Plus lent (secondes), plus riche : il prouve que le contrôleur, le Voter, Doctrine et la base coopèrent. On en écrit **quelques-uns**, sur les chemins critiques.
- **End-to-end (E2E)** : un vrai navigateur (Playwright, Cypress) qui ouvre la page, clique, tape, vérifie l'écran. Le plus proche de l'utilisateur, le plus lent (minutes), le plus fragile (un `id` de bouton renommé casse tout). On en écrit **peu**, sur les parcours vitaux : « je peux me connecter et créer un tournoi ».

Ton écosystème a les deux premiers étages, pas le troisième. C'est normal à ce stade, et c'est une réponse honnête au jury : « E2E : pas encore, parce que le rapport coût/valeur n'y est pas pour un projet à un développeur ; mes tests fonctionnels couvrent les chemins critiques HTTP ».

**Ce qu'un test n'est pas.** Il ne prouve pas l'absence de bugs — il prouve que les cas qu'il vérifie fonctionnent. Un test qui passe toujours (parce qu'il ne vérifie rien, ou vérifie une trivialité) est pire que pas de test : il donne une fausse confiance. `expect(true).toBe(true)` est vert et ne protège de rien.

**La couverture.** Le pourcentage de lignes exécutées par les tests. Utile pour trouver ce qui n'est **pas** testé du tout ; trompeur comme objectif — 100 % de lignes couvertes par des tests qui ne vérifient rien vaut zéro. Vise des tests qui **vérifient un comportement**, et regarde la couverture pour repérer les trous.

**Le vocabulaire à maîtriser pour le jury.** *Assertion* (une vérification : `expect(x).toBe(y)`), *cas de test* (un `it`/`test`), *suite* (un `describe`, un fichier), *fixture* (les données préparées avant un test), *mock* (une fausse dépendance qu'on contrôle), *non-régression* (le test protège un comportement existant), *TDD* (écrire le test avant le code — leçon 8).

## À retenir

- Un test vérifie aujourd'hui, protège demain, documente toujours.
- Unitaire (beaucoup, ms, isolé) → intégration (quelques-uns, s, branché) → E2E (peu, min, fragile).
- Tu as les deux premiers étages. Sache dire pourquoi pas le troisième.
- Un test qui ne peut pas échouer ne protège de rien. La couverture repère les trous, ce n'est pas un objectif.
- Assertion, fixture, mock, non-régression : les mots du jury.

## Mise en pratique

Objectif : inventorier tes tests existants et les classer dans la pyramide.

1. `cd "C:\Users\Velito Adventure\Documents\Velito-site\apps\arena"` puis `npx vitest run`. Lis la sortie : nombre de fichiers, de tests, durée totale. Note la durée (quelques centaines de ms pour tout).
2. Ouvre `lib/elo.test.ts`. Compte les `describe` et les `it`. Pour trois `it` au hasard, écris en une phrase ce que chacun **prouve**. Est-ce un test unitaire ? (Indice : importe-t-il autre chose que `./elo` et `vitest` ?)
3. `cd "C:\Users\Velito Adventure\Documents\mabb-site"` puis `php bin/phpunit`. Note le nombre de tests et la durée. Compare avec ARENA : pourquoi c'est plus long ? (Ouvre `tests/Functional/Pirb/PirbSeancesIdorTest.php` : il monte Symfony et parle à une base.)
4. Classe chaque fichier de `tests/` de Venaball : `Unit/` → unitaire, `Functional/` → intégration. Pour chaque test fonctionnel, note quelle **règle de sécurité** il protège.
5. Trouve un test faible : y a-t-il, dans l'un ou l'autre projet, un test qui ne pourrait jamais échouer ? (Cherche des assertions triviales ou absentes.) Si oui, note-le pour la leçon 4.
6. Écris pour le jury, en 6 lignes : « Ma stratégie de tests » — combien d'unitaires, combien de fonctionnels, ce qu'ils protègent, pourquoi pas d'E2E.

Résultat attendu : tu sais lancer tes deux suites, tu as classé chaque test dans la pyramide, et tu peux présenter ta stratégie en une minute.
