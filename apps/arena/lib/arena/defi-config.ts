/**
 * Textes de l'écran du défi Overcooked 2 (17/11/2026), alignés sur le kit
 * imprimé de l'atelier (« Kit atelier Overcooked 17 nov ») : l'écran et les
 * affiches disent exactement la même chose, avec les mêmes couleurs de
 * boutons.
 *
 * MANETTE : Joy-Con tenu à l'horizontale, à deux mains. Les boutons sont
 * décrits par leur COULEUR (celle du kit) et leur POSITION. Pour corriger,
 * change seulement `position` (Haut, Bas, Gauche, Droite) et `couleur`.
 */
export const MANETTE = {
  titre: "Ta manette",
  sousTitre: "Joy-Con tenu à l'horizontale, à deux mains",
  commandes: [
    { action: "Se déplacer", detail: "Le stick · on le pousse dans la direction voulue", position: "Stick", couleur: "#1F3B63" },
    { action: "Prendre / poser", detail: "Bouton vert (à droite) · un ingrédient, une assiette", position: "Droite", couleur: "#3FA04B" },
    { action: "Couper", detail: "Bouton orange (en haut) · reste appuyé devant la planche", position: "Haut", couleur: "#F08A24" },
    { action: "Foncer", detail: "Bouton bleu (en bas) · un petit sprint", position: "Bas", couleur: "#2D5B8C" },
  ],
  inutile: "Le bouton gris ne sert pas pour l'atelier. Si tu bloques, demande à l'animateur !",
};

export const COMMENT_ON_JOUE = {
  titre: "Comment on joue ?",
  etapes: [
    { mot: "PRENDS", detail: "l'ingrédient" },
    { mot: "COUPE, CUIS", detail: "sur la planche, dans la poêle" },
    { mot: "ENVOIE", detail: "le plat commandé" },
  ],
  regleOr: "PARLEZ-VOUS !",
  regleOrDetail: "Organisez-vous et répartissez le travail",
  chef: "Le chef de cuisine n'a pas de manette : il lit les commandes en haut de l'écran et dit qui fait quoi.",
};
