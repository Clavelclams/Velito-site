---
titre: "Ce qu'on ne teste pas, et pourquoi c'est une décision"
parcours: "tests"
ordre: 7
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Un bon ingénieur sait ce qu'il teste. Un très bon sait ce qu'il **ne teste pas**, et pourquoi. Trois catégories reviennent toujours, et ton code a une position sur chacune.

**1. Le réseau.** `toornament.ts` est coupé en deux : le parsing d'URL et la mise en forme (purs, testés), les appels HTTP (async, **non testés unitairement**). Le commentaire le dit : « on ne teste pas le réseau, on teste ce qu'on fait des réponses ».

Pourquoi ne pas appeler la vraie API dans un test ? Parce que le test serait **lent** (des centaines de ms par appel), **instable** (leur API a un hoquet → ton test échoue sans que ton code ait changé), **dépendant** (pas de réseau dans la CI → tout est rouge), et **irréaliste** (tu ne peux pas provoquer un 500 ou un timeout à la demande). Un test qui échoue pour une raison extérieure au code finit par être ignoré, et un test ignoré est pire que pas de test.

Ce qu'on fait à la place : on teste la fonction qui **transforme** une réponse (donnée en dur dans le test) en ce que l'app utilise. On teste les cas d'erreur en lui passant une réponse d'erreur fabriquée. Le réseau lui-même est vérifié à la main, ou par un test de contrat séparé (leçon suivante).

**2. L'aléatoire.** `melangerJoueurs` avec `Math.random` : impossible de prédire la sortie. Deux réponses, vues en leçons 3 et 4 : **injecter** le générateur pour un test déterministe, et **tester des propriétés** (longueur, éléments, entrée intacte) qui tiennent quel que soit le tirage. Ce qu'on ne teste **pas** : la qualité statistique de `Math.random`. Ce n'est pas ton code, et un test statistique (« sur 10 000 tirages, chaque permutation sort à peu près autant ») serait instable par nature — parfois il échoue par malchance. Si tu avais besoin d'un tirage inattaquable, tu changerais de générateur, pas de test.

**3. Le temps.** `Date.now()` dans une fonction la rend non testable — le bug du J−230 en est la preuve. La réponse est d'**injecter** la date (`aujourdhui: Date = new Date()`), ou de la **figer** avec `vi.useFakeTimers()` et `vi.setSystemTime(new Date("2027-03-31"))` en Vitest. Ce qu'on ne teste pas : que `new Date()` renvoie l'heure juste. Ce qu'on teste : que « la veille du jury, `joursAvantJury` vaut 1 ».

**Ce qu'on ne teste pas non plus, et qu'il faut savoir dire.**

- **Le framework.** Que Next route bien `/fiches/[slug]`, que Doctrine génère le bon SQL, que Symfony applique le firewall. Ce sont leurs tests, pas les tiens. Tu testes **ta** logique qui s'appuie dessus.
- **Les getters/setters triviaux.** `getNom()` qui retourne `$this->nom`. Zéro logique, zéro test. `setRolesMembre()` avec sa règle d'exclusion, oui.
- **L'interface visuelle.** Que le bouton est bleu, que la carte a un coin arrondi. Ça se voit, ça ne se teste pas — ou alors en E2E avec des captures, et le rapport coût/valeur n'y est pas pour toi.
- **La performance**, sauf besoin identifié. « `genererCalendrierPoule` avec 1 000 joueurs finit en moins d'une seconde » est un test légitime si un jour quelqu'un a un tournoi de 1 000 joueurs. Pas avant.

**Le test de contrat : la réponse pour les API externes.** Entre « ne pas tester le réseau » et « découvrir que Toornament a changé son format quand un import rate », il y a le **test de contrat** : un test qui appelle vraiment l'API, mais **hors de la suite normale** — dans un job planifié, une fois par jour, qui t'alerte si le format a bougé. Il ne casse pas ta CI, il te prévient. Ce n'est pas fait sur ARENA ; c'est le manque documenté dans la fiche Toornament.

**Le principe qui résume tout.** Chaque test coûte : à écrire, à maintenir, à exécuter. Il doit rapporter plus qu'il ne coûte — en bugs évités, en confiance, en documentation. Un test lent, instable ou qui ne vérifie rien coûte sans rapporter. **Ne pas tester quelque chose est une décision, et elle doit pouvoir être expliquée en une phrase.** « Je ne teste pas le réseau parce que je teste ce que je fais des réponses » est une phrase de jury.

## À retenir

- Réseau : on teste la transformation des réponses, pas l'appel. Lent, instable, dépendant.
- Aléatoire : injecter le générateur ; tester des propriétés. Pas la statistique.
- Temps : injecter ou figer (`vi.useFakeTimers`). Pas l'horloge.
- Pas de test sur le framework, les getters triviaux, le visuel, la perf sans besoin.
- Test de contrat hors CI pour les API externes. Non fait, à dire.
- Ne pas tester est une décision qui s'explique en une phrase.

## Mise en pratique

Objectif : figer le temps dans un test, tester une transformation de réponse réseau, et écrire tes « non-tests » assumés.

1. Dans `apps/cours/lib/`, reprends `CompteARebours` : extrais `joursAvantJury(aujourdhui: Date = new Date())`. Test avec injection : `joursAvantJury(new Date(2027, 2, 31))` → 1, `(2027, 3, 1)` → 0, `(2027, 3, 2)` → 0 (jamais négatif).
2. Même test avec les faux timers : `vi.useFakeTimers(); vi.setSystemTime(new Date(2027, 2, 31)); expect(joursAvantJury()).toBe(1); vi.useRealTimers();`. Deux techniques, même garantie.
3. Ouvre `apps/arena/lib/toornament.ts`. Trouve la fonction qui transforme une réponse de l'API (un objet JSON) en résultat ARENA. Dans `toornament.test.ts`, ajoute un test qui lui passe un objet **fabriqué** représentant une réponse normale, et un autre avec un objet incomplet (champ manquant) — vérifie qu'elle rend `null` ou lève proprement, sans `TypeError`.
4. Vérifie qu'aucun test ARENA ne fait de vrai `fetch` : `findstr /s "fetch(" apps\arena\lib\*.test.ts` → rien. Si tu trouves quelque chose, c'est un test réseau à convertir.
5. Écris dans `apps/arena/lib/TESTS.md` une section « Ce qu'on ne teste pas et pourquoi » : réseau, aléatoire statistique, framework, visuel. Une phrase par item. C'est ta réponse de jury, écrite.
6. Bonus : esquisse un test de contrat Toornament dans `scripts/contrat-toornament.ts` — un vrai `fetch` sur un tournoi public connu, vérification des champs attendus, `console.error` si absent. Ne l'ajoute pas à `vitest`. Note en commentaire comment il serait lancé (cron GitHub Actions hebdomadaire).

Résultat attendu : tu sais figer le temps, tester une transformation sans réseau, et tu as écrit noir sur blanc ce que tu ne testes pas.
