---
titre: "Le contrôleur : le meneur de jeu"
parcours: "dojo-debutant"
ordre: 2
niveau: "debutant"
duree: 10
date: 2026-11-13
---

## Le cours

Samedi, match des U18. La meneuse remonte le ballon. Elle ne tire presque jamais : elle regarde, elle décide, elle donne la balle à la bonne coéquipière.

```jeu
{ "type": "devine", "question": "Quand tu ouvres la page d'une séance, est-ce qu'un seul bout de code fait tout : vérifier qui tu es, chercher la séance, dessiner la page ?", "indice": "Pense à la meneuse : est-ce qu'elle marque tous les paniers ?", "reponse": "Non. Un bout de code reçoit ta demande et distribue le travail aux autres. On l'appelle le contrôleur. Il marque rarement lui-même : il fait jouer l'équipe." }
```

### Il reçoit la balle

Dans la leçon 1, la route était le panneau sur la porte. Derrière la porte, il y a un **contrôleur** : un fichier PHP qui reçoit ta demande et décide quoi en faire. Chaque action qu'il sait faire est une **méthode**, c'est-à-dire un petit bloc de code qui porte un nom. Ici, `show` (« montrer »).

Voici le début de `show`, dans `src/Controller/Manager/SeanceController.php` :

```php
public function show(Seance $seance, FeedbackSeanceRepository $feedbackRepo): Response
{
    $this->denyAccessUnlessGranted(ClubVoter::CLUB_MEMBER, $seance);
```

Première ligne : Symfony a déjà trouvé la séance 42 et la tend au contrôleur. Troisième ligne : **le contrôle à l'entrée**. Elle dit « refuse l'accès, sauf si cette personne est membre du club de cette séance ». La leçon 9 l'ouvrira en détail.

```jeu
{ "type": "choix", "question": "Une personne d'un autre club tape l'adresse /seances/42. Que fait la ligne denyAccessUnlessGranted ?", "choix": ["Elle affiche la page quand même", "Elle arrête tout avant la suite du code", "Elle supprime la séance"], "bonne": 1, "explication": "Le contrôle est à l'entrée : si la réponse est non, les lignes suivantes ne s'exécutent jamais." }
```

### Il distribue

Le contrôleur ne fouille pas la base lui-même. Il ne dessine pas la page non plus. Il passe la balle :

```php
$retours = $this->isGranted(ClubVoter::CLUB_STAFF, $seance)
    ? $feedbackRepo->synthesePourSeance($seance)
    : null;

return $this->render('manager/seance/show.html.twig', [
    'seance'  => $seance,
    'retours' => $retours,
]);
```

`$feedbackRepo` est un **repository** : le fichier qui sait chercher dans la base. Le `?` et le `:` veulent dire « si c'est le staff, va chercher les retours des joueuses, sinon rien ». Puis `render` donne tout au **template**, le modèle qui fabrique la page. Et `return` renvoie la réponse vers ton écran.

```jeu
{ "type": "paires", "consigne": "Relie chaque joueur de l'équipe à son rôle.", "paires": [["Contrôleur", "Reçoit la demande et distribue"], ["Repository", "Va chercher dans la base"], ["Template", "Fabrique la page à afficher"], ["Response", "Ce qui repart vers ton écran"]] }
```

```jeu
{ "type": "ordre", "consigne": "Remets le trajet de la demande dans l'ordre.", "etapes": ["Tu ouvres /seances/42", "Symfony trouve la route et la séance 42", "Le contrôleur vérifie que tu es membre du club", "Il demande les retours au repository si tu es du staff", "Il donne la séance au template", "La page repart vers ton écran"], "explication": "Recevoir, vérifier, faire travailler les autres, répondre. Presque tous les contrôleurs suivent ce rythme." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Dans show, tous les membres du club voient les retours des joueuses.", "vrai": false, "explication": "Seul le staff les reçoit (CLUB_STAFF). Pour un simple membre, la variable retours vaut null, c'est-à-dire rien." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Un bon contrôleur est court.", "vrai": true, "explication": "La méthode show tient en une douzaine de lignes. Le gros du travail est ailleurs : repository, template. Comme une meneuse qui garde la balle trop longtemps, un contrôleur qui fait tout devient illisible." }
```

## À retenir

- Le **contrôleur** reçoit la demande, vérifie, fait travailler les autres, répond.
- Une **méthode** est une action du contrôleur, avec un nom (`show`, `edit`...).
- `denyAccessUnlessGranted` est le contrôle à l'entrée : pas le droit, pas de suite.
- Le **repository** cherche dans la base, le **template** fabrique la page.
- `return` renvoie la réponse : sans lui, rien n'arrive à l'écran.

## Mise en pratique

Ouvre `src/Controller/Manager/SeanceController.php` et va à la méthode `delete` (tu lis, tu ne modifies rien). Sur une feuille, écris quatre mots en colonne : recevoir, vérifier, faire travailler, répondre. En face de chacun, recopie la ligne de `delete` qui correspond.

C'est réussi quand tu as une ligne de code en face de chaque mot et que tu peux expliquer à voix haute pourquoi la ligne `denyAccessUnlessGranted` est placée tout en haut.
