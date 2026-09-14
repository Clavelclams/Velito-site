---
titre: "Concevoir un endpoint : du besoin de l'app au contrat serveur"
parcours: "api-auth"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

L'API club de Venaball est née d'un besoin précis : l'app mobile doit permettre à un coach de convoquer, à un parent de voir, à un bénévole de s'inscrire. Chaque endpoint répond à un **écran**. Concevoir une API, c'est traduire des écrans en ressources — et résister à la tentation d'exposer la base telle quelle.

**Partir de l'usage, pas des tables.** L'app affiche « ma journée » : mes équipes, la prochaine rencontre, mes tâches. Deux mauvaises réponses : un endpoint par table (`/joueurs`, `/equipes`, `/rencontres`, `/convocations` — l'app fait dix appels et recompose), ou un endpoint fourre-tout (`/tout` — 2 Mo de JSON pour afficher trois lignes). La bonne : un endpoint par **vue** cohérente. `/api/club/moi` rend ce qu'il faut pour l'écran d'accueil : identité, rôles, clubs, équipes. Un appel, un écran.

**Le principe des vues par rôle.** `ApiClubCoachController`, `ApiClubParentController`, `ApiClubPilotageController` (direction), `ApiClubOrgaController` (bénévoles) : un contrôleur par **façon de voir le club**. Le coach voit ses équipes et convoque ; le parent voit ses enfants et répond ; le dirigeant voit la trésorerie. Les données sous-jacentes se recoupent (la même `Rencontre`), mais chaque vue expose **ce que ce rôle a le droit et besoin de voir**. C'est de l'autorisation par conception : un parent n'a pas d'endpoint pour convoquer, donc pas besoin d'un Voter qui le lui refuse.

**Ce qu'un endpoint expose, et ce qu'il tait.** Une entité Doctrine a vingt champs ; l'app en a besoin de six. On ne sérialise **jamais** l'entité entière (`json_encode($joueur)`) : on construit explicitement le tableau de sortie. Trois raisons : ne pas fuiter un champ sensible ajouté plus tard (le `tokenHash`, une note interne), ne pas coupler le contrat de l'API à la structure de la base (renommer une colonne ne doit pas casser l'app), et contrôler la taille. « Prénom + club seulement entre joueuses » (règle produit du 09/09) est une règle de sérialisation : la réponse de l'API pour une coéquipière ne contient ni nom, ni téléphone, ni date de naissance.

**Le format d'entrée.** Un `POST` reçoit du JSON. Le contrôleur le lit avec `$request->toArray()` (lève une exception si invalide → 400), puis **valide** chaque champ : présent, du bon type, dans la bonne plage. `max(0, min(300, (int) $data['scoreAdverse']))` en une ligne. Pour un objet plus riche, un DTO (*Data Transfer Object*) avec des attributs de validation Symfony (`#[Assert\Range(min: 0, max: 300)]`) et `$validator->validate($dto)` → 422 avec la liste des erreurs. C'est l'étape « ne jamais faire confiance au client » appliquée à l'API.

**La pagination.** `/api/club/rencontres` rend toutes les rencontres de la saison — quelques dizaines, ça passe. `/api/club/actions` (les actions de match) en aurait des milliers : il faut paginer. Deux styles : `?page=3&limit=50` (simple, mais instable si des lignes s'insèrent entre deux pages), ou par curseur `?after=<id>&limit=50` (stable, c'est ce que fait Supabase avec `range()`). Choisis avant que ça devienne nécessaire : ajouter la pagination après coup casse le contrat.

**Les actions qui ne sont pas CRUD.** `POST /api/club/missions/{aid}/confirmer` : ce n'est ni créer ni modifier un champ, c'est une **transition** avec des règles (on ne confirme pas une mission déjà pourvue, on notifie l'organisateur). Un `PATCH { "statut": "confirmee" }` cacherait ces règles derrière un changement de champ. L'action nommée est plus honnête : elle dit qu'il se passe quelque chose. Même logique que `demarrerTournoi` sur ARENA, qui n'est pas un simple changement de statut.

**Le renfort en cascade.** L'endpoint du 9 septembre : « le vivier du jour + convocation renfort ». Un cas où l'API fait du **travail** : elle calcule qui est disponible (pas déjà convoquée ailleurs, dans la bonne catégorie, avec accord parental), le renvoie, et un second appel convoque. Deux endpoints — proposer, puis agir — plutôt qu'un seul qui ferait les deux : l'app peut afficher, le coach choisit, puis confirme. Le serveur garde le contrôle (il revérifie à la convocation), l'app garde l'interaction.

## À retenir

- Un endpoint par écran ou par vue cohérente, pas par table.
- Une vue par rôle : l'autorisation par conception.
- Ne jamais sérialiser une entité entière. Construire la sortie explicitement.
- Valider l'entrée (DTO + Assert → 422). Paginer avant que ce soit nécessaire.
- Les transitions métier sont des `POST` nommés, pas des `PATCH` de champ.
- Proposer, puis agir : deux endpoints quand l'humain doit choisir entre les deux.

## Mise en pratique

Objectif : concevoir un endpoint manquant de bout en bout, avec son contrat, sa validation et son test.

1. Choisis un écran de l'app Venaball Club qui n'a pas encore son endpoint (regarde `32_CADRAGE_VENABALL_CLUB_MOBILE` : « centre mes tâches » ?). Écris sur papier ce que l'écran affiche, ligne par ligne.
2. Conçois : une URL (`/api/club/mes-taches`), une méthode (GET), le JSON de sortie (une liste d'objets `{ type, titre, echeance, action_url }`). Écris ce contrat dans `API_CONTRAT.md` **avant** de coder.
3. Code le contrôleur : récupère l'utilisateur du jeton, appelle un **service** (pas de logique dans le contrôleur) qui assemble les tâches depuis les missions, convocations en attente, documents à signer. Sérialise **explicitement** (pas `json_encode($entite)`).
4. Vérifie la sortie : `curl … /api/club/mes-taches`. Un champ sensible a-t-il fuité ? Le JSON correspond-il au contrat écrit à l'étape 2 ? Si non, l'un des deux est faux — corrige.
5. Une action : `POST /api/club/mes-taches/{id}/faire` avec un DTO validé (`#[Assert\NotBlank]` sur ce qu'il faut). Teste avec un corps vide → 422 avec la liste des erreurs.
6. Un test fonctionnel : un utilisateur du club A appelle l'endpoint → ses tâches ; un utilisateur du club B → les siennes, jamais celles de A. C'est le test anti-IDOR appliqué à une liste.

Résultat attendu : un endpoint conçu contrat d'abord, codé service + sérialisation explicite, validé, testé.
