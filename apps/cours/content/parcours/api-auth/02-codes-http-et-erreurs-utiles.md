---
titre: "Codes HTTP : dire la vérité au client sans en dire trop"
parcours: "api-auth"
ordre: 2
niveau: "debutant"
duree: 15
date: 2026-09-09
---

## Le cours

Chaque réponse HTTP commence par un code à trois chiffres. C'est la première chose que l'app lit, avant le JSON. Un code juste permet au client de réagir sans deviner ; un code faux (un 200 avec `{"error": …}` dedans) force le client à parser le corps pour savoir si ça a marché.

**Les familles.** `2xx` succès. `3xx` redirection. `4xx` erreur du **client** (il a mal demandé). `5xx` erreur du **serveur** (il a mal répondu). La distinction 4/5 est la plus importante : un 4xx dit « corrige ta requête », un 5xx dit « ce n'est pas toi, réessaie plus tard ».

**Les codes que tes APIs utilisent, et ce qu'ils promettent.**

- **200 OK** — la lecture ou l'action a réussi, voici le résultat.
- **201 Created** — une ressource a été créée. Idéalement avec un en-tête `Location` vers elle.
- **204 No Content** — succès, rien à renvoyer (un `DELETE`, un `POST` d'action sans résultat).
- **400 Bad Request** — la requête est malformée : JSON invalide, champ manquant, type faux. « Email valide et mot de passe requis » sur cours est un 400 sémantique.
- **401 Unauthorized** — pas authentifié (jeton absent, expiré, invalide). Mal nommé : ça veut dire « identifie-toi ». L'app mobile réagit en renvoyant à l'écran de connexion.
- **403 Forbidden** — authentifié, mais pas autorisé. Le Voter Venaball répond ça. L'app ne doit **pas** renvoyer à la connexion : se reconnecter ne changera rien.
- **404 Not Found** — n'existe pas… ou n'existe pas *pour toi*. ARENA l'utilise à la place du 403 pour ne pas révéler l'existence d'un tournoi brouillon.
- **409 Conflict** — l'état actuel empêche l'action : créer un pseudo déjà pris, valider un match déjà validé. C'est le bon code pour une violation de contrainte unique.
- **422 Unprocessable Entity** — la requête est bien formée mais les données ne passent pas la validation métier (score négatif, date dans le passé). Plus précis qu'un 400.
- **429 Too Many Requests** — trop d'appels. Supabase Auth le renvoie sur la connexion ; cours le traite à part pour ne pas dire « identifiants invalides » et faire retaper en boucle.
- **500 Internal Server Error** — ton code a planté. Le client ne peut rien faire. **Ne jamais renvoyer un 500 pour une erreur prévue** (validation, droit) : c'est un aveu que tu n'as pas géré le cas.
- **503 Service Unavailable** — le serveur ne peut pas répondre pour l'instant (maintenance, config manquante). C'est ce que le middleware de cours devrait renvoyer quand Supabase n'est pas configuré — plutôt que laisser passer.

**Le corps d'erreur.** Un code ne suffit pas : l'app doit pouvoir afficher quelque chose. Une forme cohérente sur toute l'API :

```json
{ "error": "invalid_request", "error_description": "grant_type requis." }
```

C'est le format OAuth (RFC 6749), que le hub utilise. Un code machine (`error`) pour que l'app réagisse, un texte (`error_description`) pour l'humain. Venaball a un format proche (`{ "erreur": "…" }`). L'important : **le même format partout**, pour que l'app ait un seul gestionnaire d'erreurs.

**Dire la vérité sans en dire trop.** Un 404 sur un tournoi brouillon plutôt qu'un 403 : ne pas confirmer l'existence. « Identifiants invalides » plutôt que « email inconnu » : ne pas énumérer les comptes. Un 500 sans trace de pile : ne pas donner le plan de l'application. Le code dit la catégorie ; le corps dit ce qui aide l'utilisateur légitime ; les logs serveur ont le détail.

**Idempotence et codes.** Un renvoi d'action (parcours Venaball, `client_uid`) reçoit **le même 200** que l'original, avec un drapeau `deja: true` dans le corps. Pas un 409 : du point de vue du client, l'opération a réussi — c'est juste qu'elle avait déjà réussi. Le 409 est pour un vrai conflit qui empêche l'action.

## À retenir

- 4xx = corrige ta requête. 5xx = le serveur a planté. Jamais un 500 pour un cas prévu.
- 401 identifie-toi, 403 tu n'as pas le droit, 404 n'existe pas (pour toi). L'app réagit différemment à chacun.
- 409 conflit d'état, 422 validation métier, 429 trop d'appels, 503 service indisponible.
- Un format d'erreur unique : code machine + description humaine.
- Le code dit la catégorie, le corps aide l'utilisateur, les logs ont le détail.

## Mise en pratique

Objectif : provoquer chaque code sur tes APIs, et harmoniser le format d'erreur.

1. Sans jeton : `curl -i https://api.venaball.fr/api/club/moi` → 401. Avec un jeton bidon : 401 aussi. Avec un jeton valide d'un compte sans club : 403 ou 200 avec liste vide ? Note le choix.
2. Un `POST` avec un JSON invalide : `curl -i -X POST -H "Authorization: Bearer …" -H "Content-Type: application/json" -d '{pas du json' …/api/club/rencontres/1/saisie` → 400 attendu. Si 500 : le contrôleur ne gère pas le JSON malformé — ajoute un `try/catch` sur `json_decode` (ou `$request->toArray()` qui lève une `JsonException` à attraper).
3. Un score adverse à `-5` → devrait être 200 avec `scoreAdverse: 0` (clamp) ou 422. Lequel ? Le clamp est plus tolérant, le 422 plus strict. Documente le choix dans `API_CONTRAT.md`.
4. Hub : `curl -i -X POST https://hub.velito.fr/oauth/token -d "grant_type=inconnu"` → 400 avec `{"error":"unsupported_grant_type",…}`. C'est le format OAuth.
5. Cherche dans `src/Controller/Api/` chaque `new JsonResponse([...], 500)` ou `throw new \Exception` non attrapé. Pour chacun : est-ce un vrai plantage imprévu, ou un cas prévu qui mérite un 4xx ? Corrige les seconds.
6. Harmonise : choisis un format d'erreur (`{ "error": "code", "message": "texte" }`) et applique-le à tous les 4xx de l'API club. Documente-le en tête de `API_CONTRAT.md`. Vérifie que l'app mobile (Pirb store / club-store) lit bien ces deux clés.

Résultat attendu : chaque code provoqué et compris, aucun 500 pour un cas prévu, un format d'erreur unique documenté.
