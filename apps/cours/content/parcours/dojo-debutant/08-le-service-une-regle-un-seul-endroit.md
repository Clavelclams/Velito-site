---
titre: "Le service : une règle, un seul endroit"
parcours: "dojo-debutant"
ordre: 8
niveau: "intermediaire"
duree: 12
date: 2026-11-13
---

## Le cours

Mardi, la coach fait l'appel des U15. Mercredi, quelqu'un veut annuler cette séance depuis le site. Refusé. Il essaie depuis l'app. Refusé aussi, avec la même phrase.

```jeu
{ "type": "devine", "question": "Le site et l'app sont deux portes d'entrée différentes. Comment font-elles pour appliquer exactement la même règle ?", "indice": "Dans un tournoi, chaque terrain n'invente pas son règlement.", "reponse": "La règle n'est écrite ni dans le site ni dans l'app. Elle est écrite une seule fois, dans un service, et les deux portes lui posent la question." }
```

### Le spécialiste qu'on appelle

Un **contrôleur**, c'est le bout de code qui répond à une adresse. Un **service**, c'est une classe spécialisée dans un seul travail, que les contrôleurs appellent.

Image : l'arbitre. Un seul règlement pour tous les terrains. Sinon, un marcher serait sifflé ici et pas là-bas.

La règle « une séance déjà pointée n'est jamais annulée » commence par une question. Elle vit dans `src/Service/Sport/AnnulationSeanceService.php` :

```php
public function aUnAppel(Seance $seance): bool
{
    foreach ($seance->getPresences() as $p) {
        if ($p->isSaisieCoach()) {
            return true;
        }
    }
    return false;
}
```

Elle parcourt les présences. Dès qu'une ligne vient de l'appel du coach, elle répond « oui ».

### Deux portes, un seul arbitre

Le site, dans `src/Controller/Manager/SeanceController.php` :

```php
} elseif ($annulations->aUnAppel($seance)) {
```

L'API de l'app, dans `src/Controller/Api/Club/ApiClubSeanceController.php` :

```php
if ($this->annulations->aUnAppel($seance)) {
```

```jeu
{ "type": "trous", "consigne": "Complète la ligne du contrôleur web qui interroge le service.", "code": "} elseif ($annulations->___($seance)) {", "choix": ["annuler", "aUnAppel", "isAnnulee", "flush"], "bonne": 1, "explication": "Le contrôleur ne regarde pas les présences lui-même. Il pose la question au service, qui sait comment y répondre." }
```

```jeu
{ "type": "choix", "question": "Demain, la définition de « déjà pointée » change. Combien de fichiers faut-il modifier ?", "choix": ["Un seul : le service", "Deux : le contrôleur web et celui de l'API", "Trois : les deux contrôleurs et l'app"], "bonne": 0, "explication": "C'est tout l'intérêt : la règle a une seule adresse. Avec deux copies, on en corrige une et on oublie l'autre." }
```

### Le service décide, le contrôleur présente

Comment le contrôleur obtient-il le service ? Il l'écrit dans ses paramètres (`AnnulationSeanceService $annulations`) et Symfony le lui fournit. On appelle ça l'**injection de dépendances** : tu demandes l'outil, on te le tend.

```jeu
{ "type": "vraifaux", "affirmation": "Puisque la règle est la même, le site et l'API annoncent le refus de la même façon.", "vrai": false, "explication": "Même décision, deux présentations : le site affiche un bandeau d'avertissement, l'API renvoie un code 409 avec un message. Le service décide, le contrôleur présente." }
```

```jeu
{ "type": "ordre", "consigne": "Quelqu'un touche Annuler dans l'app sur une séance déjà pointée. Remets dans l'ordre.", "etapes": ["L'app envoie la demande à l'API", "Le contrôleur vérifie que tu as le droit sur cette séance", "Le contrôleur demande au service : un appel existe ?", "Le service répond oui", "Le contrôleur renvoie le refus à l'app"], "explication": "Le contrôleur reçoit, le service tranche, le contrôleur répond. Le service ne sait même pas qui l'appelle." }
```

```jeu
{ "type": "cartes", "titre": "Questions de jury", "cartes": [{ "recto": "C'est quoi un service ?", "verso": "Une classe spécialisée dans un travail, appelée par plusieurs contrôleurs." }, { "recto": "Pourquoi ne pas écrire la règle dans chaque contrôleur ?", "verso": "Deux copies finissent par diverger. Une seule règle, un seul endroit à corriger et à tester." }, { "recto": "Donne un exemple réel.", "verso": "AnnulationSeanceService : appelé par le site et par l'API de l'app Club." }] }
```

## À retenir

- Un **contrôleur** répond à une adresse ; un **service** fait un travail précis.
- Une règle métier s'écrit **une seule fois**, dans un service.
- Le site et l'API appellent le même service : même décision partout.
- Le service décide, le contrôleur choisit comment l'annoncer.
- Symfony fournit le service au contrôleur : c'est l'injection de dépendances.

## Mise en pratique

Ouvre un terminal dans `mabb-site` et lance :

```powershell
Get-ChildItem src -Recurse -Filter *.php | Select-String "aUnAppel"
```

Tu dois voir quatre lignes dans trois fichiers. Classe-les : laquelle **définit** la règle, lesquelles la **demandent** ?

C'est réussi quand tu peux dire à voix haute : « la règle est écrite dans `AnnulationSeanceService`, et le site comme l'API se contentent de l'appeler ».
