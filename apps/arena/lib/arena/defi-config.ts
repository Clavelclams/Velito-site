/**
 * Textes de l'écran du défi Overcooked 2 (17/11/2026).
 *
 * MANETTE : à VÉRIFIER SUR LA CONSOLE avant l'atelier. Joy-Con tenu à
 * l'horizontale, les boutons changent de nom selon le Joy-Con (gauche ou
 * droit) : on décrit donc le bouton par sa POSITION sur le Joy-Con tenu à
 * plat (comme les jeux Switch le font à l'écran). Pour corriger, change
 * seulement les champs `bouton` et `position` ci-dessous.
 */
export const MANETTE = {
  titre: "Ta manette",
  sousTitre: "Un Joy-Con, tenu à l'horizontale",
  commandes: [
    { action: "Se déplacer", bouton: "Stick", position: "le petit joystick" },
    { action: "Prendre / poser", bouton: "Bas", position: "le bouton du bas" },
    { action: "Couper / laver", bouton: "Gauche", position: "le bouton de gauche" },
    { action: "Foncer", bouton: "Droite", position: "le bouton de droite" },
  ],
};

export const COMMENT_ON_JOUE = {
  titre: "Comment on joue",
  etapes: [
    { mot: "PRENDS", detail: "les ingrédients" },
    { mot: "COUPE et CUIS", detail: "ce que demande la commande" },
    { mot: "ENVOIE", detail: "le plat au passe-plat" },
  ],
  regleOr: "Parlez-vous ! Organisez-vous et répartissez le travail.",
  chef: "Le chef de cuisine n'a pas de manette : il lit les commandes et donne les rôles.",
};
