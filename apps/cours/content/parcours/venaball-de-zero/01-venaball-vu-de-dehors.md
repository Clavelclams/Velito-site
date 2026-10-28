---
titre: "Venaball vu de dehors : qui l'utilise et pour quoi faire"
parcours: "venaball-de-zero"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-10-04
---

## Le cours

Avant d'ouvrir le moindre fichier de code, on va faire ce que ferait un nouveau bénévole qui arrive au club : regarder qui fait quoi. Aucune ligne de code dans cette leçon. Si tu ne sais pas expliquer à ta grand-mère à quoi sert Venaball, le jury ne t'écoutera pas sur le reste.

### Le point de départ : un club de basket

Venaball est né dans un vrai club : l'Amiens Métropole Basket Ball, qu'on appelle **MABB**. Un club de basket, c'est une petite entreprise faite surtout de bénévoles. Il y a des équipes par âge (U11, U13, U15...), des entraînements chaque semaine, des matchs le week-end, des licences à gérer, de l'argent qui entre et qui sort.

Avant Venaball, tout ça vivait dans des classeurs, des fichiers Excel, des groupes WhatsApp et la mémoire de la secrétaire. Le but du projet : mettre tout ça au même endroit.

Une **application**, pour cette leçon, c'est simplement un outil sur écran (ordinateur ou téléphone) qui aide quelqu'un à faire une tâche. On verra en leçon 2 ce que c'est techniquement.

### Les personnes du club, et ce que chacune fait dans Venaball

Dans le code, chaque personne a un ou plusieurs **rôles** dans un club. Un rôle, c'est une étiquette qui dit "cette personne est coach dans ce club" ou "cette personne est parent dans ce club". La liste officielle est écrite dans `src/Entity/Core/UserClubRole.php` : DIRIGEANT, COACH, STAFF, JOUEUR, PARENT, BENEVOLE, EMPLOYE, TRESORIER, SECRETAIRE, RESPONSABLE_OTM, SERVICE_CIVIQUE. Onze rôles. Voici ce que font les principaux, avec ce que le doc maître `instruction/00_ECOSYSTEME.md` (§2.2) dit qu'ils trouvent dans l'outil.

- **Le dirigeant** (le président, le bureau). Il valide les demandes d'entrée dans le club, gère les utilisateurs, crée les équipes, bascule d'une saison à l'autre. C'est lui qui a les droits les plus larges dans son club.
- **La secrétaire.** Elle tient le classeur des licences : dossiers de licence, pré-inscriptions, secteurs, imports depuis FBI (le logiciel de la fédération). Venaball a une partie "secrétariat" pour elle.
- **Le trésorier.** Opérations, cotisations, notes de frais, subventions : c'est la partie trésorerie.
- **Le coach.** Il voit ses équipes, fait l'appel à l'entraînement (le pointage des présences), convoque ses joueuses pour le match, saisit les statistiques en direct pendant le match (les "Stats Live"), remplit les bilans de compétences.
- **Le bénévole et le responsable OTM.** OTM veut dire "officiels de table de marque" : les personnes qui tiennent la feuille de match, le chrono, le tableau des 24 secondes. Le week-end, il faut placer quelqu'un à chaque poste. Venaball gère cette organisation du week-end : postes, missions, candidatures, affectations.
- **Le parent.** Il est rattaché à sa fille joueuse, reçoit les convocations, peut répondre.
- **La joueuse.** Elle voit ses convocations, ses stats de saison et de match, sa carte de tirs, ses badges, et peut s'entraîner au tir et au dribble avec le "Playground" (des jeux qui utilisent la caméra du téléphone).

Retiens une idée importante : **une même personne peut avoir plusieurs rôles**. Un papa peut être parent ET bénévole à la table de marque ET coach des U11. Le code le permet parce que les rôles sont des lignes séparées, une par rôle et par club.

### Les espaces : où chacun se connecte

Venaball n'est pas un seul écran. C'est plusieurs "portes d'entrée", chacune pour un public. On les appelle les **espaces**.

1. **La vitrine du club** (`mabb.fr`). C'est le site public du MABB : actualités, équipes, galerie, contact, pré-inscription. N'importe qui peut la lire, sans compte.
2. **Le Manager**, l'outil du staff (`manager.mabb.fr` pour le MABB, `club.venaball.fr` pour la version vendue aux autres clubs). C'est là que travaillent dirigeant, secrétaire, trésorier, coachs, bénévoles. C'est de loin la plus grosse partie : le doc maître compte 44 contrôleurs et 213 routes rien que pour lui.
3. **L'espace joueuse web** (`pirb.mabb.fr` pour le MABB, `app.venaball.fr` côté Venaball). La joueuse s'y connecte depuis un navigateur.
4. **Deux applications mobiles**, à installer sur téléphone :
   - l'app joueuse, nommée **"Venaball"** (code dans le dossier `Pirb store`) ;
   - l'app staff, nommée **"Venaball Club"** (code dans le dossier `venaball club-store`), avec une vue par rôle : direction, coach, bénévole, parent.

Ces deux apps ne sont pas encore publiées sur les stores (état au 01/10/2026 dans `00_ECOSYSTEME.md` §9.1). Il faut le savoir et le dire honnêtement.

Il existe aussi `venaball.fr`, un petit site statique de présentation du produit, avec les pages légales déclarées aux stores. Il ne fait pas partie du dossier `mabb-site`.

Voici la carte, à recopier sur une feuille :

```
                          LE SERVEUR (dossier mabb-site, un seul code)
   +-----------------------------------------------------------------------+
   |                                                                       |
   |  Vitrine        Manager / Club         Espace joueuse     API         |
   |  mabb.fr        manager.mabb.fr        pirb.mabb.fr       /api/pirb/* |
   |  (public)       club.venaball.fr       app.venaball.fr    /api/club/* |
   |                 (staff)                (joueuse, web)                 |
   +-----------------------------------------------------------------------+
         ^                 ^                      ^                ^   ^
         |                 |                      |                |   |
    visiteur         dirigeant, coach,        joueuse sur      app      app
                     secrétaire, bénévole     navigateur      "Venaball" "Venaball Club"
                                                              (joueuse)  (staff, parent)
```

### Les noms : pourquoi il y en a autant

C'est le point qui embrouille tout le monde, toi compris, alors on le pose une fois pour toutes.

- **MABB Manager** : le nom historique de l'outil staff du club MABB.
- **Venaball Club** : le même outil, sous la marque Venaball, proposé à d'autres clubs.
- **PIRB** : le nom historique de l'espace joueuse. Le doc maître explique que "le nom Pirb est historique" et que le produit s'appelle Venaball partout. Mais le code a gardé `pirb` dans les adresses (`/api/pirb/*`), dans les dossiers (`src/Controller/Pirb`, `src/Entity/Pirb`) et dans le nom du dossier `Pirb store`.
- **Venaball** : le nom du produit pour la joueuse, et le nom général du projet.

Le fichier `src/Service/MarqueResolver.php` le dit noir sur blanc dans son commentaire : "une application, deux identités". Selon l'adresse tapée dans le navigateur, le même code affiche "MABB Manager" ou "Venaball Club", avec un logo et des couleurs différents. Et si l'adresse n'est pas reconnue, il retombe volontairement sur MABB Manager.

### Un seul code, deux instances

Voilà la phrase la plus importante de la leçon : **il n'y a qu'un seul code, mais il tourne à deux endroits**.

Une **instance**, c'est une copie du même programme installée sur un serveur, avec sa propre base de données. Imagine le même règlement intérieur photocopié pour deux clubs différents : le texte est identique, mais chaque club a son propre classeur de licenciés.

D'après `00_ECOSYSTEME.md` §2.1 :

- **Instance MABB**, chez l'hébergeur OVH (machine "cluster102"). Domaines `mabb.fr`, `manager.mabb.fr`, `pirb.mabb.fr`. Données réelles du club, dont des joueuses mineures. Cet hébergement ferme le 22/10/2026 : la migration vers l'autre instance est sur le chemin critique.
- **Instance Venaball**, chez OVH aussi (machine "cluster100"). Domaines `club.venaball.fr`, `api.venaball.fr`, `app.venaball.fr`. Pour l'instant vierge, avec un club de démonstration.

L'instance Venaball est **multi-club** : plusieurs clubs peuvent y vivre côte à côte, chacun ne voyant que ses données. Comment le code garantit ça, c'est la leçon 11.

### Ce qui n'est pas fini

Un bon développeur connaît les limites de son produit. Le doc maître liste des points cassés ou incomplets côté Manager (par exemple : pas de vérification d'e-mail à l'inscription, peu de notifications, pas de pagination) et le fait qu'aucune des deux apps n'est encore sur les stores. On y reviendra en leçon 17. Pour l'instant, retiens juste que tu ne présentes pas un produit fini, mais un produit en production pour un club, en cours d'ouverture à d'autres.

### Ce que tu dis au jury

"Venaball est né d'un besoin réel : le club de basket MABB gérait tout avec des classeurs, Excel et WhatsApp. J'ai construit un seul code Symfony qui sert plusieurs espaces : une vitrine publique, un outil pour le staff, un espace joueuse sur le web, et une API pour deux applications mobiles. Ce même code tourne en deux instances, une pour le MABB et une multi-club sous la marque Venaball, chacune avec sa base. Les droits reposent sur onze rôles par club, et une personne peut en cumuler plusieurs, par exemple parent et bénévole. Les deux apps mobiles ne sont pas encore publiées, c'est mon prochain jalon."

## À retenir

- Venaball vient d'un vrai club, le MABB, et remplace classeurs, Excel et groupes de messages.
- Onze rôles existent (`src/Entity/Core/UserClubRole.php`) et une personne peut en avoir plusieurs.
- Quatre espaces sur le serveur : vitrine, Manager/Club, espace joueuse web, API pour deux apps mobiles.
- MABB Manager devient Venaball Club, PIRB devient Venaball ; le mot `pirb` reste dans le code par histoire.
- Un seul code, deux instances (MABB et Venaball), chacune avec sa propre base de données.

## Mise en pratique

Prends une feuille blanche, sans regarder la leçon.

1. Dessine les quatre espaces du serveur et les deux apps mobiles, avec leurs adresses.
2. Pour chaque rôle (dirigeant, secrétaire, trésorier, coach, bénévole, parent, joueuse), écris une tâche réelle qu'il fait dans Venaball.
3. Ouvre ensuite dans VS Code `mabb-site/src/Entity/Core/UserClubRole.php`, retrouve la liste `ROLES_DISPONIBLES` et compare avec ta feuille : quels rôles avais-tu oubliés ?
4. Ouvre `mabb-site/src/Service/MarqueResolver.php` et lis le commentaire du haut. Explique à voix haute, en une minute, pourquoi le même code affiche deux noms différents.

C'est réussi quand tu peux expliquer en deux minutes, sans notes, qui utilise Venaball, par quelle porte, et pourquoi il y a deux instances.
