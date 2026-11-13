---
titre: "L'API : le serveur parle aux apps"
parcours: "dojo-debutant"
ordre: 10
niveau: "intermediaire"
duree: 13
date: 2026-11-13
---

## Le cours

Dans l'app Venaball Club, une séance apparaît barrée, avec « Annulée : Gymnase fermé ».

```jeu
{ "type": "devine", "question": "Qui a choisi les mots « Gymnase fermé » : l'app ou le serveur ?", "indice": "La table de marque note les points. Le tableau d'affichage ne fait que les montrer.", "reponse": "Le serveur. Il envoie le motif. L'app décide seulement comment le montrer : texte barré, carte grisée." }
```

### Des données, pas une page

Un site renvoie une page toute prête. Une **API** renvoie seulement des **données** : à l'app de les afficher.

Ces données voyagent en **JSON**, un texte tout simple fait de noms de champs et de valeurs. La table de marque envoie les chiffres, le tableau d'affichage les met en lumière.

Côté serveur, dans `ApiClubSeanceController::seances` (`mabb-site`) :

```php
'appelFait'   => $appelFait,
'nbPresentes' => $nbPresentes,
'nbPointees'  => $nbPointees,
// [13/11/2026] Motif si la séance est annulée (férié, vacances…), sinon null.
'annulee'     => $s->getMotifAnnulation(),
```

```jeu
{ "type": "choix", "question": "Une séance a bien lieu. Que vaut le champ annulee dans la réponse ?", "choix": ["false", "null", "Le mot non", "Le champ disparaît"], "bonne": 1, "explication": "null veut dire « rien ». Le champ porte le motif quand la séance est annulée, et rien du tout sinon." }
```

### Le contrat : les mêmes noms des deux côtés

Le serveur écrit `annulee`. L'app doit lire `annulee`, à la lettre près. Cet accord s'appelle le **contrat**.

Côté app, dans `venaball club-store/src/services/api.ts` :

```ts
/** [13/11/2026] Le motif si la séance est annulée, sinon null. Absent sur un serveur pas à jour. */
annulee?: string | null;
```

Le `?` dit : « ce champ peut manquer ». Et dans `app/seances.tsx` :

```tsx
const annulee = s.annulee ?? null;
```

S'il manque, l'app fait comme s'il valait `null`.

```jeu
{ "type": "trous", "consigne": "Le serveur envoie le champ annulee. Complète la ligne de l'app.", "code": "const annulee = s.___ ?? null;", "choix": ["annule", "annulee", "motif", "cancelled"], "bonne": 1, "explication": "Une lettre de différence et l'app ne trouve rien. Le nom du champ fait partie du contrat." }
```

### On ajoute, on ne retire pas

Des coachs gardent une ancienne version de l'app sur leur téléphone. Un champ en plus, elle l'ignore. Un champ retiré ou renommé, elle casse.

```jeu
{ "type": "vraifaux", "affirmation": "Pour faire plus propre, on peut renommer le champ lieu en gymnase côté serveur du jour au lendemain.", "vrai": false, "explication": "Toutes les apps déjà installées lisent lieu. Elles n'afficheraient plus rien. On ajoute un nouveau champ, on garde l'ancien." }
```

### Le serveur d'abord, l'app ensuite

```jeu
{ "type": "ordre", "consigne": "Remets la sortie des séances annulées dans le bon ordre.", "etapes": ["On ajoute le champ annulee côté serveur", "On déploie le serveur", "Les anciennes apps continuent de marcher sans rien voir de neuf", "On publie la nouvelle version de l'app", "La nouvelle app affiche les séances barrées"], "explication": "À l'envers, la nouvelle app demanderait au serveur une annulation qu'il ne connaît pas encore." }
```

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à son sens.", "paires": [["API", "Une adresse qui renvoie des données"], ["JSON", "Un texte fait de champs et de valeurs"], ["Contrat", "L'accord sur les noms des champs"], ["null", "Rien, pas de valeur"]] }
```

## À retenir

- Une **API** renvoie des données (JSON), pas une page.
- Le serveur décide du contenu, l'app décide de l'affichage.
- Le **contrat**, c'est l'accord sur le nom et le type de chaque champ.
- On **ajoute** des champs, on n'en retire pas : les anciennes apps doivent continuer de marcher.
- On déploie le **serveur avant l'app**.

## Mise en pratique

Ouvre côte à côte :

- `mabb-site/src/Controller/Api/Club/ApiClubSeanceController.php`, méthode `seances`, le tableau `$lignes[]` ;
- `venaball club-store/src/services/api.ts`, l'interface `SeanceApi`.

Coche chaque champ un par un : `id`, `date`, `equipe`, `type`, `intitule`, `lieu`, `dureeMinutes`, `appelFait`, `nbPresentes`, `nbPointees`, `annulee`.

C'est réussi quand tu as retrouvé les onze noms des deux côtés, écrits pareil, et que tu sais dire lequel est le seul marqué d'un `?` et pourquoi.
