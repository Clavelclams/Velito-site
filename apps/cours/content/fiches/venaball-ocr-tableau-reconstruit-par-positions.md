---
titre: "Lire un tableau avec un OCR : ranger chaque nombre par sa position, puis prouver la lecture avec le total officiel"
projet: "venaball"
bloc: 1
themes: ["algorithmes", "resilience", "metier"]
source: "src/Service/Ffbb/GoogleVisionOcrService.php"
date: 2026-11-18
---

## Le concept

Le résumé FFBB d'un match est un PDF avec un tableau : une ligne par joueuse, sept colonnes de nombres (points, tirs réussis par type, fautes). Google Vision le lit, mais un **OCR** rend du texte, pas un tableau. Trois défauts mesurés sur de vrais résumés le 15 et le 16/11/2026 :

- les mots reviennent dans le désordre (une colonne entière, puis une autre) ;
- une case qui contient 0 est parfois **sautée** : tous les nombres suivants glissent d'une colonne, 17 points deviennent 41 ;
- des chiffres parasites apparaissent avant le nom (un morceau de trait lu comme un 8).

```jeu
{ "type": "devine", "question": "Vision te rend la liste des mots d'une page, dans le désordre. Quelle information, en plus du texte, te permet de reconstruire le tableau ?", "reponse": "La position de chaque mot sur la page (x et y). Deux mots à la même hauteur sont sur la même ligne ; un nombre appartient à la colonne dont le centre est le plus proche de son x.", "indice": "Pense à la façon dont tu lis toi-même un tableau sans traits." }
```

La première version cherchait des motifs dans le texte (« six nombres de suite »). Elle a échoué plusieurs fois, parce qu'elle supposait que le texte était dans l'ordre. La version du 16/11 repart de la **géométrie**. Vision donne pour chaque mot sa position, ramenée entre 0 et 1.

Étape 1, les lignes : on trie les mots par hauteur `y`, et on ouvre une nouvelle ligne dès que l'écart dépasse une tolérance.

```php
// src/Service/Ffbb/GoogleVisionOcrService.php, reconstruireLignes()
usort($mots, static fn (array $a, array $b) => $a['y'] <=> $b['y']);
foreach ($mots as $m) {
    if ($yLigne === null || $m['y'] - $yLigne > $tolerance) {
        if ($courante !== []) {
            $lignes[] = $courante;
        }
        $courante = [];
        $yLigne = $m['y'];
    }
    $courante[] = $m;
}
```

Étape 2, les colonnes : la ligne d'en-tête donne le centre des sept colonnes. Si l'en-tête est mal lu, on se replie sur des constantes, parce que le résumé FFBB est un gabarit A4 fixe (`COLONNES_RESUME_FFBB`). Chaque nombre va dans la colonne la plus proche, et **une case sans nombre vaut 0**. C'est ce qui règle les cases sautées : un trou reste un trou, il ne décale plus rien.

Étape 3, la preuve. Une lecture peut être fausse sans que rien ne plante. Le PDF contient une ligne « Total Équipe » officielle. Dans `src/Service/Ffbb/FfbbResumeOcrParser.php` :

```php
$somme = array_sum(array_column($parLignes, 'points'));
if ($officielNous !== null && $parLignes !== [] && $somme === $officielNous) {
    $lignesJoueuses = $parLignes;   // lecture adoptée
} else {
    $result['warnings'][] = sprintf('Lecture par lignes non retenue : ...');
}
```

La nouvelle lecture n'est adoptée que si la somme des points des joueuses retombe **exactement** sur le total officiel. C'est un **contrôle de cohérence** (une somme de contrôle métier) : si une ligne manque ou si une valeur a glissé, les deux nombres diffèrent et la lecture est refusée, avec un message de diagnostic qui ne contient aucun nom.

```jeu
{ "type": "vraifaux", "affirmation": "Si la somme des points des joueuses est égale au total officiel, alors toutes les colonnes de toutes les joueuses sont justes.", "vrai": false, "explication": "Le contrôle ne porte que sur la colonne des points. Une faute mal rangée ne serait pas détectée. C'est une preuve forte, pas une preuve complète." }
```

Deuxième règle née des mêmes bugs : le **score du match** ne vient que des totaux officiels du PDF, jamais de la somme des joueuses. Une somme calculée sur une lecture douteuse fabriquait des scores faux.

Sans tout ça : des stats attribuées à la mauvaise joueuse, sans erreur visible, et des coachs qui cessent de croire les chiffres.

## Comment je l'explique au jury

« Un OCR me rend des mots, pas un tableau, et il saute parfois les cases à zéro. Au lieu de chercher des motifs dans le texte, j'utilise la position de chaque mot : je regroupe par hauteur pour refaire les lignes, puis je range chaque nombre dans la colonne la plus proche. Une case vide vaut zéro, donc plus rien ne se décale. Ensuite je ne fais pas confiance à ma lecture : je compare la somme des points lus au total officiel imprimé sur la feuille, et je n'enregistre que si c'est égal. J'ai mis plusieurs essais à y arriver, parce que je corrigeais mes hypothèses au lieu de regarder la sortie réelle de l'OCR. C'est l'option `--voir-lignes` de la commande, qui affiche ce que Vision renvoie vraiment, qui a débloqué le problème. »

## La question vicieuse du jury

**« Vos constantes de colonnes sont codées en dur. Que se passe-t-il si la FFBB change sa mise en page ? »**

La lecture se dégrade, mais elle ne ment pas. Les constantes ne servent que de repli quand l'en-tête est illisible. Si le gabarit change, les nombres tombent dans de mauvaises colonnes, la somme ne retombe plus sur le total officiel, la lecture par lignes est refusée et le coach voit un avertissement. Le garde-fou est le contrôle, pas les constantes.

Les limites que je connais. Le contrôle ne valide que les points : une faute ou un tir à trois points mal rangé passe. La tolérance de hauteur (0,008) et les centres de colonnes ont été mesurés sur quelques résumés U13, U15 et seniors ; les résumés U11 ne sont pas vérifiés. Et surtout, ce code n'a **aucun test automatisé** : `reconstruireLignes()` est une fonction statique pure, donc facile à tester avec une liste de mots en entrée, et je ne l'ai pas fait. C'est le premier test que j'écrirais, avec les trois cas réels qui ont cassé (case sautée, chiffre parasite, en-tête absent).
