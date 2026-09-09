---
titre: "Le ballon est orange et bouge, l'arceau est orange et immobile : de la vision sans modèle"
projet: "venaball"
bloc: 1
themes: ["algorithmes", "javascript", "performance"]
source: "public/playground/vision.js (v6 → v13)"
date: 2026-09-09
---

## Le concept

Le *playground* de Venaball filme une joueuse au tir avec la caméra du téléphone et compte les paniers. La première version reposait sur un modèle de détection générique (EfficientDet-Lite, entraîné sur COCO) dont on ne gardait qu'une classe : « sports ball ». Trois plafonds durs :

1. COCO **ne connaît pas l'arceau** — d'où deux taps de calibration manuels, un contournement.
2. Le modèle **confond** un ballon avec tout ce qui est rond et clair : une tête, un genou, un plot.
3. Rien ne sait qu'un ballon en vol suit une **parabole** — la trajectoire n'est qu'une suite de points bruités.

Le fichier `vision.js` attaque les trois **sans modèle supplémentaire**, avec de la vision « à l'ancienne » : de la couleur, du mouvement, de la physique. Et l'idée centrale tient en deux lignes :

> Le ballon est orange et il bouge.
> L'arceau est orange et il est immobile.

**La couleur.** On reste en RGB — pas de conversion HSV, trop coûteuse pour des dizaines de milliers de pixels par image, et inutile ici. Un orange de basket, c'est du rouge franc, du vert moyen, du bleu faible :

```js
export function estOrange(r, g, b) {
  if (r < 90) return false;          // trop sombre : on ne devine pas
  if (r <= g + 18) return false;     // pas assez rouge par rapport au vert
  if (r <= b + 45) return false;     // pas assez rouge par rapport au bleu
  if (g + 14 < b) return false;      // rose/violet franc rejeté
  return true;
}
```

Les seuils sont **larges à dessein** : rater le ballon coûte plus cher qu'accepter des pixels douteux, le mouvement et la forme feront le tri après. Et le `g + 14 < b` est une correction de terrain du 27/07 : les arceaux rouges des paniers extérieurs n'étaient jamais détectés, parce que la règle précédente exigeait `g >= b`.

**Le mouvement.** Pendant ~1,5 s (45 images), on compte pour chaque pixel du haut de l'image le nombre de fois où il est « orange **et** immobile ». Un pixel qui l'est plus de 55 % du temps est un vote pour l'arceau. Le ballon se disqualifie tout seul en bougeant. Un `Uint16Array` de la taille de l'image suffit, et c'est là que le choix du RGB brut se paie : quelques millions de comparaisons par seconde sur un téléphone, ça passe ; une conversion HSV par pixel, non.

**La physique.** Un ballon en vol libre suit une parabole. On ajuste une parabole sur la trajectoire par **moindres carrés** ; si elle colle mal aux points, ce n'était pas un vol libre — c'était une main, un rebond, un autre ballon. La physique devient un filtre.

Et le commentaire d'en-tête dit la limite sans détour : un arceau contre un mur orange, un gymnase au néon jaune, un ballon noir et blanc — ça peut rater. Donc la détection **propose** les positions, elle ne les impose pas : la joueuse corrige si c'est faux. *Une aide qui se trompe et qu'on peut corriger vaut mieux qu'une obligation.*

## Comment je l'explique au jury

« Pour détecter le ballon et l'arceau, je ne suis pas passé par un second modèle entraîné : j'ai utilisé deux propriétés physiques. Les deux sont orange, mais l'un bouge et l'autre pas. J'accumule pendant une seconde et demie les pixels orange immobiles du haut de l'image, et ce qui reste, c'est l'arceau. Je travaille en RGB brut pour tenir la cadence sur un téléphone — une conversion HSV par pixel serait trop chère. Ensuite j'ajuste une parabole sur la trajectoire par moindres carrés : si ça ne colle pas, ce n'était pas un vol libre. Et comme ça peut rater dans certaines conditions d'éclairage, la détection propose, la joueuse corrige. »

## La question vicieuse du jury

**« Vous auriez pu entraîner un modèle sur du basket. Pourquoi bricoler des seuils de couleur ? »**

Parce qu'entraîner un modèle demande des données annotées — des milliers d'images de gymnases, de ballons, d'arceaux, sous tous les éclairages — que je n'ai pas, et un temps que je préférais mettre sur le produit. Les seuils de couleur ont un défaut évident, ils sont **fragiles à l'environnement**, mais ils ont trois qualités qu'un modèle n'a pas ici : ils tournent à 30 images par seconde sur un téléphone d'entrée de gamme sans réseau, ils sont **lisibles** — quand ça rate, je sais pourquoi et je corrige un nombre —, et ils ont pu évoluer sur retour terrain en une ligne, comme pour les arceaux rouges. Un modèle qui rate, on ne sait pas pourquoi, et on ne le corrige pas sans réentraîner. La vraie réponse est probablement hybride : le modèle générique pour trouver le ballon, mes heuristiques pour l'arceau et la trajectoire, et le modèle spécifique seulement le jour où j'aurai assez de vidéos annotées — que le playground lui-même est en train de collecter.
