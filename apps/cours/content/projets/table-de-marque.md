---
titre: "Table de marque UNSS (maquette VENA)"
avancement: 30
statut: "en cours"
maj: 2026-10-10
---

## C'est quoi

Une feuille de match numérique pour les compétitions UNSS, faite par VENA (ma SASU) : le prof ou un jeune officiel tient la table de marque sur une tablette, au bord du terrain, sans réseau. Quatre sports : basket, handball, futsal et volley. L'app gère l'émargement des élèves, la certification des listes par les profs, la saisie du match (points, fautes, temps morts, changements, sets), puis la clôture : signatures au doigt, verrouillage, PDF de la feuille officielle et fichier de sauvegarde JSON.

C'est une **maquette** : données fictives (`js/data.js`), aucun serveur. Elle est en ligne sur `https://tabledemarque.velito.fr` pour être montrée à l'UNSS. Le cahier des charges (V0.4) et une fiche de présentation sont rédigés, le rendez-vous avec l'UNSS est à venir. Les modèles de feuilles UNSS ont été repris de services départementaux : la version nationale reste à confirmer.

Le code source est dans `Documents/maquette/emarque-unss/` (pas de dépôt git).

## Comment c'est construit

**Stack** : HTML + JavaScript vanilla en modules ES (`<script type="module" src="js/app.js">`), Tailwind par le CDN, aucun build, aucune dépendance npm. Hébergé comme site statique sur l'hébergement mutualisé OVH de velito.fr (multisite).

**État** (`js/store.js`) : tout l'état de l'app tient dans un objet. On ne le modifie que par `dispatch(action)`, qui appelle un réducteur pur `reduire(etat, action)`, sauvegarde le résultat dans le `localStorage` puis prévient les écrans abonnés. Les actions de match (`MATCH_...`) sont traitées dans `js/match.js`.

**Le match est un journal** : une liste d'événements numérotés par `seq`. Le score, les fautes, les temps morts, qui est sur le terrain, la rotation au volley : rien de tout ça n'est stocké, tout est recalculé en relisant la liste (`js/moteurs/journal.js`, `chrono.js`, `sets.js`).

**Deux moteurs, une config par sport** : `js/sports.js` décrit chaque sport comme un objet (famille `chrono` ou `sets`, périodes, fautes, boutons d'événements). Les écrans ne connaissent aucun sport en dur.

**Hors ligne** : `sw.js` met en cache tous les fichiers de l'app et le script Tailwind du CDN à l'installation, puis sert tout depuis le cache.

**Clôture** : signature dessinée sur un `<canvas>` (`js/signature.js`), empreinte SHA-256 du contenu du match au verrouillage (`js/empreinte.js`), PDF par `window.print()` sur un gabarit de feuille officielle (`js/ui/gabarits/`).

## Les décisions techniques et POURQUOI

- **2026-10-10 : Annuler = ajouter un événement** (`js/moteurs/journal.js`) : une feuille de match est un document officiel, on ne doit rien effacer. Une annulation est un événement `annulation` qui vise un autre événement ; une correction est une annulation plus un nouvel événement qui garde la place d'origine (`ordre`), indispensable au volley où l'ordre des points décide du service.
- **2026-10-10 : L'ordre vient de `seq`, pas de l'horloge** (`js/match.js`, fonction `ajouter`) : deux taps dans la même milliseconde ou une horloge de tablette fausse ne doivent pas mélanger les actions.
- **2026-10-10 : Réducteur pur, l'heure fournie par l'action** (`js/store.js`, `js/match.js`) : `maintenant` arrive dans l'action, donc les moteurs sont testables sans navigateur.
- **2026-10-10 : Chrono stocké `{ periode, ecouleMs, demarreA }`** (`js/moteurs/chrono.js`, `js/horloge.js`) : le temps affiché est recalculé depuis l'horloge réelle, il reste juste après un rechargement ou une mise en veille. Bug corrigé en route : `demarreA: 0` est falsy, d'où le test `!= null` dans `chronoEnMarche`.
- **2026-10-10 : Deux moteurs et une config par sport** (`js/sports.js`) : ajouter un sport d'une famille existante = ajouter un objet, sans toucher aux écrans.
- **2026-10-10 : Empreinte SHA-256 au verrouillage** (`js/empreinte.js`) : imprimée sur la feuille, elle permet de montrer plus tard que le contenu n'a pas changé. Repli FNV-1a si `crypto.subtle` est absent (hors https), signalé par le préfixe `simple:`.
- **2026-10-10 : Service worker « cache d'abord »** (`sw.js`) : au gymnase il n'y a souvent pas de réseau. Contrepartie : il faut augmenter `VERSION_CACHE` à chaque modification, sinon les tablettes gardent l'ancienne version.

## État d'avancement honnête

Ce qui marche dans la maquette : émargement et certification, feuille de match pour les quatre sports, annulation et correction, chrono qui survit au rechargement, clôture avec signatures, verrouillage, PDF et export JSON, fonctionnement hors ligne une fois la page chargée une première fois en https.

Ce qui n'existe pas ou reste fragile :
- **Aucun serveur** : l'envoi des résultats et l'archivage n'existent pas. Tout vit dans le `localStorage` d'une tablette ; l'export JSON est la seule copie de secours.
- **Aucun test dans le dossier** : les moteurs ont été testés en Node dans une sandbox pendant la session (20 tests chrono et changements, 12 volley), mais ces tests n'ont pas été gardés. Rien ne protège contre une régression.
- **Changement de format = données perdues** : dans `js/store.js`, `charger()` renvoie un état vide si `version` ne correspond plus. Un passage de `VERSION = 2` à 3 effacerait les matchs en cours sur les tablettes.
- **`REINITIALISER` efface tout**, y compris les feuilles verrouillées (`js/store.js`, bouton dans `js/gestes.js`, protégé par un simple `confirm`). Acceptable pour une démo, pas pour un vrai usage.
- **L'empreinte ne prouve rien seule** : elle est stockée à côté des données qu'elle protège, sans clé ni horodatage externe, et aucun code ne la revérifie.
- **Règles à valider** : les valeurs de `js/sports.js` sont marquées « À VÉRIFIER avec le règlement UNSS », comme la liste des signatures obligatoires dans `js/match.js`.
- **Tailwind par le CDN de développement** en production, mis en cache en mode `no-cors`.

## Prochaines étapes

1. Remettre les tests des moteurs dans le dossier (`node --test` suffit, sans dépendance) avant toute nouvelle modification.
2. Préparer le rendez-vous UNSS : faire valider les règles par sport, les signatures obligatoires et le modèle de feuille national.
3. Écrire une migration de l'état local (v2 vers v3) au lieu de repartir de zéro, et protéger les feuilles verrouillées de `REINITIALISER`.
4. Spécifier le serveur : envoi des feuilles verrouillées, archivage, et vérification de l'empreinte côté serveur.
5. Remplacer le CDN Tailwind par un CSS compilé et livré avec l'app.
