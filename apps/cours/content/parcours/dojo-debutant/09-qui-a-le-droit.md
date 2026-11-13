---
titre: "Qui a le droit ? La licence et la feuille de match"
parcours: "dojo-debutant"
ordre: 9
niveau: "intermediaire"
duree: 13
date: 2026-11-13
---

## Le cours

Un coach d'un autre club a un vrai compte Venaball. Il tape l'adresse d'une séance de ton club.

```jeu
{ "type": "devine", "question": "Il est bien connecté, avec son vrai compte. Doit-il voir la séance de ton club ?", "indice": "Avoir une licence ne donne pas la clé de tous les gymnases.", "reponse": "Non. Être connecté prouve qui il est. Ça ne dit pas ce qu'il a le droit de faire. Ce sont deux questions séparées." }
```

### Deux questions, deux mots

L'**authentification** répond à « qui es-tu ? ». C'est la licence que tu montres à la table de marque.

L'**autorisation** répond à « as-tu le droit ? ». C'est ton nom sur la feuille de CE match. Licenciée, oui. Sur la feuille, pas forcément.

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à sa définition.", "paires": [["Authentification", "Prouver qui tu es"], ["Autorisation", "Vérifier ce que tu as le droit de faire"], ["403", "Interdit : tu n'as pas le droit"], ["404", "Introuvable : rien à cette adresse"]] }
```

### Une ligne en haut de chaque route

Dans `src/Controller/Manager/SeanceController.php`, l'annulation commence par :

```php
$this->denyAccessUnlessGranted(ClubVoter::CLUB_STAFF, $seance);
```

À lire : « refuse, sauf si accordé ». Deux informations : le **niveau** demandé et l'**objet** concerné. Celui qui tranche est un **Voter**, un bout de code qui répond oui ou non.

Les niveaux sont dans `src/Security/Voter/ClubVoter.php` :

```php
self::CLUB_MEMBER        => $this->isMember($user, $club),
self::CLUB_COACH         => $this->hasMetaRole($user, $club, UserClubRole::ROLE_COACH),
self::CLUB_ADMIN         => $this->hasMetaRole($user, $club, UserClubRole::ROLE_DIRIGEANT),
self::CLUB_STAFF         => $this->isStaffOrAbove($user, $club),
```

Membre : tu appartiens au club. Staff : staff, coach ou dirigeant. Admin : dirigeant. Regarde `$club` sur chaque ligne : le Voter prend le club de la séance et cherche ton rôle **dans ce club-là**. C'est l'isolation par club.

```jeu
{ "type": "trous", "consigne": "Complète la ligne qui protège l'annulation d'une séance.", "code": "$this->denyAccessUnlessGranted(ClubVoter::___, $seance);", "choix": ["CLUB_MEMBER", "CLUB_STAFF", "CLUB_ADMIN", "CLUB_JOUEUR"], "bonne": 1, "explication": "Annuler une séance est un geste d'encadrant : staff, coach ou dirigeant. Un simple membre ne passe pas." }
```

```jeu
{ "type": "choix", "question": "Les fermetures (vacances, gymnase fermé) annulent des séances pour tout le club. Quel niveau demande FermetureController ?", "choix": ["CLUB_MEMBER", "CLUB_STAFF", "CLUB_ADMIN"], "bonne": 2, "explication": "Une décision qui touche toutes les équipes est réservée au dirigeant. Les trois routes de FermetureController demandent CLUB_ADMIN." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Un dirigeant du club A peut gérer les fermetures du club B, puisqu'il est dirigeant.", "vrai": false, "explication": "Le Voter compare le club de ton rôle au club de l'objet. Dirigeant chez A ne vaut rien chez B." }
```

### Dans l'API : « introuvable » plutôt que « interdit »

Dans `ApiClubSeanceController::seanceAutorisee` :

```php
if ($seance === null || $seance->getClub()?->getId() !== $club->getId()) {
    throw new ApiClubException('Séance introuvable.', 404);
}
```

Séance inexistante ou séance d'un autre club : même réponse. Comme un gardien qui dit « connais pas ». Répondre « interdit » avouerait que la séance existe. En essayant des numéros, un curieux pourrait alors deviner l'activité d'un autre club.

```jeu
{ "type": "choix", "question": "Tu es coach au club A. Tu demandes à l'API une séance qui appartient au club B. Que répond le serveur ?", "choix": ["403, interdit", "404, séance introuvable", "200, avec la séance"], "bonne": 1, "explication": "404 uniforme : impossible de distinguer « n'existe pas » de « pas à toi ». Le serveur ne révèle rien." }
```

## À retenir

- **Authentification** : qui es-tu. **Autorisation** : as-tu le droit.
- Chaque route commence par `denyAccessUnlessGranted(niveau, objet)`.
- Trois niveaux à connaître : `CLUB_MEMBER`, `CLUB_STAFF`, `CLUB_ADMIN`.
- Le droit se vérifie toujours **dans le club de l'objet** : c'est l'isolation par club.
- Dans l'API, la séance d'un autre club répond 404 pour ne pas révéler qu'elle existe.

## Mise en pratique

Ouvre un terminal dans `mabb-site` et lance :

```powershell
Get-ChildItem src\Controller -Recurse -Filter *.php | Select-String "CLUB_ADMIN"
```

Choisis trois lignes du résultat. Pour chacune, ouvre le fichier et lis la route juste au-dessus.

C'est réussi quand tu peux expliquer, pour chacune des trois, pourquoi un coach ne doit pas pouvoir le faire à la place du dirigeant.
