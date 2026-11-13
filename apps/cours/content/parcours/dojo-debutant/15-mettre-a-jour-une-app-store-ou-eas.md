---
titre: "Mettre à jour une app : le store ou EAS"
parcours: "dojo-debutant"
ordre: 15
niveau: "solide"
duree: 12
date: 2026-11-13
---

## Le cours

Le 12 novembre, une joueuse t'écrit : « Je ne vois pas Mes entraînements. » Pourtant tu as publié cette nouveauté. Sur ton téléphone, elle est là.

```jeu
{ "type": "devine", "question": "Même app, même jour, et pourtant deux écrans différents. Quelle peut être la différence entre ton téléphone et le sien ?", "indice": "Regarde le numéro tout en bas de la fiche de l'app dans le store.", "reponse": "La version installée. Elle était restée en 1.0.0, et la nouveauté n'avait été envoyée qu'aux téléphones en 1.1.0." }
```

### Deux chemins pour livrer

Un site web, tu le déploies et tout le monde a la nouveauté. Une app, non : elle est **installée** dans chaque téléphone. Deux chemins pour la changer.

**Le store.** Tu fabriques une nouvelle version, Apple ou Google la contrôle, puis chacun la télécharge. Image : un nouveau maillot officiel, homologué par la fédération. Long, mais on peut tout changer.

**EAS Update.** Une mise à jour à distance : tu envoies seulement le JavaScript (les écrans, les textes, la logique), sans contrôle du store. Image : changer la tactique sur la plaquette pendant un temps mort. Rapide, mais on garde le même maillot.

```jeu
{ "type": "paires", "consigne": "Associe chaque chemin à ce qui le caractérise.", "paires": [["Le store", "Nouvelle version contrôlée par Apple ou Google"], ["EAS Update", "Le JavaScript seul, envoyé à distance"], ["Le natif", "La partie de l'app soudée au téléphone"], ["Le canal", "Le tuyau qui dit à qui part la mise à jour"]] }
```

Le **natif**, c'est ce qui touche au téléphone lui-même : une nouvelle permission, l'icône, une nouvelle brique système. Dès que le natif change, c'est le store, obligatoirement.

### L'étiquette sur le colis

Chaque mise à jour EAS porte une étiquette : « pour telle version ». C'est réglé dans `Pirb store/app.json`, et pareil dans `venaball club-store/app.json` :

```json
"version": "1.1.0",
"runtimeVersion": {
  "policy": "appVersion"
},
```

`policy: appVersion` veut dire : l'étiquette, c'est le numéro de version. Une mise à jour fabriquée en 1.1.0 ne part **que** vers les téléphones en 1.1.0.

```jeu
{ "type": "choix", "question": "Tu publies une mise à jour EAS depuis le code en 1.1.0. Le téléphone de la joueuse est en 1.0.0. Que reçoit-il ?", "choix": ["La mise à jour, comme tout le monde", "Rien : l'étiquette ne correspond pas", "Un message d'erreur", "La version 1.1.0 complète"], "bonne": 1, "explication": "Une mise à jour 1.1.0 n'est proposée qu'aux apps 1.1.0. C'est une sécurité : du JavaScript récent sur un natif ancien pourrait planter." }
```

Et pourquoi était-elle encore en 1.0.0 ? La 1.1.0 était validée par Apple, mais attendait un dernier clic humain : « Publier cette version ». Validée ne veut pas dire disponible.

```jeu
{ "type": "vraifaux", "affirmation": "Dès qu'Apple valide une version, tous les téléphones peuvent la télécharger.", "vrai": false, "explication": "Avec la publication manuelle, la version validée attend que tu cliques sur « Publier cette version »." }
```

### Envoyer, puis patienter

```powershell
eas update --channel production --message "..."
```

Le **canal** `production` est celui des apps installées depuis les stores (voir `eas.json`). Dernier piège : au premier lancement, l'app **télécharge** la mise à jour en arrière-plan. Elle ne l'**applique** qu'au lancement suivant. Il faut donc fermer et rouvrir.

```jeu
{ "type": "trous", "consigne": "Complète pour viser les apps installées depuis les stores.", "code": "eas update --channel ___ --message \"...\"", "choix": ["store", "main", "production", "1.1.0"], "bonne": 2, "explication": "Le canal s'appelle production, comme dans eas.json. Le numéro de version, lui, est lu tout seul dans app.json." }
```

### Serveur d'abord, app ensuite

« Mes entraînements » appelle une adresse de l'API. Si l'app arrive avant le serveur, elle demande une adresse qui n'existe pas encore : 404 (leçon 1).

```jeu
{ "type": "ordre", "consigne": "Remets la livraison d'une nouveauté dans l'ordre.", "etapes": ["Déployer le serveur avec la nouvelle route", "Vérifier que la route répond", "Lancer eas update sur le canal production", "Ouvrir l'app une première fois : elle télécharge", "Fermer et rouvrir l'app : la nouveauté apparaît"], "explication": "Le serveur d'abord : une app en avance sur son serveur tombe sur des 404." }
```

## À retenir

- Deux chemins : le **store** (tout, mais contrôlé) et **EAS Update** (le JavaScript seul, tout de suite).
- Si le natif change, c'est le store.
- `runtimeVersion` avec `policy: appVersion` : une mise à jour ne va qu'aux apps de la même version.
- Une version validée par Apple reste invisible tant qu'elle n'est pas publiée.
- Une mise à jour EAS se télécharge au premier lancement et s'applique au suivant.
- Toujours le serveur d'abord, l'app ensuite.

## Mise en pratique

Ouvre `Pirb store/app.json` et `Pirb store/eas.json`. Repère trois choses : la valeur de `version`, la valeur de `policy` sous `runtimeVersion`, et la ligne `channel` du profil `production`.

C'est réussi quand tu peux répondre sans regarder : « si je lance `eas update` aujourd'hui, quels téléphones la reçoivent, et au bout de combien de lancements la voient-ils ? »
