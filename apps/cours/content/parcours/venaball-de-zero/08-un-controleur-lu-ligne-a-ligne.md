---
titre: "Un contrôleur lu ligne à ligne : archiver une équipe"
parcours: "venaball-de-zero"
ordre: 8
niveau: "debutant"
duree: 35
date: 2026-10-04
---

## Le cours

Fin de saison. Le dirigeant ouvre la page « Équipes » de `club.venaball.fr`. Sur la ligne « U13 F 2025-2026 », il clique sur le bouton rouge **Archiver**. Une petite fenêtre demande « Archiver cette équipe ? ». Il confirme. La page se recharge, un bandeau vert dit « Équipe "U13 F" archivée. », et l'équipe a disparu de la liste.

Entre le clic et le bandeau vert, un seul morceau de code a décidé de tout : un **contrôleur**. Dans la leçon 3, tu as vu le voyage d'un clic. Ici, on s'arrête sur la gare d'arrivée.

### Le contrôleur : l'arbitre de la requête

Un **contrôleur**, c'est une classe PHP dont chaque méthode publique répond à une adresse précise. Quand une **requête** (la demande envoyée par le navigateur) arrive, Symfony cherche quelle méthode correspond, l'exécute, et renvoie ce qu'elle produit : une **réponse** (une page HTML, une redirection, ou des données JSON).

Image du club : l'arbitre. Il reçoit une situation, vérifie les règles, prend une décision et la signale. Il ne fabrique pas le terrain (c'est la base de données) et ne dessine pas le tableau d'affichage (c'est Twig). Il décide.

Notre contrôleur est `src/Controller/Manager/EquipeController.php` (631 lignes). Son commentaire d'en-tête résume les droits : lecture pour tout membre, création et modification pour le staff, archivage pour le dirigeant seulement.

### Côté page : le formulaire qui envoie le clic

Le bouton Archiver vient du template `templates/manager/equipe/index.html.twig` (on lira Twig en leçon 10) :

```twig
<form method="post" action="{{ path('manager_equipe_archive', {id: equipe.id}) }}" ...>
    <input type="hidden" name="_token" value="{{ csrf_token('archive_equipe_' ~ equipe.id) }}">
    <button type="submit" ...>
        <i class="bi bi-archive"></i> Archiver
    </button>
</form>
```

- `method="post"` : on envoie une demande de **modification** (POST), pas une simple lecture (GET).
- `action="..."` : l'adresse visée, par exemple `/equipes/12/archiver`.
- `_token` : un champ caché avec un **jeton CSRF**. On y revient plus bas.

### L'action `archive()`, ligne par ligne

```php
#[Route('/equipes/{id}/archiver', name: 'manager_equipe_archive', methods: ['POST'])]
public function archive(Request $request, Equipe $equipe): Response
{
    // Sécurité : seul un dirigeant peut archiver
    $this->denyAccessUnlessGranted(ClubVoter::CLUB_ADMIN, $equipe);

    $token = (string) $request->request->get('_token', '');
    if (!$this->isCsrfTokenValid('archive_equipe_' . $equipe->getId(), $token)) {
        $this->addFlash('error', 'Jeton de sécurité invalide. Réessaie.');
        return $this->redirectToRoute('manager_equipe_index');
    }

    $equipe->setIsActive(false);
    $this->em->flush();

    $this->addFlash('success', sprintf('Équipe "%s" archivée.', $equipe->getNom()));
    return $this->redirectToRoute('manager_equipe_index');
}
```

**`#[Route(...)]`** : la **route**, c'est l'étiquette qui relie une adresse à cette méthode.
- `'/equipes/{id}/archiver'` : le chemin. `{id}` est un **paramètre** : une partie variable de l'adresse, ici le numéro de l'équipe.
- `name: 'manager_equipe_archive'` : le nom interne de la route. Les templates l'utilisent avec `path()` au lieu d'écrire l'adresse en dur.
- `methods: ['POST']` : seule une requête POST est acceptée. Taper l'adresse dans la barre du navigateur (GET) ne déclenche rien.

Le domaine (`club.venaball.fr` ou `manager.mabb.fr`) n'est pas ici : il est réglé une fois pour tout le dossier `Manager/` dans `config/routes/manager.yaml`.

**`public function archive(Request $request, Equipe $equipe): Response`**
- `Request $request` : Symfony te donne la requête complète, avec ce que le formulaire a envoyé.
- `Equipe $equipe` : Symfony voit qu'on attend une `Equipe` et qu'il y a un `{id}` dans l'adresse. Il va chercher tout seul l'équipe n°12 en base avec Doctrine. Si elle n'existe pas, il répond 404 (« page introuvable ») avant même d'entrer dans la méthode.
- `: Response` : la méthode promet de renvoyer une réponse.

**`$this->denyAccessUnlessGranted(ClubVoter::CLUB_ADMIN, $equipe);`**
« Refuse l'accès, sauf si l'utilisateur a le droit CLUB_ADMIN sur cette équipe. » Le `ClubVoter` (leçon 11) récupère le club de l'équipe avec `getClub()`, grâce à `ClubAwareInterface` vu en leçon 6, et vérifie que l'utilisateur est DIRIGEANT **dans ce club-là**. Un dirigeant d'un autre club qui tenterait `/equipes/12/archiver` reçoit un refus (403). C'est la première ligne, avant toute action : on vérifie d'abord, on agit ensuite.

**Les trois lignes du jeton CSRF**
Le **CSRF** (Cross-Site Request Forgery), c'est une attaque où un site piégé fait envoyer, à ton insu, un formulaire vers Venaball pendant que tu y es connecté. Le jeton est un code secret glissé dans le formulaire par Venaball lui-même. Un site extérieur ne peut pas le deviner.
- `$request->request->get('_token', '')` : on lit le jeton envoyé (`request->request` = les champs du formulaire POST).
- `isCsrfTokenValid('archive_equipe_' . $equipe->getId(), $token)` : on le compare à celui attendu pour **cette** action et **cette** équipe. Le point `.` colle deux textes en PHP.
- S'il est faux : message d'erreur et retour à la liste, sans rien modifier.

**`$equipe->setIsActive(false); $this->em->flush();`**
On n'efface pas l'équipe : on la marque inactive. Le commentaire au-dessus de la méthode explique pourquoi : l'historique des joueuses, des matchs et des bilans y est rattaché. C'est un **soft delete** (suppression douce). `flush()` demande à Doctrine d'écrire le changement en base (leçon 6). Pas besoin de `persist()` : l'équipe vient déjà de la base, Doctrine la surveille.

**`$this->addFlash('success', ...)`**
Un **message flash**, c'est un message rangé dans la session de l'utilisateur, affiché une seule fois sur la page suivante, puis effacé. C'est le bandeau vert. `sprintf` fabrique la phrase en insérant le nom de l'équipe à la place de `%s`.

**`return $this->redirectToRoute('manager_equipe_index');`**
La réponse n'est pas une page, c'est une **redirection** : « va maintenant à la liste des équipes ». Le navigateur recharge la liste, qui affiche le flash. Avantage : si le dirigeant appuie sur F5, il recharge la liste, pas l'archivage.

### Une action qui affiche une page : `new()`

Créer une équipe montre l'autre type de réponse. Extrait de la même classe :

```php
$this->denyAccessUnlessGranted(ClubVoter::CLUB_STAFF, $club);

$equipe = new Equipe();
// Force le club AVANT le formulaire, l'utilisateur ne peut pas le changer
$equipe->setClub($club);

$form = $this->createForm(EquipeType::class, $equipe);
$form->handleRequest($request);

if ($form->isSubmitted() && $form->isValid()) {
    $this->em->persist($equipe);
    $this->em->flush();
    // ... flash + redirectToRoute
}

return $this->render('manager/equipe/new.html.twig', [
    'form'   => $form,
    'equipe' => $equipe,
    'club'   => $club,
]);
```

- `$club` vient juste avant de `$this->tenantResolver->getCurrentClub()` : le club actif de l'utilisateur.
- `setClub($club)` avant le formulaire : le club n'est jamais un champ que l'utilisateur peut choisir. C'est le serveur qui tamponne la fiche, règle multi-club de la leçon 5.
- `createForm` / `handleRequest` : Symfony construit le formulaire et le remplit avec ce qui a été envoyé.
- `isSubmitted() && isValid()` : le formulaire a été envoyé et respecte les contraintes `Assert` de l'entité. Ici, le formulaire Symfony gère lui-même le jeton CSRF.
- `persist` puis `flush` : nouvelle équipe, donc on demande d'abord à Doctrine de la suivre.
- `render(...)` : si on arrive en GET, ou si le formulaire a des erreurs, on fabrique la page HTML avec ce template et ces variables.

### Et pour l'app mobile : `JsonResponse`

L'app staff ne veut pas de HTML, elle veut des données. Extrait de `src/Controller/Api/Club/ApiClubMissionController.php` (un bénévole confirme sa mission du week-end) :

```php
#[Route('/api/club/missions/{aid}/confirmer', name: 'api_club_mission_confirmer', methods: ['POST'], requirements: ['aid' => '\d+'])]
public function confirmer(int $aid, Request $request): JsonResponse
{
    $a = $this->maMission($aid, $request);
    // ... refus si la candidature attend encore un dirigeant
    $a->setStatut(AffectationMatch::STATUT_CONFIRME);
    $this->em->flush();

    return new JsonResponse(['succes' => true, 'statut' => $a->getStatut()]);
}
```

Même squelette : route, vérification (`maMission()` contrôle que la mission est la sienne, dans son club, sinon 404), modification, `flush`. Seule la sortie change : du **JSON**, un format texte de données que l'app lit. `requirements: ['aid' => '\d+']` impose que le paramètre soit un nombre. Pas de jeton CSRF ici : l'API s'authentifie par un jeton envoyé dans un en-tête, pas par un cookie (leçon 12).

### Le problème des contrôleurs obèses

`EquipeController` est lisible. Tous ne le sont pas. Comptage avec `wc -l` dans `src/Controller/Manager/` :

- `RencontreController.php` : 1 466 lignes, 25 routes, 10 dépendances dans son constructeur ;
- `StatsLiveController.php` : 1 074 lignes ;
- `SecretariatController.php` : 987 lignes.

On appelle ça un **contrôleur obèse** : un arbitre qui, en plus d'arbitrer, tient la buvette, la table de marque et la comptabilité. Pourquoi c'est un problème :
- **Lire** : pour comprendre une action, il faut naviguer dans 1 400 lignes.
- **Tester** : la logique métier enfermée dans un contrôleur ne se teste qu'en simulant toute une requête HTTP.
- **Casser** : chaque modification touche un fichier que tout le monde modifie. Le code e-Marque du 3 octobre (leçon 7) a ajouté une action de plus dans `RencontreController.php`, et sa correction a dû y revenir.
- **Recopier** : quand une règle vit dans un contrôleur, un autre contrôleur finit par la recopier, et les deux copies divergent. La leçon 9 montre un vrai cas.

Le remède : un contrôleur mince qui vérifie, appelle un **service** (leçon 9) et répond. C'est un chantier à mener, pas un état acquis.

### Ce que tu dis au jury

« Un contrôleur reçoit la requête, vérifie les droits en premier avec `denyAccessUnlessGranted` et le `ClubVoter`, puis agit et renvoie une réponse : une page avec `render`, une redirection avec `redirectToRoute`, ou du JSON pour les apps. Sur les formulaires POST du manager, je vérifie un jeton CSRF, et le club est toujours imposé par le serveur, jamais choisi par l'utilisateur. L'archivage est une suppression douce pour garder l'historique. Je sais que certains contrôleurs sont trop gros, comme `RencontreController` avec 1 466 lignes, et que la prochaine étape est d'en sortir la logique dans des services. »

## À retenir

- Un contrôleur relie une route (adresse + méthode HTTP + nom) à une méthode PHP qui renvoie une réponse.
- Première ligne utile : `denyAccessUnlessGranted(ClubVoter::..., $objet)`, qui vérifie le droit dans le club de l'objet.
- Trois sorties : `render()` (page HTML), `redirectToRoute()` (redirection, souvent après un POST, avec un `addFlash`), `JsonResponse` (API).
- Tout POST du manager vérifie un jeton CSRF (`isCsrfTokenValid` ou formulaire Symfony) ; le club est imposé côté serveur (`setClub`).
- Un contrôleur obèse (`RencontreController` : 1 466 lignes) est dur à lire, à tester et facile à casser : la logique doit partir dans des services.

## Mise en pratique

Lis seul l'action `reactivate()` de `src/Controller/Manager/EquipeController.php` (juste sous `archive()`), puis le bouton « Réactiver » correspondant dans `templates/manager/equipe/index.html.twig`.

1. Écris l'adresse, la méthode HTTP et le nom de la route.
2. Écris quel droit est exigé et ce que voit un coach (pas dirigeant) sur la page liste.
3. Relie le nom du jeton CSRF dans le template au nom vérifié dans le contrôleur.
4. Décris ce que voit l'utilisateur après le clic, dans l'ordre.
5. Ouvre `RencontreController.php`, compte ses `#[Route` avec la recherche de ton éditeur, et choisis une action dont la logique mériterait d'aller dans un service. Écris pourquoi en trois lignes.

C'est réussi quand tu peux réexpliquer `reactivate()` à voix haute ligne par ligne sans regarder cette leçon, et justifier ton choix d'action à sortir de `RencontreController`.
