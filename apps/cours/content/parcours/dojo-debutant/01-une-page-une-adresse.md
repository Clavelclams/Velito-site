---
titre: "Une page, une adresse : l'histoire du 404 de l'appel"
parcours: "dojo-debutant"
ordre: 1
niveau: "debutant"
duree: 10
date: 2026-11-13
---

## Le cours

Le 12 novembre, tu fais l'appel des U18 B sur l'iPad. Tu touches **Retour**. Et là : « 404, balle perdue ». Pourtant la page existe. Que s'est-il passé ?

```jeu
{ "type": "devine", "question": "D'après toi, que veut dire « 404 » ?", "indice": "Pense à un courrier envoyé à une adresse où personne n'habite.", "reponse": "404 = « je n'ai rien trouvé à cette adresse ». Le serveur fonctionne, mais ce que tu demandes n'existe pas, ou il a cherché au mauvais endroit." }
```

### Une adresse mène à un bout de code

Sur un site, chaque page a une **adresse**, par exemple `/seances/42`. Le site garde une liste : « telle adresse, tel bout de code ». Une ligne de cette liste s'appelle une **route**.

Pense au gymnase : la route, c'est le panneau sur la porte. « Vestiaire 2 », et tu sais qui est derrière.

Dans Venaball, une route s'écrit juste au-dessus du code qu'elle déclenche :

```php
#[Route('/seances/{id}', name: 'manager_seance_show')]
public function show(Seance $seance): Response
```

`{id}` est un trou : il accepte n'importe quel numéro. `/seances/42` ouvre la séance numéro 42.

```jeu
{ "type": "trous", "consigne": "La coach veut ouvrir la séance numéro 7. Complète l'adresse.", "code": "https://club.venaball.fr/seances/___", "choix": ["id", "7", "{7}", "show"], "bonne": 1, "explication": "{id} n'est qu'un emplacement dans la route. Dans la vraie adresse, on met le numéro lui-même." }
```

### Le bug : deux panneaux identiques

Dans `mabb-site`, deux fichiers posaient le **même panneau** `/seances/{id}` :

- `SeanceController.php` : la fiche d'un entraînement ;
- `ManagerContenuSeanceController.php` : la fiche d'un exercice de la bibliothèque.

Symfony lit les fichiers dans l'ordre alphabétique et garde le premier panneau qu'il trouve.

```jeu
{ "type": "choix", "question": "Entre « ManagerContenuSeanceController » et « SeanceController », lequel vient en premier dans l'alphabet ?", "choix": ["SeanceController", "ManagerContenuSeanceController", "Les deux en même temps"], "bonne": 1, "explication": "M vient avant S. La bibliothèque gagnait donc toujours : /seances/42 cherchait un exercice numéro 42, n'en trouvait pas, et répondait 404." }
```

### La réparation : changer un panneau

Une seule ligne a suffi. La bibliothèque a déménagé :

```php
#[Route('/bibliotheque', name: 'manager_seances_')]
```

Plus de doublon : `/seances/42` retrouve la fiche de l'entraînement.

```jeu
{ "type": "ordre", "consigne": "Remets l'enquête dans l'ordre où elle s'est passée.", "etapes": ["Le bouton Retour affiche un 404", "On cherche quel code répond à /seances/{id}", "On trouve deux contrôleurs avec la même adresse", "On déplace la bibliothèque sous /bibliotheque", "On vérifie que Retour ouvre bien la séance"], "explication": "Constater, chercher, trouver la cause, corriger, vérifier. C'est le même ordre pour presque tous les bugs." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Pendant ce bug, les appels enregistrés étaient perdus.", "vrai": false, "explication": "L'enregistrement passait par une autre adresse, /seances/{id}/pointage, qui n'était pas en double. Seule la page affichée après tombait en 404." }
```

## À retenir

- Une **route** relie une adresse à un bout de code.
- `{id}` est un emplacement : la vraie adresse contient un numéro.
- **404** veut dire « rien trouvé à cette adresse », pas « le site est en panne ».
- Deux routes identiques : la première lue gagne, l'autre devient invisible.
- Un bug se traite toujours dans le même ordre : constater, chercher, corriger, vérifier.

## Mise en pratique

Ouvre un terminal dans `mabb-site` et lance :

```powershell
php bin/console debug:router | Select-String "seance"
```

Repère la ligne `manager_seance_show` et la ligne `manager_seances_index`.

C'est réussi quand tu peux dire à voix haute, sans regarder : « la première répond à `/seances/{id}`, la seconde à `/bibliotheque/`, et avant le 12/11 elles répondaient à la même adresse ».
