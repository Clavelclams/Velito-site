---
titre: "Une application web, c'est quoi ?"
parcours: "venaball-de-zero"
ordre: 2
niveau: "debutant"
duree: 25
date: 2026-10-04
---

## Le cours

Dans la leçon 1, tu as vu qui utilise Venaball. Maintenant on regarde ce qu'il y a derrière l'écran. Pas de panique : il n'y a que quatre ou cinq pièces, toujours les mêmes, dans toutes les applications web du monde.

### Partir de l'écran de la coach

La coach des U15 ouvre Chrome sur son ordinateur, tape `manager.mabb.fr`, se connecte, et voit la liste de ses équipes. Pour elle, c'est "un site". Pour toi, il se passe une conversation entre plusieurs machines. On va nommer chaque acteur.

### Les pièces, une par une

- **Le navigateur.** C'est le programme qui affiche les pages : Chrome, Firefox, Safari. Il ne sait rien de Venaball. Il sait seulement demander une page et afficher ce qu'on lui renvoie.
- **Le serveur.** C'est un ordinateur allumé en permanence quelque part, qui attend qu'on lui demande des pages. Celui du MABB est chez l'hébergeur OVH, dans un centre de données. Le code du dossier `mabb-site` est installé dessus.
- **La base de données.** C'est le classeur géant et ultra rangé où le serveur range toutes les informations : les clubs, les équipes, les joueuses, les matchs, les présences. Elle est organisée en **tables** (une table par sorte de chose, par exemple la table `equipe`) et chaque table a des **lignes** (une ligne par équipe). Côté MABB c'est MariaDB 10.4, côté Venaball MySQL 8.4 (source : `instruction/00_ECOSYSTEME.md` §2.1). MariaDB et MySQL sont deux cousins presque identiques ; on dit souvent "MySQL" pour les deux.
- **HTTP.** C'est la langue que parlent le navigateur et le serveur. Une conversation HTTP, c'est toujours une **requête** (la question : "donne-moi la page /equipes") suivie d'une **réponse** (la page, ou un message d'erreur). Le "S" de HTTPS veut dire que la conversation est chiffrée : personne sur le wifi du gymnase ne peut la lire.
- **L'URL.** C'est l'adresse complète d'une page, par exemple `https://manager.mabb.fr/equipes`. Elle se lit en morceaux : `https://` (la langue), `manager.mabb.fr` (à quelle machine on parle), `/equipes` (quelle page on veut sur cette machine).
- **Le domaine.** C'est le nom lisible d'un serveur, comme `mabb.fr`. Le morceau devant, `manager.`, s'appelle un **sous-domaine**. C'est comme un club (mabb.fr) avec plusieurs salles (manager, pirb). Tout Venaball repose là-dessus : selon le sous-domaine, le même serveur sert un espace différent.
- **HTML.** C'est le langage dans lequel on écrit une page web : des titres, des paragraphes, des tableaux, des boutons. C'est ce que le serveur renvoie au navigateur, et ce que le navigateur sait dessiner.

### L'analogie du club-house

Imagine le club-house du gymnase un soir de match.

- Le spectateur au comptoir, c'est le **navigateur**. Il demande "un sandwich jambon".
- Sa commande, c'est la **requête HTTP**. Le nom du sandwich sur l'ardoise, c'est l'**URL**.
- Le bénévole derrière le comptoir, c'est le **serveur** : il reçoit la commande, sait comment la préparer.
- La réserve avec le pain et le jambon, c'est la **base de données** : le serveur va y chercher les ingrédients.
- Le sandwich emballé qu'on tend au spectateur, c'est la **réponse**, en **HTML**.

Le spectateur n'entre jamais dans la réserve. Il demande, on lui sert. C'est exactement pour ça qu'un navigateur ne touche jamais la base de données directement : il passe toujours par le serveur.

### Site vitrine statique contre application

Il existe deux grandes familles de sites.

Un **site statique**, c'est une pile de pages HTML déjà écrites, posées sur un serveur, qui renvoie toujours la même chose à tout le monde. C'est le cas de `venaball.fr` : d'après le doc maître (§5), c'est cinq fichiers HTML déployés par simple copie. Comme une affiche punaisée sur le panneau du gymnase : tout le monde lit la même.

Une **application web**, c'est un site qui fabrique la page au moment où tu la demandes, selon qui tu es et ce qu'il y a dans la base. Quand la coach des U15 ouvre `/equipes`, elle ne voit pas la même chose que le coach d'un autre club. C'est le cas de `manager.mabb.fr`. Même la vitrine `mabb.fr` est fabriquée par le même code, parce qu'elle a un petit outil d'administration pour écrire les actualités.

### PHP, Symfony, framework, Doctrine : les mots du projet

- **PHP** est un langage de programmation, c'est-à-dire une façon d'écrire des instructions qu'un ordinateur sait exécuter. Il est fait pour les serveurs web. Venaball utilise PHP 8.3 (le fichier `composer.json` demande au minimum PHP 8.2).
- Un **framework**, c'est une boîte à outils géante avec des règles de rangement imposées. Au lieu de tout réinventer (lire une URL, gérer une connexion, protéger un formulaire), tu utilises ce qui existe déjà et tu ranges ton code là où le framework l'attend. Comme une fédération qui fournit les feuilles de match, le règlement et le format des compétitions : le club n'a plus qu'à jouer.
- **Symfony** est le framework PHP choisi pour Venaball, en version 7.4. Tu le vois dans `composer.json`, à des lignes comme `"symfony/framework-bundle": "7.4.*"`.
- **Doctrine** est l'outil qui fait le pont entre le code PHP et la base de données. Tu écris "donne-moi les équipes de ce club" en PHP, Doctrine le traduit en langage de base de données (le SQL). Tu le vois dans `composer.json` : `"doctrine/orm": "^3.6.7"`.
- **Twig** est l'outil qui fabrique le HTML à partir d'un modèle de page. On le verra en leçon 10.

### Pourquoi l'app mobile ne parle pas à la base

Les deux apps mobiles (Venaball et Venaball Club) ne parlent jamais directement à MySQL. Elles parlent à une **API**.

Une **API**, c'est un guichet prévu pour les programmes, pas pour les humains. Au lieu de renvoyer une page HTML jolie, le serveur renvoie des données brutes, au format **JSON** (une façon d'écrire des données en texte, avec des accolades et des paires "nom: valeur", que tous les langages savent lire).

Pourquoi ce détour ? Trois raisons simples.

1. **La sécurité.** Pour parler à la base, il faut son mot de passe. S'il était dans l'app, n'importe qui pourrait le sortir du téléphone et lire toutes les fiches de joueuses mineures.
2. **Les règles.** Le serveur vérifie les droits : tel coach a-t-il le droit de voir telle équipe ? Si l'app lisait la base directement, personne ne ferait ce contrôle.
3. **Une seule vérité.** Le site web et les deux apps passent par le même code serveur. Une règle écrite une fois vaut partout.

Voici le même besoin, "lister les équipes", vu par l'API. Fichier `src/Controller/Api/Club/ApiClubCoachController.php` :

```php
#[Route('/api/club/equipes', name: 'api_club_equipes', methods: ['GET'])]
public function equipes(Request $request): JsonResponse
{
    $club = $this->clubCourant($request);
    $this->exigerEncadrement($club);
    // ...
    $saison = $this->saisonAvecEquipes($club, $this->saisonService->getSaisonActive());
    $equipes = $this->equipesAccessibles($this->utilisateur(), $club, $saison);
    // ...
    return new JsonResponse([
        'saison'  => $saison,
        'equipes' => $sortie,
    ]);
}
```

- Ligne 1 : l'adresse de ce guichet est `/api/club/equipes`, et on n'accepte que la méthode GET (lire, pas modifier).
- Ligne 2 : la fonction s'appelle `equipes`, elle reçoit la requête et rendra une `JsonResponse`, une réponse en JSON.
- Ligne 4 : on trouve le club concerné. L'app Club envoie un en-tête `X-Club-Id` à chaque appel (règle écrite dans le `CLAUDE.md` de `venaball club-store`).
- Ligne 5 : on refuse si la personne n'encadre pas dans ce club. C'est la règle de droits, faite côté serveur.
- Ligne 7 : on choisit la saison (la saison active, avec un repli si elle n'a pas encore d'équipes).
- Ligne 8 : on récupère seulement les équipes que cette personne peut encadrer.
- Lignes 10 à 13 : on renvoie des données, pas une page. C'est l'app qui décide comment les dessiner.

Compare avec le site web : le contrôleur `src/Controller/Manager/EquipeController.php` finit par `return $this->render('manager/equipe/index.html.twig', [...])`, c'est-à-dire "fabrique une page HTML". Même serveur, même base, deux guichets : un pour les navigateurs (HTML), un pour les apps (JSON).

Comment l'API sait qui parle ? L'app envoie un **jeton** (en anglais "Bearer token") : une longue chaîne secrète obtenue au moment de la connexion, comme un bracelet d'accès au gymnase. Le serveur la vérifie dans `src/Security/ApiTokenHandler.php`. On détaillera en leçon 12.

### Ce que tu dis au jury

"Venaball est une application web classique : un navigateur envoie une requête HTTP, le serveur PHP fabrique la réponse en allant chercher les données dans une base MySQL, et renvoie du HTML. J'ai choisi le framework Symfony pour ne pas réinventer le routage, la sécurité et les formulaires, avec Doctrine pour parler à la base. Les applications mobiles ne touchent jamais la base : elles passent par une API qui renvoie du JSON, pour que le mot de passe de la base reste sur le serveur et que les droits soient vérifiés au même endroit pour le web et le mobile. La vitrine produit venaball.fr, elle, est un site statique, parce qu'elle n'a besoin d'aucune donnée."

## À retenir

- Navigateur demande, serveur fabrique, base de données stocke : le navigateur ne touche jamais la base.
- Une URL se lit en morceaux : langue (`https`), machine (`manager.mabb.fr`), page (`/equipes`).
- Un site statique renvoie la même page à tous ; une application fabrique la page pour chaque personne.
- PHP est le langage, Symfony le framework (la boîte à outils avec ses règles), Doctrine le pont vers la base.
- Les apps mobiles parlent à une API qui renvoie du JSON, jamais à la base, pour la sécurité et pour des règles uniques.

## Mise en pratique

1. Ouvre `mabb-site/composer.json` dans VS Code. Trouve et surligne la ligne qui prouve que tu utilises Symfony 7.4, celle qui prouve Doctrine, et celle qui fixe la version minimale de PHP.
2. Ouvre `mabb-site/src/Controller/Manager/EquipeController.php`, cherche `return $this->render(`. Puis ouvre `mabb-site/src/Controller/Api/Club/ApiClubCoachController.php` et cherche `return new JsonResponse(`. Écris en deux phrases la différence entre les deux.
3. Sur une feuille, refais l'analogie du club-house avec tes propres mots, mais pour l'app mobile : qui est le spectateur, qui est le guichet, qu'est-ce qui est servi ?

C'est réussi quand tu peux expliquer à voix haute, en moins de trois minutes, pourquoi l'app Venaball Club ne contient pas le mot de passe de la base de données.
