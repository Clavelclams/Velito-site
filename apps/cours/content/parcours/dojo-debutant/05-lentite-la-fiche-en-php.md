---
titre: "L'entité : la fiche en PHP"
parcours: "dojo-debutant"
ordre: 5
niveau: "debutant"
duree: 12
date: 2026-11-13
---

## Le cours

Jour férié, gymnase fermé. La séance des U15 n'aura pas lieu. Tu ne veux pas la supprimer : les joueuses doivent la voir, barrée, avec la raison.

```jeu
{ "type": "devine", "question": "Pour noter qu'une séance est annulée ET pourquoi, de combien de cases as-tu besoin sur sa fiche ?", "indice": "Une case laissée vide, ça dit déjà quelque chose.", "reponse": "Une seule : le motif. Case vide = séance normale. Case remplie = séance annulée, et tu lis la raison dedans. C'est le choix fait dans Venaball le 13 novembre." }
```

### Une fiche que le code peut tenir en main

La base parle SQL, ton code parle PHP. Une **entité** fait le lien : c'est une classe PHP (un fichier) qui représente une ligne d'une table. Imagine la fiche sortie du classeur et posée sur le bureau : le code peut la lire et écrire dessus. L'outil qui fait la navette entre le bureau et le classeur s'appelle **Doctrine**.

Chaque case de la fiche est une **propriété**. Voici la nouvelle, dans `src/Entity/Sport/Seance.php` :

```php
#[ORM\Column(length: 120, nullable: true)]
private ?string $motifAnnulation = null;
```

La ligne qui commence par `#` est une étiquette pour Doctrine : « cette propriété est une colonne, du texte de 120 caractères maximum ». `nullable: true` veut dire **la case peut rester vide**. Et `null`, c'est le mot PHP pour « vide ».

```jeu
{ "type": "trous", "consigne": "Complète l'étiquette pour autoriser la case à rester vide.", "code": "#[ORM\\Column(length: 120, ___: true)]", "choix": ["empty", "nullable", "optional", "unique"], "bonne": 1, "explication": "nullable: true autorise la valeur null, donc une case vide. Sans ça, chaque séance devrait avoir un motif." }
```

### La fiche sait répondre

Une entité n'est pas qu'un tas de cases. Elle a des **méthodes** qui parlent le langage du club :

```php
public function isAnnulee(): bool { return $this->motifAnnulation !== null; }
```

« Suis-je annulée ? Oui, si ma case motif n'est pas vide. »

```php
public function retablir(): static
{
    $this->motifAnnulation = null;
    $this->fermeture = null;
    return $this;
}
```

`retablir()` vide la case : la séance redevient normale. À l'inverse, `annuler($motif)` la remplit (et écrit « Annulée » si tu n'as rien précisé).

```jeu
{ "type": "choix", "question": "Tu appelles retablir() sur une séance annulée. Que répond ensuite isAnnulee() ?", "choix": ["true", "false", "Le motif d'annulation"], "bonne": 1, "explication": "retablir() remet le motif à null. isAnnulee() regarde si le motif est différent de null : ce n'est plus le cas, donc false." }
```

### Pourquoi pas deux cases ?

On aurait pu créer une case « annulée : oui ou non » et une case « motif ». Mais deux cases peuvent se contredire : « annulée : non » avec un motif écrit, ou « annulée : oui » sans motif. Avec une seule case, la contradiction est impossible.

```jeu
{ "type": "vraifaux", "affirmation": "Une séance normale a le texte « non annulée » dans sa colonne motif_annulation.", "vrai": false, "explication": "Elle a null, c'est-à-dire rien du tout. C'est l'absence de motif qui veut dire séance normale." }
```

```jeu
{ "type": "paires", "consigne": "Relie chaque mot à son sens.", "paires": [["Entité", "La version PHP d'une ligne de table"], ["Propriété", "Une case de la fiche"], ["null", "Vide, aucune valeur"], ["nullable: true", "La case a le droit de rester vide"], ["Doctrine", "Fait la navette entre PHP et la base"]] }
```

```jeu
{ "type": "cartes", "titre": "Questions de jury", "cartes": [{ "recto": "C'est quoi une entité ?", "verso": "Une classe PHP qui représente une ligne d'une table. Doctrine la remplit depuis la base et enregistre mes changements." }, { "recto": "Pourquoi une seule colonne pour l'annulation ?", "verso": "Pour qu'aucune séance ne puisse être dans un état contradictoire : le motif vide ou rempli suffit à tout dire." }] }
```

## À retenir

- Une **entité** est la version PHP d'une ligne de table.
- Une **propriété** correspond à une colonne.
- `nullable: true` : la case peut rester vide (`null`).
- `motifAnnulation` vide = séance normale ; rempli = annulée, avec sa raison.
- Une seule colonne au lieu de deux : pas de contradiction possible.
- Les méthodes (`isAnnulee`, `annuler`, `retablir`) donnent à la fiche le vocabulaire du club.

## Mise en pratique

Ouvre `src/Entity/Sport/Seance.php` (lecture seule). Repère toutes les propriétés marquées `nullable: true` et écris pour chacune, sur une feuille, ce que veut dire « case vide » dans la vie du club (par exemple pour `dureeMinutes` ou `intitule`).

C'est réussi quand tu as au moins quatre propriétés sur ta feuille, et que tu peux expliquer sans regarder pourquoi `lieu` n'est pas dans la liste.
