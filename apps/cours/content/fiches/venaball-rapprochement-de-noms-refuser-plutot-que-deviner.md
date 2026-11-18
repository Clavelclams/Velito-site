---
titre: "Rapprocher un nom lu sur une feuille d'une fiche en base : mieux vaut « je ne sais pas » qu'une mauvaise réponse"
projet: "venaball"
bloc: 1
themes: ["algorithmes", "metier"]
source: "src/Service/Ffbb/FfbbResumeOcrParser.php"
date: 2026-11-18
---

## Le concept

Le résumé FFBB donne des noms écrits par la fédération et lus par un OCR : « DUPONT, Léa », parfois « DUP0NT Lea ». En base, la fiche s'appelle « Léa Dupont ». Il faut décider à quelle fiche vont les statistiques de la ligne. C'est un **rapprochement** (matching) entre un texte imparfait et une liste de personnes.

Le code compare le nom lu, normalisé (minuscules, sans accents), à chaque joueuse sous quatre formes (nom prénom, prénom nom, avec ou sans virgule), avec la **distance de Levenshtein** : le nombre minimal de lettres à ajouter, retirer ou remplacer pour passer d'un mot à l'autre.

```php
// src/Service/Ffbb/FfbbResumeOcrParser.php
$distance = min(
    levenshtein($nomNorm, $candidat1),
    levenshtein($nomNorm, $candidat2),
    levenshtein($nomNorm, $candidat3),
    levenshtein($nomNorm, $candidat4),
);

if ($distance < $bestScore && $distance <= 4) {
    $bestScore = $distance;
    $bestMatch = $j;
}
```

On garde la joueuse la plus proche, à condition que la distance ne dépasse pas 4. Au-delà, pas de rapprochement.

```jeu
{ "type": "choix", "question": "Une joueuse du résumé n'a pas de fiche en base, mais sa sœur, qui porte le même nom de famille, en a une. On ajoute une règle « si rien ne correspond, prendre la fiche qui a le même nom de famille ». Que se passe-t-il ?", "choix": ["Rien, la distance de Levenshtein protège", "La sœur reçoit les statistiques d'un match qu'elle n'a pas joué", "Une erreur 500 s'affiche", "La ligne est ignorée"], "bonne": 1, "explication": "C'est un faux positif : le programme répond avec assurance, et il se trompe. Personne ne le voit, puisque rien ne plante." }
```

Ce cas n'est pas théorique. Le 16/11/2026, pour reconnaître plus de joueuses, ce repli a été écrit et commité : « si une seule fiche du club porte ce nom de famille, c'est elle ». Or deux sœurs du club portent le même nom, et une seule avait une fiche : exactement le cas où la règle se déclenche. Elle a été retirée le jour même (commit `ab37773`), et le code porte maintenant ce commentaire : une joueuse sans fiche doit rester « non trouvée », jamais recevoir les stats d'une autre.

Il y a deux façons de se tromper dans un rapprochement, et elles n'ont pas le même coût :

- **faux négatif** : ne pas reconnaître quelqu'un qui existe. Le coach voit « joueuse non trouvée » et corrige. Gênant, visible, réparable.
- **faux positif** : attribuer à la mauvaise personne. Rien ne s'affiche. Les moyennes de deux joueuses sont fausses, et on le découvre des semaines plus tard, ou jamais.

Quand le faux positif coûte plus cher, on règle l'algorithme pour qu'il **refuse** en cas de doute, et on donne à un humain le moyen de trancher. C'est le rôle de l'écran « C'est qui ? » : chaque ligne non reconnue devient une `LigneFfbbInconnue`, et le coach de l'équipe choisit entre la rattacher à une fiche, créer la fiche, ou l'ignorer. Quand il rattache, l'orthographe exacte de la fédération est mémorisée sur la fiche (`joueur.nom_ffbb`) et testée en premier la fois suivante : une décision humaine n'est demandée qu'une fois.

```jeu
{ "type": "vraifaux", "affirmation": "Un algorithme de rapprochement est meilleur s'il reconnaît le plus de noms possible.", "vrai": false, "explication": "Il est meilleur s'il se trompe le moins sur ce qui coûte cher. Reconnaître 100 % des noms dont 5 % attribués à la mauvaise personne est pire que 90 % reconnus et 10 % renvoyés à un humain." }
```

Sans cette règle : des statistiques officielles attribuées à des mineures qui n'ont pas joué, sans aucune trace de l'erreur.

## Comment je l'explique au jury

« Pour attribuer les statistiques d'un résumé fédéral, je dois rapprocher un nom lu par OCR d'une fiche du club. J'utilise la distance de Levenshtein avec un seuil : en dessous, je rattache, au-dessus, je refuse. J'ai failli ajouter un repli sur le nom de famille seul pour améliorer le taux de reconnaissance. C'était une erreur : deux sœurs du club portent le même nom, et l'une aurait reçu les stats de l'autre sans aucun message. J'en ai tiré une règle : quand une mauvaise attribution est invisible, le programme doit préférer ne pas répondre. Les lignes non reconnues vont dans un écran où le coach tranche, et sa décision est mémorisée pour les matchs suivants. »

## La question vicieuse du jury

**« Votre seuil est à 4. Deux joueuses dont les noms diffèrent de trois lettres seront donc confondues ? »**

Oui, c'est possible, et le seuil n'a pas été calibré : 4 est une valeur choisie à l'usage, pas mesurée. Deux prénoms proches dans une même fratrie (une lettre ou deux d'écart, même nom de famille) sont à une distance inférieure à 4. Le code prend alors la plus proche des deux, ce qui est juste si l'OCR a bien lu, et faux s'il a abîmé précisément les lettres qui les distinguent. Aucun test ne couvre ce cas.

Deux protections existent, partielles. Le nom mémorisé par le coach (`nom_ffbb`) est comparé à l'identique avant tout calcul de distance, donc une joueuse déjà rattachée une fois n'est plus devinée. Et le parser charge d'abord l'effectif de l'équipe du match, puis en filet le reste du club ; je n'ai pas revérifié ligne à ligne dans quel ordre ces listes sont essayées, à relire avant le jury. Autre incohérence à corriger : le commentaire de la méthode `matchJoueurParNom()` annonce une tolérance de 3 caractères alors que le code accepte 4. Ce que j'améliorerais : un seuil proportionnel à la longueur du nom (4 lettres d'écart sur un nom de 6 lettres, c'est énorme), le refus quand deux candidates sont à égalité ou presque, et un bouton « ce n'est pas elle » pour défaire une attribution, qui n'existe pas encore.

Une remarque sur mon propre dépôt : le commentaire de code qui explique cette règle cite les vrais prénoms et nom des deux sœurs. Ce sont des mineures et le dépôt a été public. Je dois le remplacer par un exemple fictif.
