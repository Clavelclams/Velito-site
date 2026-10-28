---
titre: "Le voyage d'un clic : de « Équipes » jusqu'à la page affichée"
parcours: "venaball-de-zero"
ordre: 3
niveau: "debutant"
duree: 30
date: 2026-10-04
---

## Le cours

La coach des U15 est connectée au Manager. Dans le menu de gauche, elle clique sur **Équipes**. Une demi-seconde plus tard, un tableau s'affiche : nom, catégorie, saison, niveau, statut. Dans cette leçon, on suit ce clic pas à pas, comme on suivrait un ballon de la remise en jeu jusqu'au panier. Chaque étape correspond à un vrai fichier de `mabb-site`.

### Étape 0 : le lien dans le menu

Le menu du Manager est écrit dans `templates/manager/base.html.twig`. On y trouve, ligne 1026 :

```twig
<li><a href="{{ path('manager_equipe_index') }}" class="...">
    <i class="bi bi-people-fill"></i> Équipes
</a></li>
```

- `<a href="...">` : en HTML, c'est un lien. Cliquer dessus demande une nouvelle page.
- `path('manager_equipe_index')` : on n'écrit pas l'adresse en dur. On donne le **nom** de la route (on verra ce mot plus bas), et Symfony calcule l'adresse, ici `/equipes`.
- `<i class="bi bi-people-fill">` : la petite icône "groupe de personnes", tirée de la bibliothèque Bootstrap Icons.

Le navigateur prépare donc la requête : "GET `https://manager.mabb.fr/equipes`".

### Étape 1 : le DNS trouve la machine

Le navigateur connaît le nom `manager.mabb.fr`, mais sur Internet les machines se trouvent par un numéro, l'**adresse IP** (comme un numéro de téléphone). Le **DNS**, c'est l'annuaire d'Internet : on lui donne un nom, il rend un numéro. Le navigateur demande "quel est le numéro de manager.mabb.fr ?", le DNS répond avec l'adresse d'un serveur OVH.

Ce réglage se fait dans l'espace client OVH, pas dans le code. Je ne l'ai donc pas vérifié dans le dépôt. Le doc maître (`instruction/00_ECOSYSTEME.md` §9.1, bloc E) précise que la migration prévue consiste justement à faire pointer le DNS de `manager.mabb.fr` vers l'autre serveur.

### Étape 2 : OVH et Apache reçoivent la requête

Chez OVH, le serveur web s'appelle **Apache**. C'est le portier du gymnase : il reçoit toutes les demandes et décide à qui les passer. Il lit un petit fichier de consignes, `public/.htaccess` :

```apache
RewriteEngine On
# ...
RewriteCond %{HTTP:Authorization} .+
RewriteRule ^ - [E=HTTP_AUTHORIZATION:%0]
# ...
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ %{ENV:BASE}/index.php [L]
```

- Ligne 1 : on active la réécriture d'adresses.
- Lignes 3 et 4 : si la requête porte un en-tête `Authorization` (le jeton des apps mobiles), on le transmet à PHP. Sans ça, l'API ne saurait pas qui parle.
- Ligne 6 : "si le fichier demandé n'existe pas vraiment sur le disque"...
- Ligne 7 : "...alors envoie tout à `index.php`".

Il n'y a pas de fichier `equipes` dans `public/`. Donc Apache passe la requête à `public/index.php`. C'est le principe du **contrôleur frontal** : une seule porte d'entrée pour toutes les pages. Une image ou un fichier CSS, eux, existent sur le disque et sont servis directement, sans PHP.

Le fait que le dossier racine du site soit bien `public/` sur le serveur OVH est un réglage de l'hébergement : non vérifié dans le dépôt.

### Étape 3 : `public/index.php` réveille Symfony

Le fichier entier fait neuf lignes :

```php
<?php

use App\Kernel;

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

return function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
```

- Ligne 3 : on annonce qu'on va utiliser la classe `Kernel`.
- Ligne 5 : on charge l'**autoloader**, le programme qui sait trouver automatiquement le fichier de n'importe quelle classe (dans `src/` ou dans `vendor/`, le dossier des bibliothèques installées).
- Lignes 7 à 9 : on fabrique le **noyau** (Kernel) de Symfony, en lui disant dans quel environnement on est (`prod` sur le serveur) et si le mode débogage est actif.

Le noyau, défini dans `src/Kernel.php` (onze lignes, presque vide), c'est le chef de table de marque : il ne joue pas, il fait tourner le match. Il lit la configuration (`config/`), transforme la requête en objet `Request`, et lance la suite.

### Étape 4 : le routage choisit le contrôleur

Une **route**, c'est une ligne de règlement qui dit : "telle adresse, sur tel domaine, avec telle méthode, va à telle fonction". Le **routage**, c'est l'arbitre qui applique ce règlement.

Dans Venaball, il y a deux couches. D'abord `config/routes.yaml` importe un fichier par espace. Puis `config/routes/manager.yaml` dit **sur quels domaines** les contrôleurs du Manager répondent :

```yaml
manager_controllers:
    resource:
        path: ../../src/Controller/Manager/
        namespace: App\Controller\Manager
    type: attribute
    host: '{subdomain}.{domain}'
    # ...
    requirements:
        subdomain: '(manager|club)'
        domain: '(mabb\.fr|venaball\.fr|localhost)'
```

- Lignes 2 à 4 : "va lire tous les contrôleurs du dossier `src/Controller/Manager/`".
- Ligne 5 : "les routes sont écrites dans le code PHP lui-même, sous forme d'attributs".
- Ligne 6 : l'adresse de la machine a la forme `sous-domaine.domaine`.
- Lignes 8 à 10 : le sous-domaine doit être `manager` ou `club`, le domaine `mabb.fr`, `venaball.fr` ou `localhost`. C'est pour ça que `manager.mabb.fr/equipes` et `club.venaball.fr/equipes` arrivent au même code, alors que `pirb.mabb.fr/equipes` n'y arrive pas.

C'est le **routage par host** : le même serveur sert des espaces différents selon le nom tapé.

Ensuite, dans le contrôleur, l'**attribut** `#[Route]` (une étiquette posée au-dessus d'une fonction) précise l'adresse exacte. Fichier `src/Controller/Manager/EquipeController.php`, ligne 48 :

```php
#[Route('/equipes', name: 'manager_equipe_index', methods: ['GET'])]
public function index(Request $request): Response
```

Adresse `/equipes`, nom interne `manager_equipe_index` (celui utilisé par `path()` à l'étape 0), méthode GET seulement.

Au passage, la sécurité intervient avant le contrôleur. `config/packages/security.yaml` déclare un **pare-feu** (firewall) `manager` limité aux hosts `manager.` et `club.`, et sa liste `access_control` finit par la règle `{ path: ^/, host: '^(manager|club)\.', roles: ROLE_USER }` : tout le Manager exige d'être connecté. Si la coach n'était pas connectée, elle serait renvoyée vers la page de connexion. Détails en leçon 11.

### Étape 5 : le contrôleur fait son travail

Un **contrôleur**, c'est une classe PHP dont chaque fonction répond à une page. C'est le coach pendant le match : il ne marque pas les paniers lui-même, il donne les consignes. Voici le début de `index()` (lignes 51 à 79, raccourcies) :

```php
$club = $this->tenantResolver->getCurrentClub();
if (!$club) {
    $this->addFlash('warning', 'Aucun club actif. Sélectionne un club pour continuer.');
    return $this->redirectToRoute('manager_dashboard');
}

$this->denyAccessUnlessGranted(ClubVoter::CLUB_MEMBER, $club);

$saisonCourante = $this->getSaisonCourante();
$saisonFiltre = $request->query->get('saison', $saisonCourante);
// ...
$criteria = ['club' => $club];
if ($saisonFiltre !== 'all') {
    $criteria['saison'] = $saisonFiltre;
}
// ...
$equipes = $this->equipeRepository->findBy($criteria);
```

- Ligne 1 : on demande au `TenantResolver` (`src/Security/Tenant/TenantResolver.php`) quel est le club actif. Il le lit dans la **session**, la mémoire que le serveur garde pour cette personne entre deux clics.
- Lignes 2 à 5 : pas de club ? On affiche un message et on renvoie au tableau de bord.
- Ligne 7 : le **voter** `ClubVoter` vérifie que la coach est bien membre de ce club. Sinon, accès refusé.
- Lignes 9 et 10 : on prend la saison active (calculée par `SaisonService`), sauf si l'adresse contient `?saison=...`.
- Lignes 12 à 15 : on prépare les critères de recherche. **Toujours** filtrer par club : c'est ce qui empêche un club de voir les équipes d'un autre.
- Ligne 17 : on demande les équipes au **Repository**.

### Étape 6 : le Repository interroge la base

Un **Repository**, c'est le ou la bénévole qui connaît le classeur par cœur : tu lui dis "les équipes du MABB, saison 2026-2027, actives", il ou elle te les sort. `EquipeRepository` (`src/Repository/Sport/EquipeRepository.php`) hérite de Doctrine la fonction `findBy`. Doctrine traduit les critères en une requête SQL vers la table `equipe` (nom fixé dans `src/Entity/Sport/Equipe.php` par `#[ORM\Table(name: 'equipe')]`). La base renvoie des lignes, Doctrine les transforme en objets PHP `Equipe`.

Ensuite le contrôleur trie les équipes par catégorie (U7 avant U18, puis Séniors), et non par ordre alphabétique, qui mettrait "Séniors" avant "U13".

### Étape 7 : Twig fabrique la page

Dernière ligne de `index()` (ligne 112) :

```php
return $this->render('manager/equipe/index.html.twig', [
    'equipes'             => $equipes,
    'club'                => $club,
    'saison_filtre'       => $saisonFiltre,
    // ...
]);
```

On donne au modèle de page `templates/manager/equipe/index.html.twig` les équipes trouvées. Dans ce modèle, une boucle dessine une ligne de tableau par équipe :

```twig
{% for equipe in equipes %}
    <tr class="{{ not equipe.isActive ? 'inactive' : '' }}">
        <td>
            <a href="{{ path('manager_equipe_show', {id: equipe.id}) }}">
                {{ equipe.nom }}
            </a>
        </td>
        <td><span class="badge-categorie">{{ equipe.categorie }}</span></td>
```

- Ligne 1 : "pour chaque équipe de la liste".
- Ligne 2 : une ligne de tableau, grisée si l'équipe est archivée.
- Lignes 4 à 6 : le nom de l'équipe, cliquable vers sa fiche.
- Ligne 8 : la catégorie dans une pastille.

Le même modèle n'affiche le bouton "Nouvelle équipe" que si `is_granted('CLUB_STAFF', club)` : un parent membre du club voit la liste, pas le bouton.

### Étape 8 : la réponse repart

Symfony emballe le HTML dans une **réponse HTTP** (code 200, "tout va bien"), Apache la renvoie, le navigateur la dessine. Puis il redemande les petits fichiers à part (CSS, icônes), servis directement par Apache. Fin du voyage.

```
clic -> DNS -> OVH/Apache (.htaccess) -> public/index.php -> Kernel
     -> routage (routes/manager.yaml + #[Route]) -> pare-feu
     -> EquipeController::index() -> TenantResolver + ClubVoter
     -> EquipeRepository::findBy() -> MySQL (table equipe)
     -> Twig (manager/equipe/index.html.twig) -> HTML -> navigateur
```

### Ce que tu dis au jury

"Quand une coach clique sur Équipes, le DNS mène la requête au serveur OVH, Apache la confie à l'unique point d'entrée `public/index.php`, qui démarre le noyau Symfony. Le routage choisit le contrôleur selon le domaine, grâce à `config/routes/manager.yaml`, puis selon l'adresse, grâce à l'attribut `#[Route]`. Le contrôleur récupère le club actif, vérifie les droits avec mon `ClubVoter`, et demande au Repository les équipes filtrées par club et par saison. Twig transforme ces objets en HTML, et la réponse repart vers le navigateur. Chaque étape a un rôle unique, ce qui me permet de savoir où chercher quand quelque chose casse."

## À retenir

- Toutes les pages passent par une seule porte : `public/index.php`, grâce à la règle de `public/.htaccess`.
- Le routage se fait en deux temps : le domaine (`config/routes/manager.yaml`) puis l'adresse (`#[Route]` dans le contrôleur).
- Le contrôleur donne les consignes : club actif, droits, critères ; il ne fait pas le SQL lui-même.
- Le Repository va chercher dans la base, filtré par club : c'est la base de l'isolation entre clubs.
- Twig transforme les données en HTML ; la réponse repart par le même chemin.

## Mise en pratique

1. Ouvre `mabb-site/src/Controller/Manager/EquipeController.php` dans VS Code et va à la ligne 48. Lis la fonction `index()` jusqu'à la ligne 120 et, pour chaque bloc, écris en marge (sur papier) l'étape du voyage qui correspond.
2. Ouvre `mabb-site/config/routes/manager.yaml` et `mabb-site/config/routes/pirb.yaml`. Note quels sous-domaines mènent à chaque dossier de contrôleurs.
3. Dessine le voyage du clic sur une feuille, avec une case par étape et le nom du vrai fichier dans chaque case.
4. Bonus : explique à voix haute ce qui se passerait si on oubliait `'club' => $club` dans `$criteria`.

C'est réussi quand tu peux raconter le voyage complet, de `<a href>` jusqu'au tableau affiché, en citant au moins six fichiers réels sans regarder tes notes.
