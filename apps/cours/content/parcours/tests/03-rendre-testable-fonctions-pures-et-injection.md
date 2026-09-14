---
titre: "Rendre testable : fonctions pures et injection de dépendances"
parcours: "tests"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

« Je ne peux pas tester ça, ça touche la base. » C'est la phrase qui tue les tests. Elle est vraie — et elle dit que le **code** est mal découpé, pas que le test est impossible. ARENA a 11 fichiers de tests qui tournent sans base parce que son code a été **conçu** pour ça. Voici comment.

**Une fonction pure : mêmes entrées, même sortie, rien d'autre.** Elle ne lit pas de fichier, n'interroge pas de base, n'appelle pas le réseau, ne regarde pas l'heure, ne tire pas au hasard. `genererCalendrierPoule(["a","b","c"], 1)` rend toujours le même tableau. On la teste en lui passant des valeurs et en vérifiant le retour. C'est tout.

Ce qui est pur dans ARENA : `bracket.ts`, `bracket-double.ts`, `elo.ts`, `poules.ts`, `classement.ts`, `csv.ts`, `transitions.ts`, la moitié « parsing » de `toornament.ts`. Ce qui ne l'est pas : `actions.ts` (Supabase), `lib/supabase/*`, la moitié « appels réseau » de `toornament.ts`. La frontière est nette, et **elle a été tracée avant d'écrire les tests**.

**La règle de conception : la logique métier ne touche jamais l'I/O.** Une action ARENA fait trois choses : lire en base, appeler une fonction pure, écrire en base. La fonction pure contient toute l'intelligence (comment apparier, comment classer). L'action est un plombier. On teste l'intelligence sans le plombier.

Le contre-exemple, dans ton propre code : `PassageSaisonCommand` sur Venaball mélange lecture Doctrine, règles de reconduction et écriture, dans une commande de 500 lignes. Le bug du 19 août (doublon d'affectation) y a été trouvé **en production**, pas par un test, parce que la règle n'était pas isolable. Extraire « étant donné ces affectations et ces règles, quelles sont les nouvelles affectations ? » en une fonction pure aurait permis de tester le cas « deux chemins vers la même équipe » en dix lignes.

**L'injection de dépendances : rendre pur ce qui ne l'est pas.** Certaines fonctions ont *besoin* de quelque chose d'impur : l'aléatoire, l'heure. On ne les rend pas pures en les privant de ça — on **passe la dépendance en paramètre**, avec une valeur par défaut pour la production :

```ts
export function melangerJoueurs<T>(joueurs: readonly T[], rng: () => number = Math.random): T[]
```

En prod : `melangerJoueurs(liste)` → `Math.random`. En test : `melangerJoueurs(liste, () => 0.5)` → un tirage déterministe, résultat prévisible, assertion exacte possible. La fonction est **pure par rapport à ses arguments** — c'est la seule pureté qui compte pour tester.

Même motif pour l'heure : une fonction qui reçoit `maintenant: Date = new Date()` se teste avec une date fixe. Pour un identifiant : `genId: () => string = crypto.randomUUID`. Le principe est général : **tout ce qui est non déterministe devient un paramètre.**

**Le mock : la version lourde de la même idée.** Quand la dépendance est un objet complexe (un client Supabase, un `EntityManager`), on peut la remplacer par une fausse version qui répond ce qu'on veut : `vi.fn()` en Vitest, `$this->createMock(…)` en PHPUnit. C'est utile, et c'est un piège : un test qui mocke trois services pour vérifier une ligne de logique est un signe que la logique aurait dû être extraite. **Préfère extraire à mocker.** Le mock est le plan B.

**En PHP, même chose.** `UserTest.php` teste `setRolesMembre()` sur un `new User()` — aucun Doctrine, aucun noyau. C'est possible parce que la règle « employé et bénévole sont exclusifs » est dans l'entité, pas dans un contrôleur. `ConvocationManager` (extrait du contrôleur le 4 août) suit la même logique : les règles dans un service, les contrôleurs traduisent. Il dépend encore de Doctrine — donc c'est un test fonctionnel qui le couvre, pas un unitaire — mais il est déjà bien plus testable qu'avant, et une interface de repository suffirait pour finir le travail.

**Comment reconnaître du code non testable.** Une fonction qui : importe un client de base, appelle `fetch`, lit `process.env`, utilise `Date.now()` ou `Math.random()` sans paramètre, écrit dans un fichier, ou fait plus de 50 lignes. Chacun de ces signes dit « extrais la logique ».

## À retenir

- Pure = mêmes entrées, même sortie, aucun effet. Se teste par simple appel.
- La logique métier ne touche jamais l'I/O. Les actions sont des plombiers.
- Aléatoire, heure, identifiants → paramètres avec défaut de prod. Pure par rapport à ses arguments.
- Mock = plan B. Si tu mockes beaucoup, extrais plutôt.
- Signes de non-testabilité : base, fetch, env, Date.now, Math.random, 50+ lignes.

## Mise en pratique

Objectif : extraire une règle métier d'un code impur, et la tester.

1. Ouvre `apps/cours/lib/progression.ts`. Identifie la fonction qui calcule la **série** (streak) : elle lit probablement la date d'aujourd'hui et la dernière date enregistrée.
2. Extrais le calcul dans une fonction pure exportée : `calculerSerie(serieActuelle: number, derniereDate: string | null, aujourdhui: string): number`. Elle reçoit **tout** en paramètres, ne lit rien. La fonction d'origine l'appelle avec `new Date()` formatée.
3. Écris `calculerSerie.test.ts` avec cinq cas : première visite (null → 1), visite le même jour (inchangé), visite le lendemain (+1), visite après deux jours (retour à 1), et un cas limite de ton choix (changement d'année ?). Tous déterministes grâce au paramètre `aujourdhui`.
4. `npx vitest run` : vert. Casse la logique (inverse une condition) : au moins un test rouge. Répare.
5. Ouvre `apps/arena/lib/arena/actions.ts`. Choisis une action, et sépare-la mentalement en : lecture / logique / écriture. La logique est-elle déjà dans un module pur ? Si tu trouves de la logique dans l'action (un calcul, une règle), note-la : c'est un candidat à l'extraction.
6. Sur Venaball : ouvre `src/Command/PassageSaisonCommand.php`. Repère la partie « décider quelle équipe pour quelle joueuse ». Écris, en pseudo-code dans un fichier `notes.md`, la signature d'une fonction pure `decideAffectations(joueuses, equipes, regles): Affectation[]` qui pourrait être extraite — et le test qui aurait attrapé le bug du 19 août.

Résultat attendu : tu as extrait et testé une règle de ton propre code, et tu reconnais à vue la logique qui devrait sortir d'une action ou d'une commande.
