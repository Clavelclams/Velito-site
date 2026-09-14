---
titre: "IDOR : changer un chiffre dans l'URL, et ce que tu as trouvé dans ton propre code"
parcours: "securite-web"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

`/seances/42` → `/seances/43`. Si la 43 s'affiche alors qu'elle appartient à un autre club, c'est une **IDOR** — *Insecure Direct Object Reference*. La faille web la plus courante en pratique, parce qu'elle ne demande aucun outil : un utilisateur curieux et une URL.

**Tu en as trouvé une vraie.** L'audit SEC-0009 de Venaball : une joueuse pouvait s'inscrire bénévole sur le match d'un autre club. Le contrôleur vérifiait « est-elle connectée ? » (authentification) mais pas « ce match est-il de son club ? » (autorisation sur la ressource). Corrigée depuis, et c'est ce qui a donné naissance aux tests anti-IDOR — parcours Tests, leçon 6.

**Le mécanisme.** L'application reçoit un identifiant, charge l'objet, et l'affiche ou le modifie — **sans vérifier que l'utilisateur courant a un lien avec cet objet**. Les ids séquentiels (1, 2, 3…) rendent l'énumération triviale, mais des UUID ne corrigent rien : ils rendent la devinette difficile, pas la vérification inutile. Un UUID qui fuit dans un lien partagé donne accès pareil.

**IDOR en lecture, en écriture, en liste.**

- **Lecture** : voir la séance 43. Fuite de données.
- **Écriture** : `POST /seances/43/supprimer`. Destruction ou modification chez un autre.
- **Liste avec un filtre venant du client** : `GET /joueuses?club_id=7` où le serveur fait confiance au `club_id` reçu. C'est l'IDOR de la convocation : la liste d'ids envoyée par le client contenait une joueuse d'un autre club, et sans intersection avec l'effectif réel, elle aurait été convoquée.

**Les trois façons de la fermer, que tu utilises toutes.**

1. **Vérifier l'appartenance à chaque accès (Voter Symfony).** Charger l'objet, puis `denyAccessUnlessGranted('VOIR', $seance)`. Le Voter répond : « l'utilisateur a-t-il un rôle dans le club de cette séance ? ». C'est explicite, lisible, testable — et il faut penser à l'appeler dans **chaque** contrôleur. Un oubli = une IDOR.

2. **Filtrer à la source (RLS Postgres).** Sur ARENA, la policy `tournois_lecture` fait qu'un `SELECT` sans `WHERE` ne rend que ce que l'utilisateur a le droit de voir. L'IDOR en lecture est **structurellement impossible** : l'objet 43 n'existe pas pour cet utilisateur, la requête revient vide, 404. On ne peut pas oublier la vérification — elle n'est pas dans le code.

3. **Partir du serveur, pas du client (intersection).** `ConvocationManager` : « on ne convoque jamais depuis une liste envoyée par le client. On part de l'effectif réel de l'équipe et on ne garde que les identifiants qui en font partie. » Le client propose, le serveur dispose. Ce motif règle l'IDOR de liste sans même avoir besoin d'un Voter par id.

**Le piège du `find()` avant le `Voter`.** Beaucoup de code fait : `$seance = $repo->find($id); if (!$seance) throw 404; denyAccessUnlessGranted(...)`. C'est correct. Le piège est l'ordre inverse, ou un chemin qui saute le Voter : une commande console, un import, un listener. `AutoLinkBenevoleListener` en est un exemple d'un autre genre — pas un IDOR par URL, mais un rattachement au mauvais club par un chemin qui ne passe par aucun Voter. **Les IDOR se cachent dans les chemins secondaires.**

**Le motif de requête sûr, en Doctrine.** Plutôt que `find($id)` puis vérifier, on peut **inclure le périmètre dans la requête** : `findOneBy(['id' => $id, 'equipe.club' => $clubDeLUtilisateur])` (ou en QueryBuilder avec une jointure). Si la séance n'est pas du bon club, elle n'est pas trouvée → 404. C'est la RLS faite à la main, et ça évite d'oublier le Voter. L'idéal est les deux : la requête filtrée, et le Voter pour les règles fines (rôle coach vs parent).

**403 ou 404 ?** Le Voter Symfony donne 403 (« tu n'as pas le droit »). La RLS et le `findOneBy` filtré donnent 404 (« ça n'existe pas pour toi »). Le 404 ne révèle pas l'existence de la ressource ; le 403 est plus clair pour un utilisateur légitime qui s'est trompé. Choisis, et sois cohérent par application. ARENA a choisi 404 ; Venaball a choisi 403 pour les Voters. Les deux sont défendables ; l'important est de le dire.

## À retenir

- IDOR = un id accepté sans vérifier le lien avec l'utilisateur. Lecture, écriture, ou liste filtrée par le client.
- Les UUID rendent la devinette dure, pas la vérification inutile.
- Trois fermetures : Voter à chaque accès, RLS à la source, intersection avec ce que le serveur sait.
- Les IDOR se cachent dans les chemins secondaires : listeners, commandes, imports, API.
- Inclure le périmètre dans la requête (`findOneBy` avec le club) = RLS à la main.
- 403 ou 404 : une décision par app, cohérente.

## Mise en pratique

Objectif : chasser les IDOR dans Venaball par une méthode systématique, et en tester une.

1. Liste toutes les routes avec un `{id}` : `php bin/console debug:router | findstr "{id}"`. C'est ta surface d'attaque IDOR.
2. Pour chacune, ouvre le contrôleur et réponds : après le `find`, y a-t-il un `denyAccessUnlessGranted` / `#[IsGranted]` / ou une requête déjà filtrée par club ? Note dans un tableau : route, protection, oui/non/incertain.
3. Pour chaque « non » ou « incertain » : écris un test fonctionnel anti-IDOR (parcours Tests, leçon 6). S'il est rouge avec un 200, tu as une faille. Corrige avec un Voter ou une requête filtrée. Commit `fix(secu): …` + `test(secu): …`.
4. L'IDOR de liste : trouve dans `src/Controller/Api/Club/` un endpoint qui reçoit une liste d'ids (convocation, présences). Vérifie qu'il applique le motif « intersection avec l'effectif réel ». Sinon, applique-le.
5. Chemins secondaires : `dir /s /b src\EventListener src\EventSubscriber src\Command`. Pour chaque fichier qui touche un club ou une joueuse, quelle garantie que c'est le bon club ? `AutoLinkBenevoleListener` est déjà identifié ; y en a-t-il d'autres ?
6. ARENA : tente `arena.velito.fr/t/<token-inventé>` et `/api/export/<token-inventé>` → 404. Puis, staff d'une orga, tente d'ouvrir un tournoi brouillon d'une **autre** orga par son id (en local avec deux orgas de test) → 404 par RLS. Documente en commentaire dans `route.ts` pourquoi il n'y a pas de vérification explicite.

Résultat attendu : un tableau exhaustif de tes routes à id avec leur protection, au moins un test anti-IDOR de plus, et une chasse dans les chemins secondaires.
