---
titre: "C'est quoi une API REST : des URL, des verbes, du JSON"
parcours: "api-auth"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Ton app mobile Venaball n'a pas de base de données. Elle demande tout au serveur : « qui suis-je ? », « mes équipes ? », « enregistre ce panier ». Ces demandes passent par une **API** — une interface pour programmes, pas pour humains. Là où le site web renvoie du HTML pour un navigateur, l'API renvoie du **JSON** pour une app.

**REST, en quatre idées.**

1. **Tout est une ressource, identifiée par une URL.** `/api/club/equipes` = la collection des équipes. `/api/club/rencontres/42` = la rencontre 42. `/api/club/rencontres/42/orga` = l'organisation de cette rencontre. L'URL **nomme** une chose ; elle ne décrit pas une action.

2. **Le verbe HTTP dit ce qu'on fait.** `GET` lit (sans rien modifier — jamais). `POST` crée, ou déclenche une action. `PUT`/`PATCH` modifient (entier / partiel). `DELETE` supprime. `GET /api/club/rencontres` = « donne-moi les rencontres ». `POST /api/club/missions/17/confirmer` = « confirme la mission 17 ». Le verbe est dans la **méthode**, pas dans l'URL — on n'écrit pas `/api/getRencontres`.

3. **Le corps est du JSON.** Une requête `POST` envoie `{ "scoreAdverse": 34 }` ; la réponse est `{ "succes": true, "scoreAdverse": 34 }`. Structuré, lisible, natif en JavaScript, trivial en PHP (`json_decode`).

4. **Sans état.** Chaque requête porte **tout** ce qu'il faut pour être traitée — notamment l'identité de l'appelant (leçon 4). Le serveur ne « se souvient » pas de la requête précédente. C'est ce qui permet d'avoir plusieurs serveurs derrière une même API : n'importe lequel peut répondre.

**Regarde tes routes.**

```php
#[Route('/api/club/moi', methods: ['GET'])]                                   // qui suis-je
#[Route('/api/club/equipes', methods: ['GET'])]                               // collection
#[Route('/api/club/rencontres/{id}/orga', methods: ['GET'], requirements: ['id' => '\d+'])]
#[Route('/api/club/rencontres/{id}/orga/placer', methods: ['POST'])]         // action
#[Route('/api/club/orga/affectations/{aid}/valider', methods: ['POST'])]     // action
```

Ressources imbriquées (`rencontres/{id}/orga`), verbes explicites, `requirements: ['id' => '\d+']` qui refuse un id non numérique **avant** d'entrer dans le contrôleur. Les actions métier (`valider`, `rejeter`, `confirmer`) sont des `POST` sur une sous-ressource : c'est le compromis pragmatique quand une action ne se réduit pas à « modifie ce champ ».

**Le contrat.** Une API est un **contrat** entre le serveur et ses clients : ces URL, ces verbes, ces formats de JSON. Changer le contrat casse les clients — et l'app mobile installée sur des téléphones ne se met pas à jour instantanément. D'où : on **ajoute** des champs, on n'en retire pas ; on **ajoute** des routes, on ne les renomme pas ; et si on doit vraiment casser, on versionne (`/api/v2/…`) et on garde `/api/v1` le temps que les clients migrent. `format: "arena-export-v1"` dans l'export ARENA est un début de version.

**Le même serveur, deux façades.** Venaball sert du HTML (Twig) sur `manager.mabb.fr` et du JSON sur `api.venaball.fr`. `ConvocationManager` est partagé : la logique métier est **la même**, seuls les contrôleurs diffèrent — l'un traduit un formulaire, l'autre du JSON. C'est l'architecture qui rend l'API possible sans dupliquer les règles.

**Ce que REST n'impose pas.** Le format des erreurs, la pagination, le filtrage, l'authentification. Chaque API décide. On verra les codes HTTP (leçon 2), la conception (leçon 3), l'auth (leçons 4–7).

## À retenir

- Ressource = URL (un nom). Action = verbe HTTP (GET lit, POST crée/agit, PATCH modifie, DELETE supprime).
- Corps en JSON. Sans état : chaque requête est autonome.
- Une API est un contrat : on ajoute, on ne retire pas ; on versionne si on casse.
- Deux façades (HTML, JSON), une logique métier partagée.

## Mise en pratique

Objectif : appeler ton API à la main, et lire le contrat qu'elle expose.

1. `php bin/console debug:router | findstr "/api/"` sur Venaball. Liste chaque route avec sa méthode. Classe-les : lecture (GET), création/action (POST), modification, suppression. Y a-t-il un GET qui modifie quelque chose ? (Il ne doit pas.)
2. Obtiens un jeton d'API (via l'app, ou `POST /api/auth/login` avec un compte de test — leçon 5 pour le détail). Puis `curl -H "Authorization: Bearer <jeton>" https://api.venaball.fr/api/club/moi` (ou l'instance MABB). Lis le JSON : c'est ce que l'app reçoit.
3. `curl -H "Authorization: Bearer <jeton>" …/api/club/equipes` puis une rencontre précise `…/api/club/rencontres/<id>/orga`. Observe la structure : les clés, les types, ce qui est imbriqué.
4. Casse le contrat : `…/api/club/rencontres/abc/orga` → 404 (le `requirements: \d+` a refusé avant le contrôleur). `…/api/club/rencontres/999999/orga` → 404 aussi (n'existe pas, ou pas de ton club). Deux 404 pour deux raisons.
5. ARENA : `curl https://arena.velito.fr/api/export/<token-public>` → le JSON d'export. Repère `format: "arena-export-v1"`. Écris en 3 lignes ce que tu ferais le jour où tu voudrais ajouter un champ (rien de spécial) vs renommer un champ (v2).
6. Écris le contrat de `/api/club/moi` dans un fichier `instruction/API_CONTRAT.md` : méthode, auth requise, réponse JSON avec le type de chaque clé. C'est le début de la documentation que l'app mobile devrait avoir.

Résultat attendu : tu as appelé ton API avec `curl`, tu sais lire une route Symfony comme un contrat, et tu as documenté un endpoint.
