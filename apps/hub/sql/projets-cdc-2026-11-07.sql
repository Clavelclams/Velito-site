-- ============================================================================
-- HUB VELITO : Projets, chargement des CDC (07/11/2026)
-- ----------------------------------------------------------------------------
-- La page /projets affichait « Pas encore de CDC » partout alors que les CDC
-- existent en local (PDF, docx, md). Chaque texte ci-dessous est une version
-- condensée et fidèle du CDC source (indiqué en première ligne), réécrite au
-- format que la page sait afficher : titres #, listes -, paragraphes.
-- Données personnelles et secrets retirés.
--
-- Idempotent et prudent : un CDC n'est écrit QUE si la colonne est vide.
-- Un CDC déjà saisi ou corrigé sur le site n'est jamais écrasé.
-- Table de marque UNSS : volontairement absente (projet confidentiel).
-- Texte entre $cdc$ ... $cdc$ (dollar quoting) : pas d'apostrophe à doubler.
-- ============================================================================

begin;

-- venaball (13852 caractères)
update shared.projets set cdc = $cdc$Source : CDC_FONCTIONNEL_MABB_ECOSYSTEME_v1.pdf (Cahier fonctionnel V1, juin 2026, partie 5 « pirb.mabb.fr, l'espace personnel » et règles mineures/RGPD de l'annexe), CDC_PIRB_Training_V1.pdf (V1, juillet 2026, document de cadrage), Pirb store/CLAUDE.md et Pirb store/README.md (non datés), mabb-site/instruction/00_ECOSYSTEME.md (document maître créé le 29/09/2026, section 3 état au 21/09, section 9.1 bloc B état au 01/10/2026).

# Venaball : cahier des charges condensé de l'app joueuse

Auteur : Clavel NDEMA MOUSSA (VENA, alternance CDA, jury avril 2027).

## Objet et contexte

Venaball est l'app mobile de l'espace joueuse de l'écosystème MABB / Venaball. Elle s'appelait PIRB (Player Individual Report Basketball) : le nom est historique, il reste dans le code (routes /api/pirb/, namespaces, sous-domaine pirb.mabb.fr, nom du dossier « Pirb store »), mais le produit s'appelle Venaball partout. La marque PIRB désigne aujourd'hui un autre produit de scouting, distinct de cette app.

Le CDC fonctionnel de juin 2026 décrit l'espace joueuse comme le « réseau social interne » du club, inspiré des profils Facebook / Instagram mais centré sur le basket : suivre sa pratique (agenda, convocations, bilans, stats, profil public). Les données viennent de ce que le club saisit dans Manager (effectif, calendrier, feuilles de match, bilans).

Le CDC Training de juillet 2026 ajoute une brique mobile d'entraînement par la caméra (dribble et tir), inspirée de HomeCourt et Ball.ai, aujourd'hui appelée Playground. Son positionnement est explicite : ne pas rivaliser sur la vision pure, mais compléter la donnée club (stats validées par un vrai coach, profil rattaché à un vrai club, gamification adossée à de vrais matchs).

Le serveur est l'application Symfony 7.4 du dépôt mabb-site, multi-club, avec deux instances : MABB (Amiens Métropole Basket Ball) et Venaball.

## Public

- Joueuses licenciées d'un club, dont de nombreuses mineures (U11 à U18 citées par le CDC Training).
- Parents d'une joueuse mineure : le CDC fonctionnel prévoit un accès à l'espace de l'enfant, une vue agrégée si plusieurs enfants, l'approbation parentale des déplacements et le paiement des cotisations.
- Le staff n'est pas la cible : il a l'app « Venaball Club » et le Manager web.

## Périmètre fonctionnel

### Accueil et profil

- Accueil (le « mur ») : prochaines convocations avec réponse directe, prochaines séances, dernière actu de l'équipe, dernières stats, notifications récentes, accès au profil public.
- Profil public : photos, équipe, poste, maillot, bio, highlights, stats, matchs, équipes, récompenses, coachs.
- Confidentialité du profil : public, club seulement ou privé.
- Profil personnel : informations, mot de passe, photo, préférences de notification, export des données et suppression du compte.
- État actuel de l'app : onglet Profil (avatar, compteurs, bio, attributs, stats express, badges, déconnexion) et écran d'édition avec bio et 6 bascules « qui voit quoi » ; prénom et club seulement affichés, profil privé par défaut.

### Stats et shot chart

- Stats de la saison en cours, détail par match (points, fautes, rebonds, passes, minutes), comparaison avec la moyenne de l'équipe et avec les saisons passées, records personnels.
- Shot chart personnel : carte du terrain avec zones et pourcentages de réussite.
- État actuel : onglet Stats avec saisons, cartes, points FFBB comparés au Live, zone chaude et shot chart en SVG ; shot chart web complet servi en WebView par connexion à ticket court. Le bloc B prévoit le terrain marqué/raté avec la source EASYSTATS (fait, à builder) et l'affichage du bloc « Hors compétition ».

### Convocations, agenda et présences

- Liste des convocations à venir, détail (match, adversaire, lieu, heure, transport), réponse Présente / Absente / Incertaine avec motif optionnel, liste des autres convoquées, rappel J-1, historique des réponses.
- La réponse est visible en direct par le coach côté Manager.
- Agenda personnel avec export iCal ; présences (taux, carte de chaleur, justification a posteriori).
- Carte de membre numérique avec QR code, visible hors ligne.
- État actuel : écran convocations et réponse depuis l'accueil ; l'écran « carte » est vide et doit être retiré de la navigation avant publication.

### Badges et gamification

- Le CDC Training indique qu'XP, niveaux et badges sont déjà codés côté serveur. Les séances d'entraînement doivent devenir une nouvelle source d'XP et de badges, calculée par ce moteur existant, sans duplication.
- Défis (par exemple « 10 tirs d'affilée »), score de séance, récompenses.
- État actuel : niveau, XP et badges sur l'accueil et le profil, écrans badges et paliers, classement du club sur 7 jours dans le Playground. Le chantier « gamification » plus poussé est reporté après la publication.

### Retours du coach

- Bilan de saison : consultation des notes du coach sur 4 axes (vie quotidienne, mental, technique, physique), sous-critères notés de 1 à 10 avec code couleur, radar, commentaires (points forts, axes de travail), case de validation « j'ai lu et accepté », comparaison avec les saisons passées, téléchargement PDF.
- État actuel : écran bilan présent.

### Communauté, messagerie, documents, notifications

- Communauté (coéquipières, coachs, recherche) et messagerie 1:1 ou d'équipe, modérée par défaut pour les mineures.
- Documents personnels avec statut OK / manquant / expiré ; notifications in-app, push et e-mail par catégorie.
- État actuel : recherche de joueuses, social (abonnées, suivis, signaler, masquer), fil highlights avec modération, documents et « mes parents » (lecture seule) en WebView, notifications push (canal Android, jeton enregistré puis retiré à la déconnexion). La messagerie décrite par le CDC n'apparaît pas dans les écrans actuels.

### Playground (ex Training) par paliers

Règle d'or : on ne démarre jamais un palier tant que le précédent n'est pas livré et stable ; P0 et P1 au minimum pour le jury, P2 et P3 sont des paris.

- P0, practice manuel et cibles (certain, risque faible) : aperçu caméra, cibles en surimpression, minuteur, compteur de répétitions, défis, saisie du résultat par deux boutons Réussi / Raté, score de séance.
- P1, pose estimation pour le tir (faisable, risque modéré) : environ 33 points articulaires via MediaPipe ou MoveNet, squelette en surimpression, angles du coude et des genoux, alignement, retour sans jargon.
- P2, suivi du ballon pour le dribble (pari, risque élevé) : détection du ballon image par image, contact ballon et cible, score de dribble automatique ; modèle sur mesure nécessaire, résultat non garanti avant la soutenance.
- P3, détection automatique du tir réussi ou raté (pari fort, risque très élevé) : détection du panier, trajectoire, décision « rentré / raté » ; traité comme un spike borné dans le temps, sinon on garde la saisie manuelle.
- Exigences : mode Tir ou Dribble, cibles configurables, relecture avec squelette, conservation ou suppression au choix du joueur.
- État actuel : Playground v14 avec deux modes (tir : arceau, zone de tir, parabole, métriques ; dribble : cibles, rebonds, mains, combo), chargé en WebView depuis le serveur, permission caméra expliquée, mode paysage. Les séances sont stockées en local (200 au plus) puis envoyées au serveur sans rejeu en cas d'échec. Les anciens écrans manuels restent dans le code, orphelins. La détection Playground avancée est reportée après la publication.

## Hors périmètre

- Training : détection fiable du panier marqué en palier précoce, analyse multi-angles ou multi-caméras, comparaison automatique à un geste modèle de pro, multijoueur en ligne temps réel, montage et export vidéo type réseau social (V2 et plus), backend Node séparé.
- Règle actuelle du dossier : aucune nouvelle fonctionnalité tant que la liste de ce qui reste pour les stores n'est pas vide.
- Reportés après publication : inventaire, gamification avancée, détection Playground, couleurs par club, code club.
- Le CDC fonctionnel se dit « une carte du territoire » qui n'engage pas à tout livrer en V1.

## Contraintes techniques

- App Expo SDK 54, React Native 0.81, React 19, expo-router 6, TypeScript strict ; identifiant fr.venaball.app iOS et Android, version 1.0.0.
- 5 onglets (Accueil, Stats, Recherche, Playground, Profil) et 22 écrans de pile.
- Un seul backend : l'API Symfony /api/pirb/ avec jeton Bearer de 30 jours stocké en SecureStore ; toutes les adresses dérivent d'une variable d'environnement via src/services/hosts.ts, jamais de domaine en dur.
- Robustesse : 3 essais en lecture, pas de rejeu en écriture, bandeau « ce que tu vois peut être incomplet », un 401 déconnecte.
- Playground : WebView chargée depuis le serveur, pont webviewBridge qui valide strictement les messages ; modèles MediaPipe chargés depuis un CDN Google, donc pas de Playground sans réseau.
- Pas de mock : MockPirbDataService est une dette à retirer.
- Avant chaque remise : npx tsc --noEmit et npx expo-doctor verts. Ni lint ni test automatisé à ce jour.
- Textes : tutoiement, pas d'emoji hors arcade, jamais « beta » ni « phase de test ».
- Contradiction : le README décrit encore un état de juillet (palier P0, « aucun backend », données bouchons, react-native-vision-camera prévu en development build), alors que le document maître décrit une app branchée sur l'API réelle et un Playground en WebView. Le CDC Training posait aussi que la vision tourne sur le téléphone sans backend au départ ; dans les faits, les pages du Playground sont servies par le serveur et les séances y sont envoyées.

## RGPD et mineures

- Une mineure ne s'inscrit pas seule : e-mail du parent obligatoire.
- Conversations impliquant une mineure modérées par défaut ; le parent reçoit copie des notifications importantes.
- Profil public d'une mineure visible par le club seulement par défaut ; droit à l'image signé par le parent avant toute publication de photo.
- Droits RGPD : export, droit à l'oubli, conservation 1 an après la dernière licence ; données médicales réservées au staff habilité.
- Training, contrainte critique à poser avant tout code caméra et à documenter dans le registre sécurité RGPD : consentement parental explicite avant toute captation d'une mineure, vidéo stockée localement par défaut, minimisation (chiffres plutôt que vidéo brute), aucun partage par défaut et partage interdit sans autorisation pour une mineure, effacement des séances à tout moment. P0 est privilégié car il peut fonctionner avec peu ou pas de vidéo.
- État actuel : profil privé par défaut (plus strict que le « club seulement » du CDC), signaler et masquer sur Scouting, Social et Réglages, suppression de compte dans l'app, permission caméra sans audio.

## Publication sur les stores

Déjà fait (état au 21/09) : suppression de compte in-app, aucun prix affiché, chiffrement déclaré, URLs légales vérifiées en ligne avec ancre de suppression de compte, profil privé par défaut, signaler et masquer sur plusieurs écrans.

Exigé avant soumission (bloc B, état au 01/10) :

- signaler et masquer sur les cartes communauté (accueil, recherche) et sur l'écran équipe ;
- terrain marqué/raté source EASYSTATS à builder, bloc « Hors compétition » affiché ;
- icône iOS sans transparence ;
- écran Carte retiré de la navigation ;
- textes qui mentent corrigés (FAQ « pas encore » contre « score auto », mention « PIRB SCOUTING », mention d'un compte pirb.mabb.fr au login, nom d'appareil « PIRB Mobile ») ;
- mail support unique contact@velito.fr partout ;
- cibles tactiles d'au moins 44 pt (10 en dessous) ;
- questionnaire App Privacy, classification d'âge et Data safety Android (identité, e-mail, stats sportives, photo, jeton push) ;
- compte de review complet (avec convocation, stats et badge) et notes de review rédigées ;
- bloc submit dans eas.json, puis build production iOS et Android ;
- captures, textes des fiches et URLs légales (bloc D) ;
- serveur du binaire tranché : la production vise une base sans joueuse réelle tant que la migration MABB vers l'instance Venaball (bloc E) n'est pas faite ; la soumission vient après cette migration.

Contradiction : le tableau de la section 1 du document maître indique l'app « jamais buildée », la section 9.1 (01/10) mentionne un build preview Android qui fonctionne. Le CDC Training proposait de cibler Android d'abord pour des raisons de coût ; le compte Apple Developer est actif depuis mi-septembre, la cible est désormais iOS et Android.

## Roadmap

Roadmap du CDC Training (durées à préciser après l'analyse de stack) :

- Analyse de stack : framework mobile et bibliothèques vision, faisabilité P1 ; fini quand une ADR est écrite.
- P0 : practice, cibles, minuteur, saisie manuelle, enregistrement ; fini quand une séance complète est jouable et scorée.
- P1 : pose estimation, squelette, angles au tir ; fini quand le squelette est stable avec un angle affiché.
- Intégration au profil : séances branchées sur profil et gamification via l'API ; fini quand une séance rapporte de l'XP.
- P2 puis P3 en spikes bornés : go/no-go documenté, sinon on garde P0.

Chemin actuel vers les stores (document maître) : serveur autonome (bloc A), app joueuse (bloc B), app Club (bloc C), fiches stores (bloc D), migration MABB vers Venaball en dernier (bloc E), puis soumission.

## Critères de réussite

- Pour le jury : arriver avec un produit fini, P0 et P1 au minimum, pas une démo à moitié cassée.
- Une séance Playground rapporte de l'XP dans le profil, calculée par le moteur serveur existant.
- Aucun calcul de stats dupliqué hors du backend.
- Cadre RGPD mineures documenté avant toute fonction caméra, et respecté (consentement, stockage local, effacement).
- Aucune donnée ne fuit d'un club à l'autre.
- App publiée sur l'App Store et Google Play, liste du bloc B vide, tsc et expo-doctor verts, et servant des joueuses réelles après la migration.$cdc$
where slug = 'venaball' and (cdc is null or btrim(cdc) = '');

-- venaball-club (11918 caractères)
update shared.projets set cdc = $cdc$Source : CDC_FONCTIONNEL_MABB_ECOSYSTEME_v1.pdf (cahier fonctionnel V1, juin 2026, section 4 espace d'administration et règles communes), venaball club-store/CLAUDE.md (novembre 2026), instruction/00_DIRECTIVES.md (démarré le 04/08/2026, mis à jour le 03/10/2026), instruction/01_STATS_LIVE_V2_2026-09-09.md (9 septembre 2026), instruction/02_PROMPT_DEV_STORE.md (cadrage du 03/10/2026)

# Venaball Club : cahier des charges condensé de l'app staff

Il n'existe pas de CDC dédié à cette app. Ce document assemble la partie staff, club et coach du cahier fonctionnel de l'écosystème et les directives du dossier venaball club-store. Auteur et décideur : Clavel NDEMA MOUSSA (VENA).

## Objet et contexte

Venaball Club (identifiant fr.venaball.club) est l'application mobile du staff d'un club de basket : dirigeants, coachs, bénévoles, trésorier et parents. Le cadrage la décrit comme « l'Uber » de l'écosystème : une seule app pour le coach, le parent et le bénévole, avec un changement de vue rapide entre les rôles.

Elle complète l'app joueuse Venaball, sortie en premier ; Venaball Club se construit pendant la review de celle-ci. Les deux parlent au même serveur Symfony (dépôt mabb-site), Venaball Club via les routes /api/club/.

Le cahier fonctionnel de juin décrit l'espace d'administration du club comme l'outil de gestion quotidienne : effectifs, calendrier, finances, présences, dossiers. Chaque utilisateur n'y voit que ce que ses rôles autorisent. L'app mobile en reprend la partie utile sur le terrain et en mobilité.

Mission actuelle (cadrage du 03/10/2026) : rendre l'app publiable sur Google Play et l'App Store, en cinq lots, sans aucune nouvelle fonctionnalité. Tous les écrans existent et sont branchés sur de vraies données ; il manque de la finition store, de la robustesse et de la cohérence.

## Public et rôles

Rôles du club définis par le cahier fonctionnel, cumulables (un même compte peut être coach, dirigeant et parent) :

- Créateur et administrateur : gestion complète du club.
- Dirigeant : président, secrétaire, trésorier ; gestion du club, finances, dossiers, communication.
- Coach : ses équipes, séances, présences, bilans, convocations.
- Staff et employé : accès à l'équipe assignée ou à leurs missions.
- Bénévole : rôle par défaut, agenda et possibilité de se proposer.
- Parent : agit au nom de son enfant mineur.
- Joueuse : utilise l'app Venaball, pas celle-ci.

Règle centrale : le serveur, via /api/club/moi, dit quelles vues existent pour le compte et laquelle ouvrir par défaut. L'app affiche, elle ne décide jamais d'un droit. Une joueuse sans rôle staff voit « aucune vue coach », c'est le comportement attendu.

## Périmètre fonctionnel

### Les cinq vues (état au 30/09/2026)

- Coach : équipes, matchs, convocation, renfort, appel de séance, stats live à valider. Écrans accueil, rencontres, convocation, séances, pointage, stats live, saisie.
- Direction : pilotage, chiffres, éléments en attente, trésorerie.
- Bénévole : missions de match (confirmer, signaler une indisponibilité, confirmer sa présence à J-1 ou J), événements, organisation du week-end.
- Parent : enfants et convocations, réponse au nom de l'enfant.
- Joueuse : renvoi franc vers l'app Venaball.

### Rencontres et convocations

- Liste des rencontres à venir ou passées, filtre par équipe retirable d'un tap, limite de 100 envoyée au serveur, tirer pour rafraîchir.
- Convocation : effectif, réponses des joueuses, enregistrement. L'envoi remplace la liste : toujours envoyer la liste complète des convoquées, jamais un delta.
- Renfort : le vivier s'ouvre dans une feuille listant toutes les joueuses disponibles, chacune convocable.
- Côté cahier fonctionnel : envoi par e-mail et push, réponse présente, absente ou incertaine avec motif, suivi en temps réel par le coach, rappel J-1, relance J-3.

### Séances et pointage

- Appel de séance par le coach. « Appel non fait » n'apparaît qu'après la fin de la séance (date plus durée, 90 minutes par défaut).
- Cahier fonctionnel : saisie très rapide par cases, ajout ad hoc d'une joueuse (essai, renfort), motif d'absence, alerte au coach après 3 absences consécutives.

### Stats Live (saisie de match)

L'écran de saisie couvre actions, entrées et sorties, score adverse et fin de match. Le cahier fonctionnel prévoit la saisie temps réel sur tablette au bord du terrain (paniers, fautes, remplacements, rebonds, passes, ballons perdus), la validation par le coach principal et un mode hors ligne avec synchronisation à la reconnexion.

Version 2 (9 septembre 2026), modèle « boîte d'envoi » :

- Toute écriture passe par une file : mise à jour locale immédiate, envoi en arrière-plan, ordre strict.
- Hors ligne, la file est persistée et repart avec un délai croissant de 2 à 30 secondes.
- Délai maximal de 8 ou 12 secondes par appel, au-delà l'élément reste en file.
- Chaque action porte un identifiant client unique (client_uid) que le serveur reconnaît : pas de doublon si une réponse se perd. Score adverse envoyé en valeur absolue, sortie et fin de match idempotentes.
- Jeton expiré en plein match : la file se met en pause et reprend après reconnexion, rien n'est perdu.
- Refus du serveur : l'élément est gardé, bandeau rouge consultable et effaçable. Erreurs serveur : nouvel essai.
- Réalignement silencieux avec le serveur dès que la file est vide ; annulation de la dernière action, y compris en vol.

Écran de saisie :

- Chrono basé sur l'heure système, sans dérive en arrière-plan ; changement de période confirmé ; prolongations accessibles.
- Retour Android : de la grille d'actions vers les joueuses, sans quitter le match.
- Règle des cinq sur le terrain appliquée à l'entrée ; joueuses à cinq fautes grisées.
- Bandeaux d'état : attente, session en pause, refus, annulation. Libellés d'accessibilité partout. État vide si aucune joueuse n'est convoquée.

### Bénévoles et organisation

- Missions de match : confirmer, se déclarer indisponible.
- Présence J-1 ou J : pour une mission assignée ou confirmée dont le match est aujourd'hui ou demain, bouton « Je suis bien présent », puis affichage « Présence confirmée ».
- Écran d'organisation d'une rencontre : feuille fermable par le retour Android, champs libres vidés à chaque ouverture, dates d'inscription en français.

### Direction

- Vue de pilotage : chiffres, attentes, trésorerie.
- Le cahier fonctionnel fixe la règle : les données financières ne sont visibles que du trésorier et de l'admin.

### Parents

- Liste des enfants et de leurs convocations, réponse au nom de l'enfant.

### Notifications

- Le jeton push est envoyé au serveur à chaque ouverture de session et retiré juste avant la déconnexion, sans jamais bloquer.
- Un tap ouvre la bonne destination : route explicite, sinon l'organisation de la rencontre, sinon la vue bénévole pour les notifications d'organisation, sinon la liste.
- Écran de notifications avec cloche et pastille ; la lecture est marquée après affichage, jamais par la simple consultation.
- Prérequis : identifiant de projet EAS et build de développement ou EAS ; sans eux, le service abandonne proprement.

### Compte et pages légales

- Écran de connexion : confidentialité, conditions d'utilisation, mot de passe oublié.
- Menu Mon compte : confidentialité, conditions, suppression du compte.

## Hors périmètre

- Toute nouvelle fonctionnalité tant que la publication n'est pas faite.
- Sélecteur de club : un seul club par compte aujourd'hui, non fait par choix.
- Position du tir (shot chart) à la saisie : le serveur l'accepte, l'écran ne la saisit pas.
- Calcul du plus-minus : la matière existe, rien ne le calcule.
- Modules du cahier fonctionnel non portés dans l'app : documents, réunions, subventions, impact, communication externe, paramètres du club, qui restent dans l'espace web du club.
- Toute modification du serveur : un besoin côté API s'écrit dans instruction/05_DEMANDES_SERVEUR.md (route, payload, réponse reçue, réponse attendue) et Clavel arbitre.

## Contraintes techniques

- Expo SDK 54, React Native 0.81, expo-router 6, TypeScript strict. SDK maintenu en 54.
- API Symfony en production sur api.venaball.fr, jeton Bearer valable 30 jours, compte unique de l'écosystème.
- En-tête X-Club-Id sur chaque appel /api/club/, même si le serveur vérifie.
- Une réponse 404 peut signifier « pas à toi » : jamais interprétée comme un bug.
- Un seul domaine : toutes les adresses dérivent de EXPO_PUBLIC_API_URL dans src/services/hosts.ts, aucune mention de mabb.fr dans app/ et src/.
- Jeton stocké dans expo-secure-store, jamais AsyncStorage. Store de session indépendant de React.
- Design en trois couches de tokens (primitives, sémantique, échelles), les écrans n'importent que la couche sémantique. Même identité « Playground de nuit » que Venaball, accent bleu (le club) au lieu de l'orange.
- Rechargement au retour sur Rencontres, Stats Live, Séances et Convocation. Zones sûres haut et bas gérées sur les écrans concernés.
- Rien n'est mocké. Aucune dépendance ajoutée sans justification écrite.
- Textes : français, aucun emoji, aucun tiret cadratin, jamais « beta » ni « test » (règle Apple 2.1), pas de formules creuses. Point ouvert : les directives initiales demandaient le vouvoiement côté staff, le cadrage du 03/10 demande le tutoiement, quelques restes de vouvoiement sont à harmoniser.
- Code commenté en français, le pourquoi plutôt que le quoi.
- La file d'envoi Stats Live ne se modifie pas sans spec.

## Sécurité, multi-tenant et RGPD

- L'app n'attribue aucun droit : tout vient du serveur, qui applique l'isolation stricte par club du cahier fonctionnel (aucune donnée ne fuit entre clubs).
- Aucun secret dans le dépôt : identifiants des consoles stores et fichier de service Google hors de git, eas.json sans secret, mot de passe du compte de démonstration transmis hors dépôt.
- Clavel lance lui-même eas init, eas login, eas build, eas submit et git push.
- Protection des mineures (cahier fonctionnel) : le parent agit au nom de l'enfant, reçoit les notifications importantes, données médicales réservées aux coachs, staff médical et admin.
- Fiches stores : données traitées déclarées (identité, e-mail, rôle dans le club, convocations et présences, stats de match, jeton push), pas de publicité, pas de revente. URL de confidentialité et chemin de suppression du compte décrits.

## Roadmap ou lots

Un commit par lot, validation de Clavel entre chaque.

- Lot 1, l'app compile : installation, TypeScript et expo-doctor verts, connexion au compte de démonstration sur api.venaball.fr.
- Lot 2, un seul domaine et des textes propres : hosts.ts unique, liens légaux, chasse aux emojis et tirets cadratins, version 1.0.0. Fait le 03/10/2026.
- Lot 3, finition : vivier de renforts complet, filtre équipe annulable et limite envoyée, rechargement au retour, zones sûres, retour Android sur les modales, icônes et splash conformes. Fait le 03/10/2026, icônes à vérifier.
- Lot 4, dossier store : section submit dans eas.json, fiches stores (titre, descriptions, permissions, questionnaires de confidentialité iOS et Android, compte de test pour les reviewers). Fiches rédigées dans instruction/03_FICHES_STORES.md.
- Lot 5, builds et test réel : build Android de préversion, une semaine d'usage par trois personnes du club (un dirigeant, une secrétaire, un bénévole), retours consignés, correctifs, puis builds de production iOS et Android.

La soumission attend la migration des données MABB vers Venaball, décidée par Clavel.

## Critères de réussite

- L'app se compile en production sur Android et iOS.
- Elle ne mentionne que les domaines Venaball.
- TypeScript et expo-doctor passent sans erreur.
- Trois personnes du club l'ont utilisée une semaine sans plantage bloquant.
- Les fiches stores sont prêtes à coller.
- Stats Live ne perd ni ne duplique aucune action, y compris réseau coupé ou jeton expiré.
- La date de soumission reste une décision de Clavel.$cdc$
where slug = 'venaball-club' and (cdc is null or btrim(cdc) = '');

-- venaball-serveur (14940 caractères)
update shared.projets set cdc = $cdc$Source : CDC_FONCTIONNEL_MABB_ECOSYSTEME_v1.pdf (cahier fonctionnel V1, juin 2026), CDC_MABB_PIRB_V1_Definitif.pdf (V1.0 définitif, février 2026), CLAUDE.md du dépôt mabb-site (état actuel, novembre 2026)

# Venaball serveur : cahier des charges condensé

Projet d'alternance CDA de Clavel NDEMA MOUSSA, fondateur de VENA. Dépôt mabb-site, anciennement MABB Manager et PIRB.

## Objet et contexte

Les clubs de basket amateurs travaillent avec des outils dispersés : messageries, fichiers Excel, e-mails. Résultat : perte d'informations, pas de traçabilité, communication inefficace, aucun suivi structuré des joueuses. Le club Amiens Métropole Basket Ball (MABB) a exprimé ce besoin de centralisation, il est le club d'origine et le client phare.

Objectifs métier : centraliser la gestion administrative et sportive, simplifier la communication interne, fiabiliser le suivi des présences et des statistiques, offrir un outil moderne adapté à un club amateur.

Objectifs techniques : architecture Symfony professionnelle, base relationnelle, bonnes pratiques de sécurité (authentification, rôles, RGPD), application évolutive et maintenable, défendable devant un jury.

### Les trois espaces

- Site vitrine : propre à un club, public, sans compte pour l'essentiel des pages.
- Espace d'administration (Manager, aujourd'hui « club ») : dirigeants, coachs, staff, bénévoles, employés. Générique et multi-club.
- Espace personnel (PIRB, aujourd'hui « app ») : joueuses, parents, membres. Générique et multi-club.

Règle fondatrice du CDC de février : le site vitrine est spécifique à un club, les deux applications sont génériques, le club MABB est un client parmi d'autres. Aucun mélange fonctionnel entre ces périmètres.

### État actuel (novembre 2026)

- Un seul code Symfony 7.4, PHP 8.3, Doctrine, Twig, déployé en deux instances.
- Instance MABB : manager.mabb.fr et pirb.mabb.fr, hébergement OVH qui ferme le 22/10/2026.
- Instance Venaball : club.venaball.fr, app.venaball.fr, api.venaball.fr, instance multi-club cible.
- Routage par host, firewalls séparés, isolation par club_id via ClubVoter et TenantResolver.
- Deux apps Expo consomment l'API : l'app joueuse Venaball (routes /api/pirb/) et l'app staff Venaball Club (routes /api/club/).

## Public et rôles

Chaque utilisateur a un compte et peut cumuler plusieurs rôles dans un club (par exemple coach U13, dirigeant et parent). Les droits effectifs sont l'union des droits de chaque rôle, restreinte au club.

- Créateur : a créé le club, rôle permanent, peut tout, y compris destituer un admin ; ne peut être destitué que par lui-même, transfert possible avec double confirmation.
- Administrateur : désigné par le créateur ou un admin, peut tout sauf destituer un autre admin.
- Dirigeant : président, secrétaire, trésorier ; gestion club, finances, dossiers, communication.
- Coach : gère ses équipes (séances, présences, bilans, convocations).
- Staff : kiné, préparateur physique, manager ; lecture et écriture sur l'équipe assignée.
- Employé : salarié du club, lecture étendue, écriture sur ses missions.
- Bénévole : rôle par défaut à l'inscription, accès minimal à l'agenda, peut se proposer.
- Joueur : licencié, accès à son espace personnel.
- Parent : accès à l'espace de son enfant mineur.
- Super admin : administrateur technique de la plateforme (CDC de février).

Attribution : bénévole par défaut, joueur cochable à l'inscription, tous les autres rôles attribués uniquement par un admin ou le créateur. Si le créateur part sans transmettre, le club est marqué « en péril ».

## Périmètre fonctionnel

### Tronc commun : comptes et clubs

- Écran d'arrivée : rejoindre un club existant (recherche par nom) ou créer son club.
- Inscription : nom, prénom, date de naissance, e-mail, mot de passe, téléphone optionnel, rôle souhaité, acceptation CGU et confidentialité, e-mail de confirmation.
- Mineur : e-mail du parent obligatoire, autorisations parentales (droit à l'image, pratique).
- Connexion e-mail et mot de passe, « rester connecté », mot de passe oublié par lien à usage unique.
- Profil : informations, photo, préférences de notification, dernières connexions, export et suppression des données.
- Création d'un club : nom, discipline, ville, numéro d'agrément FFBB optionnel, logo, couleurs ; le créateur devient administrateur principal.
- Statuts d'un club : actif, suspendu, désactivé (données conservées, connexion impossible).

### Tableau de bord

- Indicateurs clés, alertes urgentes (subvention, document manquant, absences, trésorerie), agenda, espace président réservé aux dirigeants.

### Effectif

- Équipes : liste filtrable, création, modification, archivage en fin de saison, affectation des coachs, composition, statistiques.
- Joueuses : liste filtrable, fiche complète (poste, maillot, licence, mensurations, profil de jeu), affectation, historique, import Excel, passage en inactive.

### Calendrier

- Vues mois et semaine, club ou équipe ; séances et rencontres, duplication, séries récurrentes, notification, export iCal, rappel J-1.

### Convocations

- Le coach choisit les convoquées, envoi par e-mail et push.
- Réponse depuis l'espace personnel : présente, absente, incertaine, motif optionnel ; suivi en temps réel côté coach.
- Relance à J-3, feuille PDF, statistiques de réponse. Modifiable tant que le match n'est pas terminé.

### Présences

- Statuts : présent, absent, excusé, retard, non renseigné par défaut.
- Saisie rapide, ajout ad hoc (essai, renfort), mode QR code, taux par joueuse et équipe, alerte après 3 absences consécutives.

### Feuille de match et saisie live

- Cinq majeur et remplaçantes ; statuts brouillon, validée, verrouillée.
- Saisie temps réel sur tablette : paniers, fautes, remplacements, rebonds, passes, ballons perdus ; saisie post-match possible.
- Stats par match : minutes, points, tirs 2 pts, 3 pts et lancers francs, rebonds offensifs et défensifs, passes décisives, interceptions, contres, fautes commises et provoquées, ballons perdus, plus-minus.
- Shot tracking : coordonnées X et Y normalisées, type, résultat, joueuse, période ; UX tablette, moins de 3 secondes par tir, bouton annuler.
- Remplacements horodatés, une joueuse déjà sur le terrain ne peut pas entrer.
- Timeline : chaque action est une entrée (match, type, joueuse, période, chrono, données JSON).
- Validation par le coach puis publication dans l'espace personnel, export PDF format FFBB.

### Statistiques

- Stats individuelles et d'équipe, comparaisons, shot chart par zone, tops du club, export Excel, calculs automatiques.
- État actuel : sources EvaluationMatch (manuel, live, FFBB, easystats), TirFfbb et ActionMatch, agrégées par JoueurStatsAggregator (matchs officiels seulement) et TirsNormalisesService (repère commun 0 à 1).

### Bilan saison joueuse

- Quatre axes : vie quotidienne, mental, technique, physique ; sous-critères notés de 1 à 10 avec code couleur.
- Profil de jeu, commentaires libres, double validation coach et joueuse, export PDF, comparaison entre saisons.

### Documents

- Dépôt par équipe, joueuse ou thème (licence, certificat, autorisation, facture), statut OK, manquant ou expiré, validation admin, alerte d'expiration.

### Réunions et comptes-rendus

- Planification (CA, AG, bureau, staff), convocation, compte-rendu validé par le président, archive.

### Trésorerie

- Recettes et dépenses avec justificatif, plan de comptes, tableau de bord 12 mois, export CSV, alerte de seuil, suivi des cotisations. Visible seulement par le trésorier et l'admin.

### Subventions et impact

- Dossiers (FDVA, Région, Département, Mairie, CAF, ANS) avec statut, échéancier, pièces requises, dossier pré-rempli.
- Indicateurs d'impact (licenciés, séances, bénévolat valorisé) et bilan d'activité PDF.

### Communication

- Interne : messagerie 1:1 et de groupe, annonces club ou ciblées, pièces jointes, modération des conversations avec des mineures.
- Externe : articles pour le site avec circuit de relecture et programmation, visuels de match.

### Utilisateurs, paramètres, recherche

- Membres filtrables, modification des rôles, suspension et réactivation, invitation à usage unique, code club, journal des actions sensibles.
- Paramètres : infos du club, saisons, catégories, plan de comptes, abonnement, suppression du club (double confirmation, délai de 30 jours).
- Recherche globale tous types, filtres, recherches favorites.

### Espace personnel joueuse (servi par le même serveur)

- Mur, profil public (visibilité public, club ou privé, rien de public par défaut), agenda, convocations, présences, stats, shot chart et timeline personnels.
- Bilan saison signé, carte de membre avec QR code visible hors ligne, documents, messagerie, historique.
- Feedback d'entraînement anonyme (1 à 5 étoiles et commentaires) : le coach ne voit que les agrégats, une seule réponse par séance.
- Espace parent : accès aux enfants mineurs, vue agrégée, approbation des déplacements, paiement et suivi des cotisations.

### Site vitrine

- Accueil, club, équipes, actualités, résultats, inscription, boutique, contact, pages légales.
- Back-office CMS avec rôles de contenu, SEO de base (slugs, sitemap, responsive).

### Passerelles

- Bouton espace membre qui redirige selon le rôle.
- Articles et scores saisis côté club repris sur la vitrine.
- Pont club et espace personnel : convocations, réponses, bilans validés, documents déposés, profil mis à jour circulent dans les deux sens.

### Notifications

- Canaux : cloche, push, e-mail, SMS à confirmer pour l'urgent.
- Types principaux : convocation, rappel J-1, réponse, message, annonce, document expirant, absences répétées, cotisation impayée, changement de planning.
- Préférences par type et par canal, fréquence du résumé, plage de silence.

### Affiliation FFBB et plans

- Club officiel : numéro FFBB vérifié, badge vert, numéro unique. Club non officiel : badge orange, avertissement, toutes fonctions accessibles, régularisation possible.
- Nom réservé : proposition de rejoindre un club existant, suggestion par code postal.
- Plans pressentis : Découverte gratuit (2 équipes, fonctions de base, 50 Mo), Club payant (illimité, bilans, réunions, 5 Go), Premium (tout, dont trésorerie, subventions, cité éducative, vitrine personnalisée, 50 Go, support 24 h). MABB en Premium par défaut. Tarifs à définir.

## Hors périmètre

Le CDC de juin est une carte du territoire, il n'engage pas à tout livrer. Le CDC de février exclut de la V1 :

- messagerie interne, gamification, gestion documentaire et notifications avancées (V2) ;
- application mobile native, module comité ou fédération, mini-jeux, intégrations FFBB, eMarque et Pickelite (V3) ;
- analytics complexes et heatmaps avancées (V2 ou V3) ;
- comparaisons publiques entre joueuses.

Le compte unique Velito (connexion sur hub.velito.fr à tous les services de l'écosystème) est annoncé comme futur.

## Contraintes techniques

- Monolithe modulaire Symfony unique qui sert les trois espaces, routage par host et firewalls distincts.
- CDC de février : Symfony 6.4 LTS, PHP 8.2, MySQL 8, API Platform, JWT. État actuel : Symfony 7.4, PHP 8.3, Doctrine, Twig, jeton Bearer pour les apps.
- Domaines métier : Core, Sport, PIRB, Vitrine, System obligatoires ; Communication, ENT, Gamification en V2.
- Intégrité : clés étrangères strictes, suppression logique, contraintes d'unicité, index sur club_id, saison et dates, horodatage sur toutes les tables.
- Saisons d'août N à juillet N+1, une seule active, toujours via SaisonService, jamais de date en dur. Effectif d'une équipe lu dans les affectations JoueurEquipe.
- Twig : path() pour les liens internes, url() pour les e-mails et PDF, car le domaine change selon l'instance.
- Fiabilité : sauvegarde nocturne, restauration à J-1, saisie de feuille de match hors ligne avec synchronisation, bandeau en cas de connexion instable.
- Pas de base locale fiable : chaque migration est petite, réversible et vérifiée contre l'existant.

## Sécurité, multi-tenant et RGPD

- Multi-tenant strict : aucune donnée ne fuit entre clubs, toute requête filtrée par club_id côté serveur, contrôle centralisé par voters, jamais seulement côté front.
- Chaque route : contrôle d'accès par ClubVoter sur l'objet, requête filtrée par club, jeton CSRF sur les formulaires.
- Mots de passe hachés, limitation des tentatives, validation stricte des entrées, HTTPS obligatoire.
- Journalisation des connexions et des actions sensibles (rôles, validation de match, suppression de document, modification de stats).
- Feuille de match verrouillée 48 h après validation, déverrouillage par un admin seulement, modifications tracées.
- RGPD : consentement explicite, accès, export structuré, effacement ou anonymisation ; données sportives anonymisées plutôt que supprimées ; conservation 1 an après la dernière licence.
- Données médicales réservées aux coachs, staff médical et admin ; données financières au trésorier et à l'admin.
- Mineures : inscription avec parent, conversations modérées, copie des notifications importantes au parent, profil visible du club seulement par défaut, droit à l'image signé avant publication.
- Secrets hors du dépôt, fichiers sensibles dans .gitignore.

## Roadmap et lots

V1 sur 6 mois d'alternance (CDC de février) :

- Phase 1, semaines 1 à 4 : Core (authentification, multi-tenant, multi-rôles, voters, base).
- Phase 2, semaines 5 à 8 : Sport (saisons, équipes, joueuses, événements, présences).
- Phase 3, semaines 9 à 14 : Stats (saisie match, shot tracking, timeline, validation).
- Phase 4, semaines 15 à 18 : espace personnel (profil, shot chart, tableau de bord, feedback).
- Phase 5, semaines 19 à 22 : vitrine (CMS, actualités, galerie, SEO).
- Phase 6, semaines 23 à 26 : sécurité, tests, optimisation, documentation.

État : les deux apps mobiles sont en route vers les stores et l'instance Venaball devient la cible unique après la fermeture de l'hébergement MABB. Le journal des étapes est tenu dans instruction/00_ECOSYSTEME.md.

## Critères de réussite

- Un utilisateur s'inscrit, se connecte et accède à son espace selon ses rôles, cumulables.
- Un admin club crée des utilisateurs et attribue des rôles.
- Les données du club A ne sont jamais visibles d'un utilisateur du club B, y compris via l'API.
- Un coach crée séances et matchs, convoque, pointe les présences ; un événement annulé reste visible comme annulé.
- Un parent ne voit que les présences et stats de son enfant, une joueuse que les siennes.
- La saisie terrain est fluide sur tablette, un tir enregistre type, résultat, coordonnées, joueuse et période.
- Le shot chart affiche réussis et ratés, la visibilité se règle bloc par bloc, le feedback reste anonyme.
- Un article publié apparaît en accueil de la vitrine, pages éditables sans coder.
- Mots de passe hachés, échecs de connexion enregistrés et limités, export et suppression des données possibles.
- L'application est utilisable dans un club réel.$cdc$
where slug = 'venaball-serveur' and (cdc is null or btrim(cdc) = '');

-- velito-compta (11494 caractères)
update shared.projets set cdc = $cdc$Source : docs/cdc/CDC_Velito_Compta.docx (v1.0, juillet 2026) et apps/compta/CDC_FINALISATION_COMPTA.md (07/07/2026), état complété par apps/compta/README.md (journal jusqu'au 07/11/2026)

# Velito Compta : cahier des charges condensé

Outil de pré-comptabilité et de pilotage de trésorerie pour VEA (association loi 1901) et VENA (SASU), sous-domaine compta.velito.fr, application apps/compta du monorepo Velito-site. Auteur : Clavel NDEMA MOUSSA.

## Objet

La comptabilité de VEA et VENA reposait sur des fichiers Excel manuels et un archivage dispersé des justificatifs : ressaisie, catégorisation à la main, recherche des pièces, préparation laborieuse des documents pour l'expert-comptable et les obligations associatives.

Objectif principal : réduire fortement le temps passé sur la paperasse en centralisant saisie, catégorisation, suivi de trésorerie et export dans un outil unique, multi-entités, qui remplace les fichiers Excel.

Objectifs secondaires :

- constituer une réalisation professionnelle défendable pour le titre CDA (jury avril 2027) : CRUD complet, authentification, upload de fichiers, logique métier, architecture en couches, multi-tenant ;
- servir de vitrine technique pour VENA ;
- préparer, à terme et sous conditions, une éventuelle offre de pré-comptabilité pour des entrepreneurs locaux, sans jamais se substituer à un expert-comptable.

## Ce que l'outil n'est pas

- Pas un logiciel de comptabilité certifié : il ne produit ni bilan légal, ni compte de résultat légal, ni liasse fiscale.
- Pas un remplacement de l'expert-comptable : il l'alimente.
- Pas, au démarrage, un SaaS multi-clients ouvert au public : c'est un outil personnel qui pourra évoluer si le besoin est prouvé.

Cette délimitation protège juridiquement VENA : une donnée fausse vendue comme service comptable engagerait la responsabilité de la SASU. Tous les états produits (bilan, résultat, IS) sont étiquetés indicatifs, à valider par l'expert-comptable.

## Public

- Utilisateur unique au départ : Clavel, gestionnaire de VEA et de VENA, non-comptable.
- Accès limité par une liste blanche d'adresses ; aucune inscription publique.

## Positionnement

- Créneau : pré-comptabilité et trésorerie, en amont de l'expert-comptable.
- Différenciation : gratuit pour l'usage personnel, multi-entités (association et société) dès l'origine, pensé pour un non-comptable, scan de justificatifs, export prêt à transmettre.
- Agrégation bancaire DSP2 : écartée au démarrage (agrégateur agréé payant), remplacée par l'import CSV.
- Conformité fiscale (TVA, FEC) : reportée au départ, export brut d'abord.
- Facturation électronique : réforme 2026-2027 à anticiper avant tout module de facturation réel.
- Interface et catégorisation : cœur du projet, entièrement réalisable en interne.

## Périmètre fonctionnel

### Lot 1 : noyau (livré le 07/07/2026)

- Authentification sécurisée, middleware en refus par défaut (toute route sans session renvoie vers la connexion), liste blanche d'adresses.
- Multi-entités : bascule VEA / VENA, pages sous une route par entité, données strictement cloisonnées ; un identifiant d'entité non possédé renvoie une page non trouvée neutre.
- Plan de catégories propre à chaque entité : création, modification, archivage doux (jamais de suppression, pour préserver l'historique), type recette ou dépense non modifiable après création.
- Saisie manuelle d'une transaction : date, libellé, montant TTC, TVA, catégorie, type ; le HT est calculé, jamais saisi.
- Liste, filtres (période, catégorie, statut, type), édition et suppression avec confirmation ; les justificatifs partent en cascade.
- Import de relevé CSV : mapping des colonnes, prévisualisation, revalidation serveur de chaque ligne, lignes mal formées signalées sans bloquer l'import.
- Tableau de bord : solde, entrées et sorties du mois, répartition par catégorie.
- Export CSV au format Excel français (séparateur point-virgule, décimales à virgule, accents préservés) prêt pour l'expert-comptable ou le bilan associatif.

### Lot 2 : justificatifs

- Upload photo ou PDF rattaché à une transaction, stockage privé, consultation par lien signé de courte durée.
- Validation du type et de la taille côté serveur.
- Détection des transactions sans justificatif (audit associatif, contrôle fiscal) : livrée.
- Extraction assistée (OCR / IA) prévue : l'outil propose date, montant, TVA, fournisseur, l'utilisateur valide toujours ; journaliser proposé contre validé.

### Lot 3 : facturation VENA (conditionnel)

- Devis, transformation en facture, numérotation légale continue, mentions obligatoires.
- Statuts émise, payée, en retard, relances, génération PDF.
- Conditionné à une étude préalable de conformité avec la réforme de la facturation électronique.

### Documents juridiques (livrés)

- Trames de décision de l'associé unique (approbation des comptes) et de rapport de gestion pour la SASU, imprimables en PDF, résultat repris de la compta.
- Blancs explicites plutôt que valeurs inventées ; ce sont des trames à relire et signer, pas de la production légale. Pour l'association, un PV d'AG distinct reste à prévoir.

### Socle partie double (livré en version indicative)

- Plan comptable simplifié (classes 1 à 7), écritures et lignes d'écriture, à côté de la partie simple qu'il ne remplace pas.
- Équilibre débit égal crédit garanti par une contrainte vérifiée au commit.
- Pont automatique transaction vers écriture équilibrée (dépense : charge et TVA déductible contre banque ; recette : banque contre produit et TVA collectée), synchronisé à la création, à la modification, à l'import et à la suppression, avec régénération globale.
- Mapping catégorie vers compte du plan comptable, repli sur des comptes par défaut.
- Export FEC au format officiel (18 champs, ordre déterministe).
- Journal des écritures et balance générale.
- Bilan et compte de résultat indicatifs, bilan équilibré prouvé par les tests.
- Estimation indicative de l'impôt sur les sociétés pour la SASU : barème daté en paramètre, jamais en constante, avec acomptes.
- Liasse 2065 / 2033 en brouillon : prévue en dernier.

### Lot 6 : trésorerie associative (07/11/2026)

- Comptes réels de trésorerie : courant, livret, caisse. Solde initial inconnu stocké comme inconnu, jamais comme zéro.
- Soldes observés sur relevé rangés à part : une observation n'est pas une transaction.
- Virement interne : deux jambes liées, créées ensemble ou pas du tout, supprimées ensemble, exclues des totaux et du pont partie double.
- Trois statuts : à classer, à vérifier, validée. Une ligne sans catégorie ne peut pas être validée ; une ligne importée n'est jamais validée d'office.
- Provenance et clé anti-doublon calculée côté serveur à l'import : réimporter un relevé n'ajoute que le nouveau.
- Contrôle mensuel : ouverture plus recettes moins dépenses égale clôture, écart calculé à la date du relevé ; états concorde, écart, relevé à saisir, solde initial inconnu.
- Règles reprises des cahiers des charges d'un outil de compta associative existant, pas de son code. Les lignes importées dont le compte payeur est inconnu sont à trancher avec les relevés, jamais devinées.

## Hors périmètre

- Transmission officielle de la liasse (EDI-TDFC) : expert-comptable ou portail agréé.
- Dépôt au greffe : guichet unique INPI.
- Déclaration de TVA : VENA en franchise tant que les seuils ne sont pas dépassés.
- Extensions sur besoin prouvé seulement : connexion bancaire automatique, ouverture multi-clients (qui changerait la nature juridique de l'offre).
- Règle de discipline : aucune ligne du volet clients externes tant que l'outil ne sert pas la compta personnelle de façon régulière depuis au moins deux mois.

## Contraintes techniques

- Stack : Next.js (App Router), TypeScript strict, Tailwind, Supabase (PostgreSQL, Auth, Storage), migrations SQL manuelles numérotées et commentées.
- Architecture en couches, une couche ne parle qu'à celle juste en dessous : présentation (pages et composants, aucune logique ni requête), services (fonctions pures de calcul et de validation), repositories (requêtes, client injecté), base (schéma et RLS).
- Montants stockés en centimes entiers, jamais en flottant ; conversion euros vers centimes uniquement dans le service montants, par analyse de texte.
- Clé entite_id sur transaction et catégorie, clés étrangères composites anti-fuite entre entités.
- Type et statut en valeurs contraintes, horodatage de création et de modification sur chaque transaction.
- Exigences non fonctionnelles : tableau de bord fluide avec plusieurs milliers de lignes, utilisable par un non-comptable, mobile pour la photo de ticket, code documenté et reprenable.
- Projet Supabase partagé avec le hub (limite du plan gratuit) : authentifié ne veut pas dire autorisé, d'où la liste blanche ; la connexion est déléguée au hub (cookie partagé sur le domaine velito.fr).

## Sécurité et RGPD

- Données financières traitées comme sensibles : accès restreint, pas de partage à des tiers.
- Injection SQL : requêtes paramétrées systématiques.
- XSS : échappement de toutes les sorties issues de la saisie.
- Mots de passe : hachage délégué à Supabase Auth.
- Cloisonnement : RLS en refus par défaut sur toutes les tables, filtrage par entité, validation service pour un message propre, contrainte SQL en dernier rempart.
- Deux verrous distincts en base : droits du rôle sur la table (GRANT), puis RLS sur les lignes ; un oubli de GRANT a causé une erreur 500 en production le 07/11/2026.
- Justificatifs : bucket privé, RLS par chemin d'entité, liens signés à durée limitée, jamais de bucket public.
- Sauvegardes régulières de la base.
- Risque documenté : la clé d'administration du projet Supabase partagé donne accès aux données compta.
- Correctif d'une redirection ouverte côté hub lors de la connexion déléguée.
- Les données réelles importées restent hors du dépôt.

## Roadmap ou lots

- Lot 1 noyau : livré le 07/07/2026.
- Lot 2 justificatifs : stockage, consultation et pièces manquantes livrés ; extraction IA à faire.
- Documents juridiques SASU : livrés.
- Partie double, FEC, états, IS indicatif : livrés ; liasse brouillon à faire.
- Lot 6 trésorerie associative : livré le 07/11/2026.
- Lot 3 facturation VENA : conditionné à l'étude de conformité.
- Lot 4 et suivants (TVA, banque, multi-clients) : sur besoin prouvé.
- Jalon de décision : à la fin du Lot 1, vérifier honnêtement que l'outil est utilisé au quotidien avant d'investir davantage.

## Critères de réussite

- L'Excel est remplacé pour VEA et VENA.
- Une saisie de 12,50 est stockée 1250 centimes ; TVA supérieure au TTC refusée avant la base.
- Solde égal somme des recettes moins somme des dépenses, vérifié à la main ; répartition par catégorie cohérente.
- Un identifiant d'entité deviné ne donne accès à rien.
- Export ouvrable dans Excel et LibreOffice, montants justes, pièces manquantes exportables.
- Écriture déséquilibrée refusée ; bilan équilibré ; FEC conforme aux 18 champs.
- Réimport d'un relevé sans doublon ; contrôle mensuel concordant.
- Tests unitaires sur tout service de calcul (plus d'une centaine de tests verts dès le Lot 1), plus tests SQL de la migration trésorerie ; types de tests : unitaire, fonctionnel, sécurité (injection dans un libellé), cas limites (montant négatif, date absente, CSV mal formé).
- Valeur CDA : bloc 1 application sécurisée, bloc 2 conception en couches et modèle justifié, bloc 3 tests et déploiement documenté ; chaque décision tracée dans le journal du README.$cdc$
where slug = 'velito-compta' and (cdc is null or btrim(cdc) = '');

-- vea-site (11971 caractères)
update shared.projets set cdc = $cdc$Source : CDC_VEA_V2.pdf (version 2 technique détaillée, mai 2026)

# Cahier des charges condensé : site VEA (vea.velito.fr)

Auteur : Clavel NDEMA MOUSSA (CDA, AFPA Amiens). Structure : Velito Esport Amiens (VEA), association loi 1901 fondée en 2022.

## Objet

Le site vea.velito.fr est à la fois le site public et l'outil de gestion de l'association. La V2 met à jour la V1 (mai 2026) sur trois points : les sous-domaines passent en .velito.fr, le périmètre décrit correspond à ce qui est réellement en production, et les modules d'administration livrés depuis la V1 (bilan, espace président, comptabilité, rapports, documents, prestations, signalement) sont documentés comme existants.

Le document sert aussi de dossier de référence pour le jury du Titre Professionnel CDA (niveau 6).

Mission de l'association : démocratiser le jeu vidéo au service de l'inclusion et du lien social, dans les quartiers prioritaires d'Amiens (Étouvie, Amiens Nord, Elbeuf, Pierre Rollin). Résultats cités : 3e de France sur Street Fighter VI (championnat fédéral FFJV 2024), TOP 8 INTERCUP 2026, plus de 20 événements par an, soutien FDVA depuis 2024.

Le site remplit quatre fonctions :
- présenter l'association aux partenaires ;
- gérer les événements (création, présence par QR, suivi des participants) ;
- animer la communauté (annuaire, gamification, récompenses) ;
- prouver l'impact (indicateurs chiffrés pour les dossiers de subvention).

## Place dans l'écosystème Velito

VEA est le premier terrain réel de l'écosystème : les patterns validés ici (check-in QR, XP et badges, multi-tenant par permissions, UX mobile-first) sont réutilisés ailleurs. Monorepo Turborepo, une app Next.js par sous-domaine :
- en ligne : hub.velito.fr (portail), vea.velito.fr (cette app), vena.velito.fr (SASU VENA) ;
- teasers : arena.velito.fr, interactive.velito.fr, prevention.velito.fr.

Tant qu'un module n'est pas déployé, ses liens redirigent vers hub.velito.fr/construction avec le slug du module.

Les apps partagent la base Supabase (schémas vea, vena, shared), les cookies d'authentification sur .velito.fr et la table de permissions shared.user_permissions.

## Public

- Le jeune joueur : 13 à 25 ans, quartier populaire, pas toujours de téléphone ; veut s'amuser, se mesurer, gagner des récompenses.
- Le bénévole engagé : 18 à 35 ans, souvent ancien joueur ; veut suivre ses heures de bénévolat pour ses démarches et candidatures.
- Le partenaire institutionnel (mairie, CAF, ANS, Cité éducative) : veut des chiffres d'impact concrets pour justifier un financement.
- L'admin ou dirigeant (bureau VEA) : crée les événements, suit les participants, produit les rapports.

## Stack

- Framework : Next.js 16.2.0 (App Router, Server Components, Server Actions).
- UI : React 19.2.
- Langage : TypeScript 5.9.2.
- Styles : Tailwind CSS 3.4.19 (v3 figée, pas de migration v4).
- Animations : framer-motion 12.38 (ScrollReveal, transitions).
- Icônes : lucide-react 1.0.1.
- Backend et base : Supabase (PostgreSQL géré), supabase-js 2.105, ssr 0.10.3 ; auth, base, storage et RLS dans un seul produit.
- QR codes : qrcode 1.5.4.
- Monorepo : Turborepo 2.8 et workspaces npm (configs partagées @repo/ui, eslint, tsconfig).
- Hébergement : Vercel, déploiement continu depuis main.

Évolution V1 vers V2 : abandon de Prisma et MySQL au profit du SDK Supabase pour unifier la donnée entre toutes les apps, et passage de l'auth cookie maison à Supabase Auth (magic link). Prisma ne sert plus qu'à d'anciens scripts résiduels.

## Périmètre fonctionnel

### Pages publiques (sans connexion)

- Accueil : hero éditorial, galerie photo défilante, quatre piliers d'action, appel à l'inscription.
- Association : statuts, bureau, valeurs, reconnaissance FDVA, section « Notre impact » avec compteurs animés.
- Esport : disciplines pratiquées, structures de jeu.
- Agenda : événements passés et à venir, filtre par type, « à venir » par défaut.
- Médias : galerie photo par événement, visages des mineurs floutés.
- Partenaires : sponsors et partenaires.
- Impact : page dédiée aux indicateurs (jeunes, événements, quartiers, médiatisation).
- Prestations : packs d'animation et formulaire de devis.
- Contact et Signalement : formulaire de signalement traité par une Server Action dédiée.

### Espace membre (connexion requise)

- Mon profil : pseudo, jeu favori, bio, avatar, liens externes, opt-in public ; progression, barre d'XP, badges, dotations à réclamer, notifications, « Mes tournois ».
- Annuaire des joueurs : liste opt-in (pseudo, jeu favori, niveau, liens) avec badges de statut (Dirigeant, Joueur officiel, Vainqueur).
- Inscription : création de compte et de la fiche participant.
- Scan QR : validation de présence.
- Notifications in-app : cloche dans la barre de navigation, rafraîchie toutes les 60 s.

### Administration (permission editor ou plus sur l'organisation vea)

- Tableau de bord : cartes vers membres, événements, pré-inscrits, bilan, espace président.
- Événements : liste et création, QR généré automatiquement et téléchargeable ; fiche détaillée avec statistiques par motif, édition des motifs, ajout ou retrait d'un participant.
- Heures : attribution manuelle d'heures de bénévolat et d'XP.
- Bilan : graphiques (sexe, niveau, statut, participation), listes, édition du sexe.
- Espace président : fil rouge financier, roadmap sur trois horizons, projet phare.
- Comptabilité : tableau de bord de trésorerie, saisie et détail (scope trésorier).
- Rapports d'activité : liste, création, détail.
- Documents : dépôt de fichiers dans Supabase Storage.
- Demandes de prestation reçues : liste et détail.
- Récompenses « Old VEA » à distribuer.
- Tournois en ligne : espace structuré, encore à remplir.

## Gamification

### Barème XP

- Participer à un tournoi (motif jouer) : +10 XP.
- Bénévolat (motif aider) : +15 XP par heure.
- Spectateur (motif regarder) : +2 XP.
- Podium : +5 XP.
- Action exceptionnelle : +20 XP.

### Niveaux

- Passage du niveau N au niveau N+1 : 50 × N XP.
- XP cumulés pour atteindre le niveau N : 25 × N × (N−1).
- Repères : niveau 2 à 50 XP, niveau 5 à 500 XP, niveau 10 à 2 250 XP.
- Calcul côté code par computeLevel() à partir de l'XP de la saison en cours.

### Badges et dotations

Les badges se débloquent automatiquement selon des seuils ou statuts. Dotations par palier : niveau 1 badge Rookie ; niveau 3 lot partenaire et 1 point VENA ; niveau 5 t-shirt, badge Guerrier et 2 points VENA ; niveau 10 tenue complète, badge Légende et 5 points VENA.

### Saisons et anti-triche

Saison sportive de septembre à juillet (en cours : « L'Éveil » 2026/2027). L'XP de saison repart à zéro, l'historique reste dans le journal des XP. Les XP ne sont jamais affichés au scan (anti-farming) et toute correction admin recalcule l'XP.

### Déclenchement automatique

- Après insertion d'un log XP : un trigger incrémente l'XP, attribue les badges saisonniers et crédite les points VENA en cas de nouveau niveau.
- Après suppression d'un log XP : l'XP de saison est recalculé depuis la somme réelle des logs restants, ce qui rend la suppression réversible.

## Check-in par QR code

### Participant connecté

- L'admin crée un événement : un jeton UUID v4 et une URL de scan sont générés.
- Le participant scanne et choisit un motif : jouer, aider ou regarder.
- La Server Action vérifie l'événement (valide, scan actif, non annulé), enregistre la présence (contrainte d'unicité contre le double scan d'un même motif) puis le log XP lié ; le trigger fait le reste.
- Plusieurs motifs peuvent se cumuler sur un même événement.

### Pré-inscription sans compte

Formulaire en deux étapes : identité (prénom, nom, sexe, date de naissance, téléphone), puis motif. Une fonction SQL SECURITY DEFINER retrouve ou crée le participant à partir du couple téléphone, nom et prénom (index unique composite qui autorise une fratrie sur le téléphone d'un même parent), puis enregistre présence et XP dans une seule transaction.

## Base de données

Schéma shared : utilisateurs (extension de auth.users), organisations (vea, vena, hub_velito, arena...), permissions par utilisateur et par organisation (viewer, editor, owner).

Schéma vea, tables principales : participants (fiche membre, avec ou sans compte), evenements (dont jeton QR, scan actif, durée estimée, capacité), presences (une ligne par motif), logs_xp (journal des XP), leurs tables d'archive, catalogues et attributions de badges et de dotations, notifications.

Les écritures passent par des Server Actions et quelques fonctions SQL (scan invité atomique, helper RLS éditeur, recalcul d'XP, édition du sexe par un admin).

## Sécurité et RGPD

### Permissions

Trois niveaux par organisation : viewer (lecture), editor (événements, XP, participants), owner (tout). Une personne owner de plusieurs organisations apparaît comme superadmin dans l'interface. Vérification côté Server Component par un helper hasPermission.

### RLS

Activée sur toutes les tables vea et shared. Lecture publique des événements, lecture de ses propres présences, logs et notifications, accès complet pour les éditeurs VEA, insertion anonyme au scan uniquement via la fonction SECURITY DEFINER. Les GRANT au rôle authenticated sont indispensables en plus des policies, sinon Postgres refuse l'accès.

### Archivage

Des triggers avant suppression copient chaque présence ou log XP dans une table d'archive avec date et auteur. Aucune donnée n'est définitivement perdue : audit et restauration restent possibles.

### Mineurs et données personnelles

- Profils privés par défaut, opt-in explicite pour apparaître.
- Aucune donnée sensible publique (ni téléphone, ni adresse) : pseudo de jeu uniquement.
- Admins mineurs : prénom seul, sans nom de famille ni photo.
- Visages des mineurs floutés sur la galerie Médias.
- Mention de consentement au scan, validation des entrées côté serveur, search_path explicite dans les fonctions SQL.

## Indicateurs

Le site produit automatiquement : participants uniques avec ou sans compte, événements par saison, heures de bénévolat cumulées, répartition par motif, démographie (âge, sexe, quartier), engagement (XP, niveaux, badges). Ces chiffres alimentent les rapports d'activité d'AG et les dossiers de subvention (CAF, ANS, Cité éducative).

## Roadmap

### V2, court terme (T3 2026)

- E-mails de notification via Resend.
- Notifications étendues aux récompenses et documents.
- Fusion automatique d'un pré-inscrit avec son compte (même téléphone).
- Durée d'événement modifiable depuis l'admin.
- Fin de la migration des derniers écrans Prisma vers Supabase.

### V3, moyen terme (T4 2026 et T1 2027)

- Dépôt de documents enrichi : workflow de dépôt de ticket avec notification, justificatifs de remboursement.
- Page réunions et comptes rendus ciblés par destinataire.
- Export CSV et PDF des indicateurs d'impact.
- Refonte continue de l'admin en hub modulaire.

### V4, long terme

- Intégration ARENA (statistiques joueurs partagées).
- Application mobile (Capacitor ou React Native).
- Tournois en ligne avec brackets.
- SSO Velito complet, un compte pour tous les modules.
- Migration éventuelle vers OIDC ou Keycloak.

Automatisations annexes envisagées (Make ou n8n, environ 20 à 25 euros par mois) : rappels d'inscription, rapport d'impact mensuel, veille subventions, relances partenaires, rapport annuel.

## Critères de réussite et points CDA

Défis techniques résolus, présentés au jury :
- RLS et GRANT : suppression bloquée malgré les policies, résolue par les GRANT au niveau table.
- Multi-motif et recalcul d'XP en cascade : unicité étendue au motif, clé étrangère en cascade entre log XP et présence, fonction de recalcul.
- Archivage automatique sans toucher l'applicatif : tables d'archive et triggers avant suppression.
- Pré-inscription au scan avec gestion des fratries : index unique composite téléphone, nom, prénom.

Les trois blocs du référentiel CDA sont couverts : front, données et composants métier, architecture et sécurisation.$cdc$
where slug = 'vea-site' and (cdc is null or btrim(cdc) = '');

-- hub (9124 caractères)
update shared.projets set cdc = $cdc$Source : CDC_HUB_V2.pdf (version 2 technique détaillée, mai 2026), complété par le code de apps/hub (novembre 2026)

# Cahier des charges condensé : Hub Velito (hub.velito.fr)

Auteur : Clavel NDEMA MOUSSA (CDA, AFPA Amiens).

## Objet

Le Hub Velito est le portail d'entrée de l'écosystème Velito : la page d'accueil qui présente l'ensemble des modules et oriente le visiteur vers le bon sous-domaine. La V2 documente l'état réellement en ligne et le passage des domaines en .velito.fr.

Son rôle : faire comprendre en quelques secondes que Velito est un écosystème structuré et non un projet isolé, et donner accès à chaque module, y compris par une page d'attente soignée pour ceux qui ne sont pas encore lancés.

## Public

Cible large, sur tous les supports (ordinateur, mobile, lecteurs d'écran) :
- partenaires et financeurs, qui jaugent le sérieux ;
- clients potentiels de VENA ;
- jeunes et familles qui cherchent VEA ;
- curieux.

Le Hub doit inspirer crédibilité et donner envie d'explorer.

## Stack

- Framework : Next.js 16.2.0 (App Router), rendu serveur pour le SEO et routing.
- UI : React 19.2 et TypeScript 5.9.2.
- Styles : Tailwind CSS 3.4.19.
- WebGL bas niveau : ogl 1.0.11, pour la sphère 3D et le fond galaxie, plus léger que Three.js.
- Maths 3D : gl-matrix 3.4.4.
- Animation : gsap 3.14.2.
- Monorepo : Turborepo 2.8 et @repo/ui partagé.
- Hébergement : Vercel, déploiement continu.

## Architecture du code

- La page d'accueil est un Server Component qui rend GalaxyHero.
- GalaxyHero orchestre des imports dynamiques sans SSR vers Galaxy (fond WebGL) et InfiniteMenu (sphère 3D cliquable), qui ont besoin de window et de WebGL.
- ModulesList fournit la liste HTML accessible des modules.
- modules.ts est la source unique des neuf médaillons.
- La page /construction et sa vue client lisent les paramètres slug et mode.
- Composants transverses : NavBar, Chatbot, effet LetterGlitch.
- L'ancienne expérience au scroll (CinemaHub) est archivée en suppression douce.

## Périmètre fonctionnel

### Accueil immersif

Trois rendus selon le contexte :
- ordinateur performant : fond galaxie WebGL et sphère 3D rotative regroupant les neuf modules en textures cliquables ;
- mobile, rendu serveur ou connexion limitée : repli en dégradé et grille statique ;
- mouvement réduit demandé : grille statique sans animation et liste accessible au clavier et au lecteur d'écran, avec lien d'évitement.

### Les neuf médaillons

Source unique de vérité, consommée par la sphère, la liste accessible, le repli et la page /construction. Trois niveaux :
- modules historiques : VEA, ARENA, Interactive, Prévention, sur leurs sous-domaines .velito.fr ;
- sous-marques VENA : Services (agence), Plateforme, Prod, Store, vers /construction ;
- service transversal : Morse, messagerie unifiée (le code morse comme langage de signaux), vers /construction.

Chaque module porte un slug, un nom, une URL, une couleur d'accent, une description, une image (texture WebGL), une accroche et un résumé. Une URL qui commence par http ouvre le module en ligne dans un nouvel onglet, sinon la navigation reste interne vers /construction. Quand un sous-domaine sort, il suffit de basculer son URL.

### Page « En construction » centralisée

La vue lit les paramètres slug et mode et adapte nom, accent, image et accroche à partir de modules.ts. Deux modes : construction (« Module en développement ») et soon (« Très prochainement », pour une date connue). Un module non lancé donne ainsi une image professionnelle, sans page d'erreur.

### Navigation et habillage

Barre de navigation partagée, chatbot d'accueil, effet LetterGlitch comme signature visuelle. Chaque module pointe vers le Hub et réciproquement.

## Hors périmètre en V2

- Pas de collecte de données personnelles sur le Hub vitrine.
- La connexion unique n'est pas active pour le grand public : l'architecture l'anticipe seulement (cookies partagés sur .velito.fr, table shared.user_permissions).

## Accessibilité

Exigence forte, le Hub étant entièrement WebGL dans sa version riche :
- ModulesList fournit une alternative HTML complète, chaque module étant un lien accessible ;
- un lien d'évitement mène au contenu principal ;
- prefers-reduced-motion coupe les animations ;
- aucune information n'est portée uniquement par le canvas WebGL.

## Socle mutualisé et compte unique

Le Hub porte ce que tous les modules partagent : la marque, la base de design (@repo/ui) et la préparation d'un compte unique, un identifiant pour tous les services Velito, à la manière d'un compte Google.

## Sécurité

HTTPS et en-têtes de sécurité standard. La future couche SSO doit suivre OAuth2 et OIDC (jetons signés, scopes limités).

## Roadmap

### V1 (en ligne)

Accueil immersif WebGL avec trois rendus, neuf médaillons, page /construction paramétrée, navigation inter-modules, chatbot.

### V2, court terme

- Sections d'accueil sous le hero : « Comment ça marche » (Hub, modules, compte unique), « Module vedette : VEA », pied de page complet.
- Affinage de l'UX mobile et des performances WebGL (chargement progressif des textures).
- Bascule des URL de modules.ts vers les sous-domaines au fil des sorties.

### V3, moyen terme

- Compte unique Velito actif pour le grand public, session partagée entre modules.
- Module Morse intégré en WebView dans chaque app.
- Tableau de bord transverse : mes accès, mes notifications.

### V4, long terme

- Ouverture du SSO à des services tiers (fédération d'identités, par exemple l'application MABB e-basket).
- Marketplace ou annuaire de services Velito.
- Application mobile appuyée sur les API de l'écosystème.

## Critères de réussite et points CDA

- WebGL accessible : sphère 3D, alternative HTML complète et mouvement réduit, preuve que l'accessibilité est traitée dans une interface graphique avancée.
- Source unique (modules.ts) consommée par quatre rendus : factorisation et cohérence.
- Frontière serveur et client maîtrisée : page serveur pour le SEO, import dynamique sans SSR pour le WebGL.

## Évolutions depuis la V2

Cette section décrit ce que montre le code de apps/hub, pas le PDF.

### Connexion unique

- Le Hub a désormais ses pages de compte : connexion, inscription, mot de passe oublié, réinitialisation, déconnexion, espace compte.
- Connexion par e-mail et mot de passe via Supabase Auth, avec captcha hCaptcha obligatoire depuis l'activation de la protection anti-bot de Supabase (juin 2026). Le message d'erreur ne révèle pas si l'e-mail existe.
- Le cookie de session est posé avec un domaine lu dans la configuration, fixé à .velito.fr en production : il est partagé entre velito.fr et tous ses sous-domaines. En local, il reste sur localhost.
- Le cookie garde les protections HttpOnly, Secure et SameSite=Lax : seule sa portée est élargie.
- Un middleware rafraîchit la session à chaque requête, sans redirection ; chaque page protégée fait sa propre vérification.

### Fournisseur OAuth et OIDC

Le Hub devient serveur d'autorisation OAuth 2.0 et OIDC (migration du 30/05/2026) :
- flux Authorization Code avec PKCE, méthode S256 obligatoire, plain refusé ;
- points d'accès : autorisation, consentement, jeton, userinfo, jwks.json et openid-configuration ;
- redirect_uri vérifiée contre une liste blanche exacte par client, sans joker ;
- codes d'autorisation à usage unique, valables 60 secondes ;
- access_token et id_token en JWT signés RS256, valables une heure, vérifiables par les apps via la clé publique ;
- refresh_token opaque valable 30 jours, à usage unique, avec rotation par famille : la réutilisation d'un ancien jeton révoque toute la famille ;
- consentement enregistré par utilisateur, application et scopes, sauté pour les applications maison ;
- clés de signature stockées côté serveur, clé privée jamais exposée, rotation prévue ;
- tables sous RLS sans aucune policy : accès réservé au serveur ;
- fonction de purge des codes et jetons expirés, à lancer en tâche planifiée.

Clients maison déclarés : hub, interactive, arena, prevention et vena. VEA n'en fait pas partie, volontairement, pour séparer l'association de la SASU.

### Page Projets

La page hub.velito.fr/projets (07/11/2026) suit chaque projet :
- une fiche par projet : nom, résumé, statut (idée, en cours, en pause, livré, abandonné), URL de production, dépôt, stack, CDC ;
- une roadmap en étapes pondérées de 1 à 5 ; le pourcentage d'avancement est calculé, jamais saisi, les étapes abandonnées sortant du calcul ;
- un journal daté : fait, décision, bug, note ;
- des membres avec trois rôles : propriétaire (gère le projet et ses membres), dev (alimente roadmap et journal), lecteur.

Accès :
- l'admin du Hub (owner de l'organisation hub_velito) voit et gère tout ;
- les autres ne voient que les projets dont ils sont membres, la connexion étant obligatoire ;
- projets privés par défaut ; une case « public » expose seulement nom, résumé public, statut et pourcentage, jamais le CDC ni le journal ;
- RLS et GRANT posés ensemble, droits du rôle anonyme retirés sur les tables ;
- ajout d'un membre par e-mail via une fonction contrôlée, réservée à l'admin ou au propriétaire du projet.$cdc$
where slug = 'hub' and (cdc is null or btrim(cdc) = '');

-- vena-site (7796 caractères)
update shared.projets set cdc = $cdc$Source : CDC_VENA_V2.pdf (version 2 technique détaillée, mai 2026)

# Cahier des charges condensé : site VENA

Auteur : Clavel NDEMA MOUSSA (CDA, AFPA Amiens). Structure : VENA, Velito Expertise Numérique Amiens, SASU au capital de 500 euros.

Le PDF documente le site sous l'adresse vena.velito.fr.

## Objet

VENA est la SASU qui porte l'activité commerciale de Velito. Son site est la vitrine de l'entreprise : présenter l'offre de services, inspirer confiance et générer des demandes de contact et de devis. La V2 documente l'état en ligne et le passage des domaines en .velito.fr.

Si VEA est l'association de terrain, VENA est l'entreprise : la structure qui facture, finance le développement des autres modules et accompagnera les organisations qui voudront utiliser ARENA, Interactive ou Prévention.

## Positionnement éditorial

Le site refuse les codes de l'agence corporate : pas de jargon (« solutions sur mesure », « expertise complète »), pas de photos de bureaux lisses. Ton direct, à la première personne, ancré localement. VENA, c'est Clavel et une équipe qui se construit, et cette honnêteté est un argument commercial : le client sait à qui il parle.

Identité visuelle propre (palette crème, pastel, kaki), distincte de VEA mais cohérente avec le Hub.

## Public

Acteurs économiques d'Amiens et alentours :
- petites entreprises et commerçants ;
- associations ;
- organisateurs d'événements ;
- à terme, collectivités.

Profils souvent peu technophiles, qui cherchent un interlocuteur clair et joignable.

## Stack

- Framework : Next.js 16.2.0 (App Router), rendu serveur, routing, Server Actions.
- UI : React 19.2 et TypeScript 5.9.2.
- Styles : Tailwind CSS 3.4.19, palette VENA.
- Animation : gsap 3.14.2, pour le menu animé de la carte de visite.
- Backend et base : Supabase (supabase-js 2.45, ssr 0.5.2) pour les demandes de contact, les signalements et l'authentification admin.
- E-mails : service transactionnel Resend, notification au bureau et accusé de réception au client.
- Monorepo : Turborepo 2.8 et @repo/ui partagé.
- Hébergement : Vercel, déploiement continu.

## Architecture du code

- Accueil éditorial : services 01 à 04, manifeste, mot du fondateur.
- contact : page et Server Action de demande de devis.
- lien : carte de visite numérique.
- signalement : page et Server Action de signalement de contenu.
- mentions-legales : mentions légales.
- login : connexion admin.
- admin : espace d'administration, dont le traitement des signalements.
- Composants : Navbar, Footer, ChatBot, FlowingMenu, LanyardCard, SignalementForm.

## Offre de services présentée

- 01, Développement web : sites et applications rapides et propres, associatif, e-commerce, applications métier, tableaux de bord d'administration sur mesure.
- 02, Production vidéo et photo : couverture d'événement, vidéo de présentation, motion design simple, drone, montage.
- 03, Location de matériel : caméras, son, lumière, installation de streaming Twitch ou YouTube, à la journée ou au week-end, à Amiens et alentours.
- 04, Formation et accompagnement : montée en compétence des structures qui veulent gérer une partie de leur numérique.

## Périmètre fonctionnel

### Page d'accueil éditoriale

Construite comme un magazine, pas comme un catalogue :
- hero brut : qui on est, en trois lignes ;
- quatre services en sections pleine largeur alternées (fonds blanc, tilleul, pêche, kaki) ;
- manifeste en trois convictions ;
- mot du fondateur ;
- lien narratif avec l'écosystème, notamment VEA ;
- appel à l'action final direct.

Les URL du Hub et de VEA sont écrites en dur en production, pour ne pas dépendre d'une variable d'environnement restée sur localhost.

### Demande de devis et contact

C'est le cœur business. Le formulaire structuré passe par une Server Action qui :
- enregistre la demande dans la table vena.demandes_contact ;
- envoie une notification au bureau ;
- envoie un accusé de réception au client.

Pas de paiement en ligne à ce stade. Un bug de trigger de notifications avait cassé l'envoi du devis : il est corrigé.

### Carte de visite numérique

Page façon carte de visite : menu animé FlowingMenu (gsap, version ordinateur) et LanyardCard, carte d'identité recto verso en version sûre pour le lancement ; une version 3D de type lanyard est préparée. Barre de navigation et pied de page masqués sur cette page, version mobile dédiée. Pratique à partager en rendez-vous ou sur les réseaux, elle montre le savoir-faire par l'exemple.

### Signalement

Un formulaire et sa Server Action permettent de signaler un contenu ou une situation problématique, en cohérence avec la responsabilité que Velito porte sur le numérique et la protection des publics.

### Back-office et mentions légales

- Connexion admin, puis espace d'administration avec traitement des signalements.
- Mentions légales avec la SASU identifiée : le sérieux administratif fait partie de la crédibilité face aux clients professionnels et aux collectivités.

## Hors périmètre en V1

- Pas de paiement en ligne.
- Pas de donnée bancaire traitée sur le site.
- Pas d'espace client ni de compte unique côté clients (prévu en V3).

## Base de données

Schéma vena dans la base Supabase partagée de l'écosystème :
- vena.demandes_contact : demandes de devis et de contact (nom, e-mail, besoin, statut, horodatage) ;
- une table des signalements.

Authentification admin par Supabase (@supabase/ssr). RLS active : lecture et écriture des demandes réservées aux administrateurs VENA.

## Sécurité et RGPD

- HTTPS et en-têtes de sécurité standard.
- Données personnelles limitées au formulaire de contact.
- Politique de confidentialité, conservation limitée au traitement légitime de la demande, droit de suppression.
- E-mails transactionnels envoyés par un service à bonne délivrabilité.
- Aucun paiement ni donnée bancaire traités.

## Place dans l'écosystème

VENA est le moteur économique de Velito. VEA lui apporte un terrain réel et des références ; VENA apporte à VEA un cadre professionnel et des moyens, et facturera l'accompagnement des structures qui adopteront ARENA, Interactive ou Prévention.

Au-delà du site, VENA porte une vision plus large d'écosystème de services numériques : 39 projets ou concepts recensés (Hub IA, plateformes, automatisation, mise en relation, pôle sport et MABB, pôle local, etc.). Le site V1 en est la première brique visible.

## Roadmap

### V1 (en ligne)

Accueil éditorial, quatre services, demande de devis avec e-mails, carte de visite, signalement, back-office des signalements, mentions légales.

### V2, court terme

- Portfolio de réalisations et études de cas.
- Pages services enrichies : détail des offres, tarifs indicatifs.
- Page « À propos » avec l'équipe et la vision.
- Suivi CRM léger des demandes dans l'admin : statuts, relances.

### V3, moyen terme

- Espace client sécurisé : suivi de projet, livrables, échanges, début du compte unique Velito côté clients.
- Réservation de matériel en ligne, devis interactif.
- Module de paiement (acomptes, réservations) si pertinent.
- Passerelles VEA et VENA, par exemple la captation vidéo d'un événement VEA proposée comme service.

### V4, long terme

- Marketplace et mise en relation entre freelances et entreprises.
- Messagerie Velito (module Morse) intégrée.
- Plateformes verticales (Hub IA, automatisation) et compte unique Velito généralisé.

## Critères de réussite et points CDA

- Chaîne complète de traitement d'une demande (Server Actions, Supabase, e-mails transactionnels) sans API REST séparée.
- Animation gsap maîtrisée, avec version mobile et repli sûr pour le lancement : gestion du risque sur une interface avancée.
- URL de production écrites en dur : robustesse face aux variables d'environnement, leçon tirée d'un incident de liens localhost en production.$cdc$
where slug = 'vena-site' and (cdc is null or btrim(cdc) = '');

-- arena (11968 caractères)
update shared.projets set cdc = $cdc$Source : CDC_ARENA_V3.pdf (V3, 28 mars 2026, basé sur CDC V2 et Mini CDC ARENA) ; ARENA_SPEC_COMPLETE_V1.pdf (présentation partenaires et spécifications techniques V1, 28 mars 2026). Auteur : Clavel NDEMA MOUSSA, VENA / VEA, Amiens.

# ARENA : hub centralisateur de l'esport amateur

## Objet

ARENA (arena.velito.com dans les sources) se veut l'infrastructure neutre et gratuite de l'esport amateur français, sur le modèle de l'app FFBB pour le basket ou de Lichess pour les échecs. Le problème visé n'est pas le manque d'outils mais leur fragmentation : les joueurs cherchent des tournois sur cinq outils, les associations gèrent tout sur WhatsApp, tableurs et Facebook, les résultats sont perdus après chaque tournoi et les institutions n'ont aucune vision du terrain.

En une phrase : ARENA centralise ce qui est éparpillé, sans demander à personne de changer d'outil du jour au lendemain.

Stratégie d'adoption en trois temps :
- Temps 1, « branchez-vous, gardez vos outils » : ARENA importe les résultats de Toornament ou Challonge par API ; les profils joueurs, l'historique et les exports subventions existent sans changer le flux de travail.
- Temps 2, « vous voyez la plus-value » : après quelques imports, les joueurs ont un vrai profil et l'association des statistiques agrégées.
- Temps 3, « pourquoi faire tourner deux outils ? » : migration naturelle, choisie et non imposée.

Ce qu'ARENA n'est pas : un outil de tournoi de plus qui exige de tout migrer, un concurrent agressif, une plateforme payante ou fermée, une nouvelle fédération. Pas de publicité, pas de monétisation des joueurs.

## Public

- Joueur amateur : trouver des tournois, avoir un profil centralisé, suivre sa progression.
- Association esport (VEA en premier, terrain de test V1) : gérer les tournois, le check-in, exporter des statistiques pour les subventions.
- Fédérations (FFJV, France Esport) : visibilité terrain, données sur la pratique amateur.
- Organisateur privé (bar, MJC) : créer facilement un tournoi ponctuel.
- Parent : comprendre la pratique de son enfant, accéder à la prévention.

## Positionnement face aux outils existants

- Toornament : import API en V1, priorité immédiate (API publique).
- Challonge : import API en V1 (API REST publique).
- Battlefy : import partiel en V2, API peu documentée.
- Play Tournament : import V2 ou V3, pas d'API publique connue.
- FFJV et France Esport : partenariats institutionnels cibles (données terrain, légitimité).
- Twitch et YouTube : liens de stream par tournoi et par match (V1) ; Discord : webhooks de résultats (V2).

## Stack

- Module Next.js (App Router, TypeScript) dans le monorepo Velito (Turborepo), sous apps/arena.
- Tailwind CSS v3, Prisma v5, Supabase PostgreSQL partagée avec le hub.
- Supabase Auth (JWT) en V1, migration vers Keycloak / OIDC prévue en V3 pour le SSO Velito.
- PWA (next-pwa), pas d'application native en V1.
- Génération de QR code côté serveur (paquet qrcode).
- Algorithme de bracket écrit en TypeScript maison, sans bibliothèque.
- Validation des entrées par Zod, tests avec Vitest et supertest.
- Hébergement Vercel.

## Périmètre fonctionnel V1 (VEA-first)

### Profil joueur, cœur du produit

- Pseudo, jeux pratiqués, équipes, bio courte.
- Historique des compétitions, construit aussi automatiquement à partir des imports.
- Badges automatiques : participation, fair-play, bénévolat, série de tournois (streak), scores validés sans correction, activation du suivi jeu responsable.
- Profil public partageable par lien direct ; statut « free agent » pour jouer sans club.

### Gestion des tournois

- Formats V1 : élimination simple (prioritaire), double élimination (soirées plus longues), poules puis phase finale (beaucoup de joueurs).
- Bracket algorithmique : nombre de tours égal au log2 arrondi au supérieur, cases vides (byes) pour compléter à une puissance de 2, tirage au sort, qualification automatique sur un bye, progression du gagnant vers la case parente.
- Fiche match : participants, horaire, statut (à jouer, en cours, terminé, litigieux, validé).
- Saisie des scores par le staff ou les joueurs, validation staff obligatoire ; un match non validé ne débloque pas le suivant.
- Inscription et check-in des joueurs.
- QR code par tournoi menant à une page publique imprimable, sans compte.
- Page spectateur (arbre, scores, stream) et page participant (match à jouer, adversaire, check-in).
- Historique et audit : qui a saisi, qui a validé, quand (scores, modifications, litiges, check-in, démarrage et fin de tournoi).

### Classement inter-tournois

- V1 : points simples par jeu et par organisation (victoire 3, finaliste 2, top 4 1, participation 0 pour la trace statistique), classement obtenu par simple somme.
- Pas d'ELO en V1 : Glicko-2 envisagé en V2 seulement si la base de joueurs récurrents le justifie (avec deux ou trois tournois par an et une trentaine de joueurs, le calcul n'a pas de sens).

### Import des tournois existants

- Toornament et Challonge en V1 : récupération des résultats et participants.
- Premier usage concret : importer les tournois VEA passés (FIFA, SF6) pour disposer d'un historique dès le lancement.

### API et exports

- Architecture API-first : chaque tournoi, joueur et résultat exposé sous /api/arena/, JWT exigé sur les routes protégées.
- API publique en lecture seule par clé API : tournois publics, brackets, profils publics, classement. Aucune donnée personnelle (e-mail, consentement, dépenses). Usages visés : bots Discord, sites de clubs, overlays de stream.
- Export JSON complet par tournoi (présenté comme l'équivalent du PGN aux échecs) pour les rapports d'activité et dossiers de subvention ; export des statistiques agrégées par organisation.

### Pilier « Jeu Responsable », dès la V1

Ancré dans l'expérience personnelle du fondateur et le travail de terrain de VEA dans les QPV d'Amiens.
- Suivi déclaratif des dépenses in-game : montant, jeu, type (passe de combat, skin, monnaie virtuelle, loot box, DLC, abonnement, autre), graphique mensuel.
- Données 100 % privées par défaut, aucune connexion automatique aux plateformes en V1.
- Espace prévention « Le savoir c'est le pouvoir » : pay-to-win, dark patterns, boucles addictives, cyber-harcèlement, ressources pour en parler.

### Rôles et permissions

- Super-admin Velito : configuration globale, supervision de toutes les organisations.
- Admin organisation : ses tournois, son staff, ses exports.
- Staff tournoi : saisie des scores, validation, litiges.
- Responsable club : ses équipes, effectifs, inscriptions.
- Joueur : profil, inscriptions, suivi des matchs.
- Spectateur : consultation sans compte.

## Entités principales du modèle de données

- Organisation : nom, slug unique, logo, couleur, site ; possède tournois et membres.
- MembreOrga : lien joueur et organisation avec un rôle (admin, staff tournoi, responsable club).
- JoueurArena : pseudo unique, lien optionnel au compte d'authentification, jeux, bio, profil public, déclaration d'âge, horodatage du consentement, contact du représentant légal si mineur.
- Tournoi : organisation, titre, jeu, format, statut (brouillon, ouvert, en cours, terminé, annulé), dates, lieu, capacité, jeton QR unique, lien de stream.
- ParticipationTournoi : inscription d'un joueur à un tournoi, avec check-in horodaté.
- BracketNode : case de l'arbre (tour, position, case parente, joueurs, gagnant, bye).
- Match : tour, position, joueurs, scores, statut, validé, auteur de la saisie, auteur de la validation, stream.
- ActionLog : journal d'audit typé par action et par acteur.
- ScoreJoueur : points par joueur, jeu et tournoi, avec motif traçable.
- DepenseDeclaree : dépenses déclarées par mois et par type.
- Badge : type, contexte, date d'obtention.

## Sécurité, mineurs et RGPD

L'esport amateur touche massivement les 12-17 ans : ce volet est non négociable dès la V1.

- Moins de 15 ans : consentement parental requis. À l'inscription, case « J'ai 15 ans ou plus » ou « Mon représentant légal a consenti » ; pour un mineur déclaré, e-mail de confirmation envoyé au responsable légal.
- Log de consentement horodaté en base.
- Minimisation : le pseudo suffit, nom, e-mail de profil et âge optionnels par défaut ; aucune donnée personnelle dans les URL.
- Droit à l'effacement : profil anonymisé (pour préserver l'intégrité des historiques de tournois), dépenses supprimées, compte d'authentification supprimé.
- Politique de confidentialité accessible avant inscription ; CGU et mentions légales à rédiger avant de lancer le formulaire d'inscription (point bloquant).
- Multi-tenant strict : filtrage par organisation_id dans toutes les requêtes, aucune donnée d'une organisation visible d'une autre.
- Serveur authoritative : aucun score accepté sans validation serveur puis confirmation staff.
- Socle OWASP ASVS : JWT courte durée avec rotation, validation Zod stricte, HTTPS, aucun secret dans les logs.

## Modèle économique

ARENA est gratuit, sans exception. Le financement vient de l'écosystème :
- Subventions publiques (DGE esport, ANCT, DRAJES, région Hauts-de-France) : V2, 12 à 18 mois après la V1.
- Partenariat institutionnel (FFJV, France Esport) qui cofinance un bien commun apportant de la donnée terrain : V2 ou V3, après une démo V1.
- Accompagnement VENA (implémentation, formation, support facturés aux organisations qui le souhaitent) : dès la V2.
- Éditeurs et sponsors : V3, si traction nationale.

Timing : ne contacter les institutions qu'avec une V1 fonctionnelle sur un vrai tournoi, démarche prévue fin 2026 / début 2027.

## Hors périmètre V1

- Application mobile native (V3, React Native sur l'API existante).
- Round-robin (V2) et format type Chess.com (hors périmètre).
- Classement Glicko-2 (V2 conditionnel).
- Connexion automatique aux plateformes pour les dépenses (V2 si API disponibles).
- Imports Battlefy et Play Tournament, webhooks Discord, multi-organisation avancée (V2).

## Roadmap

### V1 : VEA-first, automne 2026

Profil joueur, tournois VEA (élimination simple, double élimination, poules), QR code, rôles, classement par points simples, API read-only, export JSON, suivi déclaratif des dépenses, RGPD mineurs. État indiqué dans la V3 : à faire.

### V2 : hub centralisateur, 2027

- Imports Battlefy et Play Tournament selon faisabilité, webhooks Discord, résultats officiels FFJV, annuaire des associations du local au national.
- Jeu Responsable approfondi : temps de jeu Steam, dépenses réelles PSN, Nintendo, Epic si API, corrélation temps et dépenses, alertes douces activées seulement à la demande du joueur, témoignages anonymes modérés.
- Multi-organisation : espaces avec branding, championnats, saisons, classements, litiges structurés, compétitions interclubs.
- Glicko-2 si base récurrente suffisante.

### V3 : écosystème national, 2027 et au-delà

Application mobile, API publiques enrichies, SaaS multi-organisations avec abonnements si ce scénario est retenu, intégrations éditeurs (Riot, Ubisoft, Epic), analytics IA (progression, détection de talents), messagerie VENA, SSO Velito complet, module vidéo (highlights, clips, analyse annotée).

## Points d'action avant de coder

- Bloquant : identifier le tournoi VEA réel qui servira de terrain V1 (date, format, nombre de joueurs). Sans terrain, pas de test utilisateur.
- Bloquant : rédiger CGU et mentions légales ARENA.
- Avant V1 : trancher le modèle économique.
- Avant V2 : analyser la faisabilité des API Battlefy et Play Tournament, contacter FFJV et France Esport.

## Critères de réussite

- Un vrai tournoi VEA mené de bout en bout sur ARENA, servant de démo aux institutions.
- Tests avant V1 : unitaires sur le bracket, intégration sur endpoints et permissions, isolation multi-tenant, suppression RGPD, QR code et PWA hors ligne.
- Historique VEA importé dès le lancement et exports exploitables pour les dossiers de subvention.

Synergies : profil, badges et QR check-in reprennent la logique VEA ; l'API publique alimente le hub Velito.$cdc$
where slug = 'arena' and (cdc is null or btrim(cdc) = '');

-- interactive (10716 caractères)
update shared.projets set cdc = $cdc$Source : CDC_INTERACTIVE_V2_1.pdf (CDC v2 technique détaillée, mai 2026, avec annexe Loup-Garou éditée le 28 mai 2026). Auteur : Clavel NDEMA MOUSSA (CDA, AFPA Amiens).

# Velito Interactive : jeux multijoueurs temps réel pour bars et MJC

## Objet

Velito Interactive (interactive.velito.fr) est une solution web d'animation temps réel pour bars et MJC : un écran TV sert d'affichage public, les smartphones des participants servent de manettes. L'objectif est un MVP exploitable en conditions réelles, avec un périmètre cadré pour tenir la livraison du 25 juin 2026. Lancement prévu à Amiens.

Cœur du MVP : quatre jeux (GEO, Blind Test, Quiz, Petit Bac), onboarding par QR code et PIN, expérience joueur sans compte, mode Autopilot (enchaînement automatique) et mode Animation (contrôle manuel), architecture multi-tenant avec personnalisation visuelle par établissement.

État au moment du CDC : le site affichait une page « Bientôt disponible », le code était une app Next.js minimale (page et layout). Le CDC fixe le périmètre visé.

## Objectifs et hypothèses

Objectifs V1 :
- Exploitation sans friction : scan, pseudo, jouer ; aucun e-mail demandé au joueur.
- Différenciation : jeu GEO spectaculaire et theming propre à chaque bar.
- Robustesse terrain : Wi-Fi variable, joueurs qui rejoignent en cours, latence.
- Évolutivité : anticiper le passage multi-nœuds en V2.

Hypothèses cadrantes :
- Une session de bar égale un flux principal, une TV maître, des smartphones contrôleurs.
- Environ 10 minutes par jeu, une soirée d'environ 1 h 30.
- Une seule session active par établissement en V1.
- Cible : 50 joueurs simultanés, latence perçue inférieure à 300 ms sur les actions critiques.

## Public

- Client payeur : bars et MJC (staff, animateurs).
- Utilisateur final : les participants, sans compte ni e-mail.

## Stack

- Front : Next.js pour trois interfaces (TV, mobile, dashboard), dans le monorepo Velito.
- Backend : Node.js / NestJS (API HTTP et WebSockets), logique serveur et machine à états de session.
- Temps réel : Socket.IO, une room par session, accusés de réception (acks) sur les actions critiques.
- Base : PostgreSQL (tenants, staff, sessions, packs, audit léger).
- Cartographie : Leaflet et tuiles OpenStreetMap pour GEO, dans le respect de la Tile Usage Policy et de l'attribution.
- Hébergement : à définir, serveur Node persistant ; le temps réel reste côté NestJS, pas dans Next.js.

Principes d'architecture :
- Serveur authoritative : scores et états calculés côté serveur, clients en simple rendu.
- Fiabilité par acks (envoi par défaut « at most once ») et resynchronisation d'état.
- Isolation multi-tenant par tenant_id.

## Périmètre fonctionnel V1

### Parcours et interfaces

- TV : état global, timer, QR et PIN, jeu en cours, classement, transitions.
- Mobile : onboarding, réponse (QCM, ping sur la carte, texte), retour immédiat.

### Onboarding QR et PIN

- Le staff crée une session depuis le dashboard, en mode Autopilot ou Animation.
- La TV affiche un QR code et un PIN.
- Le joueur scanne, saisit un pseudo et choisit FR ou EN.
- Le serveur attribue un player_token limité à la session, utilisé pour toutes les soumissions.
- Anti-doublon : pseudo unique dans la session, suffixe automatique en cas de collision.

### Anti-triche et modération

- Une réponse par manche et par joueur, contrôlée par le serveur.
- Reconnexion possible, mais duplication de socket ou de pseudo refusée.
- Limitation de débit sur les tentatives de PIN et le spam de soumissions.
- Modération staff : exclusion d'un joueur et blocage de sa reconnexion.

### Multi-tenant et theming

Isolation par tenant_id des sessions, du staff, du branding et des contenus. Personnalisation TV et mobile par variables CSS (logo, couleurs) : le bar adopte l'expérience comme une extension de sa direction artistique.

### Les quatre jeux

- GEO (jeu phare) : « ping la carte, le plus proche gagne ». Modes Monde, France, Amiens, Monuments. 20 s par manche, 5 manches par défaut (paramétrable 5, 7 ou 10). Pings simultanés affichés sur la TV, puis révélation, distances et classement. Score : fonction décroissante de la distance plafonnée à 0, plus un bonus de vitesse ; départage par la vitesse puis la distance.
- Blind Test : lecture audio sur la TV, packs Velito uniquement en V1, QCM à 4 choix sur mobile, extrait de 10 s, fenêtre de réponse de 10 à 15 s. Score : bonne réponse plus bonus de vitesse, 0 sinon.
- Quiz : QCM à 4 choix, 10 packs de 10 questions (culture générale, sport, cinéma, Amiens, animaux), timer de 15 à 20 s. Score : bonne réponse plus bonus de vitesse.
- Petit Bac : roue de lettres animée sur la TV, 8 catégories, 60 s de saisie. Validation manuelle par l'animateur (orthographe, variantes).

### Modes Autopilot et Animation

- Autopilot : exécute une playlist de jeux, transitions, classements et bandeau promo du bar, sans intervention hormis l'arrêt.
- Animation : panel animateur (pause, reprise, passer, relancer une manche, exclure un joueur, changer de pack, arrêter), appuyé sur la machine à états serveur.

### Dashboard bar

- Authentification staff par e-mail et mot de passe, rôles admin et animateur.
- Paramétrage du branding : logo, couleurs, message promo.
- Création de session : mode, jeux et packs, paramètres.
- Modération et actions en direct.
- Historique minimal : sessions, nombre de joueurs.
- Paiement : Stripe possible en V1 (Checkout, Customer Portal) si l'onboarding est en libre-service, sinon facturation manuelle au départ.

## Modèle de données (vue d'ensemble, tenant_id partout où applicable)

- tenants : logo, couleurs du thème, message promo, langue par défaut.
- staff_users : e-mail, empreinte du mot de passe, rôle.
- sessions : PIN, statut, mode, horodatages.
- session_players : pseudo, langue, socket, player_token, date d'exclusion.
- session_events : type et charge JSON (audit léger).
- geo_questions : périmètre, latitude, longitude, libellé, difficulté.
- quiz_packs et quiz_questions ; blind_packs et blind_tracks (audio, choix, réponse).
- petitbac_categories et petitbac_round_answers (réponses et validation).
- Index recommandés : PIN de session unique ; couple session et pseudo unique (anti-doublon) ; couple session et socket (reconnexion, exclusion).

## Protocole WebSocket (nomenclature scope.action)

- session.join (client vers serveur, avec ack) : PIN, pseudo, langue.
- session.state (serveur vers client) : attente, en cours ou résultats, jeu, manche, timer.
- round.prompt (serveur vers client), round.submit (client vers serveur, avec ack), round.results (classement et explication).
- admin.command (client vers serveur, avec ack) : pause, passer, exclure, arrêter.
- error (serveur vers client) : code et message.

Flux type : création de session par le staff authentifié, PIN et état, session.join, ack et player_token, démarrage, round.prompt, round.submit, ack, round.results.

## Sécurité, mineurs et RGPD

- Staff authentifié par JWT, guards NestJS côté WebSocket.
- Joueurs sans compte ni e-mail : stockage minimal (pseudo et événements), pseudonymisation conforme aux recommandations CNIL.
- PIN à durée de vie limitée.
- Validation des entrées (taille des textes du Petit Bac, coordonnées GEO) et limitation de débit.
- Le CDC ne prévoit pas de dispositif spécifique aux mineurs : la protection repose sur l'absence de compte et la minimisation des données.

## Hors périmètre V1

- Mode équipe.
- Créateur de quiz par les bars.
- Upload de musique ou intégration Spotify.
- Comptes joueurs persistants.
- Plusieurs sessions simultanées par établissement.
- Loup-Garou (backlog V2, voir annexe).

## Roadmap

### V1 : livraison le 25 juin 2026

Quatre jeux de bout en bout, connexion QR et PIN avec anti-doublon, machine à états, Autopilot et Animation, branding par tenant, FR et EN, tests à 50 joueurs, tests Wi-Fi terrain et stabilisation. Découpage en 6 sprints du 2 mars au 25 juin.

### V2 : évolutivité et profondeur

Multi-nœuds (sticky sessions et adaptateur Redis pour Socket.IO), multi-sessions par établissement, mode équipe, créateur de quiz pour les bars, upload musique ou Spotify, analytics et exports avancés, comptes joueurs persistants pour garder son score. Loup-Garou candidat numéro 1.

### V3 : extension

Offre multi-sites et entreprises, nouveaux jeux, marque blanche, intégration au compte unique Velito.

## Modèle économique

- Lancement : 29 euros, réservé aux 3 premiers bars (acquisition).
- Standard : 39 euros, après le lancement (pérennité du support et de la maintenance).
- Entreprise : sur devis, multi-sites et besoins spécifiques (V2 et au-delà).

Facturation et support sont portés par VENA.

## Critères de réussite et tests

- 50 joueurs par session, moins de 300 ms entre soumission et ack, diffusion des résultats par lots pour limiter le nombre d'événements.
- Tests unitaires du scoring (GEO, Quiz, Blind Test) et de la machine à états.
- Tests d'intégration WebSocket (join, submit, results).
- Simulation de 50 joueurs par scripts multi-sockets.
- Tests Wi-Fi en bar réel : pertes, congestion, Android et iOS, lecture audio.

## Annexe incluse : Loup-Garou (backlog V2)

L'annexe fixe la mécanique sans modifier la V1. Jeu de bluff sans cartes : rôle secret sur le téléphone, TV narratrice des phases nuit et jour, débat à voix haute. De 5 à 18 joueurs (7 à 12 recommandés), 15 à 30 minutes par partie.

- Rôles : Loups, Loup Blanc (camp solo), Villageois, Voyante, Sorcière, Chasseur, Cupidon, Salvateur, Voleur, Montreur d'Ours, Idiot du Village, Bouc Émissaire, et Maire élu (voix double, départage).
- L'ordre de résolution de la nuit est une règle du jeu à part entière ; la TV ne montre jamais d'information secrète.
- Un joueur absent ou déconnecté ne doit jamais figer la partie : le serveur tranche à l'expiration du timer.
- Raisons du classement en V2 : état privé par joueur (politiques d'accès restrictives, modèle de sécurité différent), machine à états à phases ordonnées et asymétriques, état de partie riche, droit de vote par joueur à modéliser proprement, voisinage dynamique, victoire à trois camps. Le socle V1 (timer serveur, soumissions, votes, lobby QR et PIN) reste réutilisé.
- Découpage : V2.0 set minimal jouable, V2.1 profondeur (Salvateur, Voleur, variantes). Narration automatique ou meneur humain : choix à trancher au développement.

## Synergies avec l'écosystème

Onboarding QR et pseudo identique au check-in VEA et ARENA ; theming multi-tenant réutilisable par Prévention ; backend temps réel Node, brique nouvelle pour l'écosystème.

## Documents annexes

Specs de jeux dans Velito-site/docs/interactive/ (Faussaire, Loup-Garou, playtests) et apps/interactive/docs/CDC_JEU_SNIPE.md, non résumées ici.$cdc$
where slug = 'interactive' and (cdc is null or btrim(cdc) = '');

-- cours (5883 caractères)
update shared.projets set cdc = $cdc$Source : docs/CDC_COURS_VELITO.md (rédigé le 12/07/2026)

# Cours : cahier des charges condensé

Espace de révision et de lutte contre le décrochage scolaire, sous-domaine cours.velito.fr, application apps/cours du monorepo Velito-site. Auteur : Clavel NDEMA MOUSSA.

## Objet

Aider, à son échelle, des jeunes en décrochage scolaire de la communauté VEA et VENA : leur donner un endroit pour réviser autrement, créer leurs propres fiches et cours, être aidés sur leurs devoirs de façon fiable et sourcée, et reprendre confiance. C'est un levier d'inclusion, au cœur de la mission VEA, et un argument pour les dossiers de subvention.

Chaque fonctionnalité se juge à une seule question : est-ce que ça aide vraiment un jeune décroché ?

## Public

- Clavel, pour sa révision personnelle du titre CDA (module code et Symfony).
- Les jeunes en décrochage scolaire de la communauté VEA et VENA, sur des matières scolaires (maths, français, histoire).
- Rôles prévus : élève, créateur (bénévole, professeur) pour la création de contenu et l'aide encadrée.

## Positionnement

- Outil gratuit, sans aucune monétisation : ce n'est pas un produit à vendre.
- Développé sur le temps libre, jamais au détriment de VENABALL (projet CDA) ni des ventes VENA.
- Outil agnostique de la matière dès la conception.

## État actuel

Ce qui existe (couche A) :

- Next.js, Supabase et Tailwind.
- Connexion, middleware en refus par défaut, liste blanche d'adresses (même modèle que Velito Compta).
- Tableau de bord, visionneuse de fiches de révision, visionneuse de fiches projet.
- Contenu en fichiers Markdown, sans base de données : trois fiches de révision et une fiche projet, toutes sur la compta, générées par conversation avec Claude.
- Couche d'accès isolée pour les fiches, qui permet un passage en base plus tard sans toucher aux pages.

Ce qui n'existe pas encore : quiz, gamification, mascotte, éditeur sans code, contenu de matières scolaires.

En l'état, c'est l'outil de révision CDA de Clavel ; un jeune en décrochage ne peut pas encore s'en servir. On fait évoluer le socle, on ne repart pas de zéro.

## Périmètre fonctionnel

### Couche A : révision et fiches (existe, à finir)

- Fiches Markdown, tableau de bord, authentification.
- Manques pour servir les jeunes : contenu de matières scolaires et éditeur sans code.

### Couche B : jeu de quiz gamifié (à construire, par-dessus A)

- Exercices de départ : QCM, vrai ou faux, texte à trous.
- Plus tard : glisser-déposer pour ordonner, association concept et définition.
- Gamification légère : points d'expérience, série de jours consécutifs, une mascotte qui évolue avec les bonnes réponses (œuf, bébé, adulte).
- Angle le plus utile : l'élève colle son cours ou sa leçon, l'application en tire des fiches et un quiz, pour qu'il s'approprie son cours au lieu de le subir.
- Répétition espacée et dépérissement optionnel de la mascotte (courbe de l'oubli), à garder simple.

### Création de contenu sans code

- Un éditeur pour qu'un jeune ou un bénévole VEA crée ses fiches et quiz sans passer par une conversation avec Claude. C'est la brique qui rend l'outil autonome.

### Aide aux devoirs sourcée par IA

- Le jeune colle son exercice, l'application explique la démarche avec des sources fiables, pas une réponse toute faite.
- Elle doit citer ses sources, expliquer le raisonnement et assumer le doute.

## Hors périmètre

- Monétisation, boutique, skins, collection complète de créatures.
- Social et ligues : très loin.
- Application native en V1 et synchronisation multi-plateforme ; V1 web uniquement.
- Écriture de l'outil en Symfony : le cours parle de Symfony sans être écrit en Symfony, pour ne pas dupliquer le projet CDA.

## Contraintes techniques

- Stack : Next.js, Supabase, Tailwind.
- La couche A reste en Markdown au début ; la base arrive avec la couche B.
- Principe central : une table exercice avec un champ payload en JSONB. Un seul moteur lit le JSON et affiche tout type de question, quelle que soit la matière et quel que soit l'auteur (Clavel, un jeune, une IA). Jamais de question codée en dur.
- Tables prévues : utilisateur (rôle, points, série, dernier jour actif), matière, cours, chapitre (ordre, prérequis), exercice (type, payload), progression (réussite, tentatives, prochaine révision), compagnon, compagnon de l'utilisateur (points, santé, stade, dernière révision).
- Dépérissement par tâche planifiée qui baisse la santé des compagnons non révisés depuis 24 heures.

## Sécurité et RGPD

- Accès protégé par session et liste blanche, refus par défaut.
- Public mineur : une IA qui invente une fausse réponse fait plus de mal que de bien. L'aide aux devoirs doit être fiable ou ne pas exister ; une erreur non signalée est pire que rien.

## Roadmap ou lots

- Étape 0 : finir la couche A et la tester avec un ou deux jeunes sur un peu de contenu scolaire. Rien de plus tant que ce test n'est pas fait.
- Étape 1 : MVP jeu, QCM et texte à trous, points et série, une mascotte évolutive, moteur agnostique de la matière.
- Étape 2 : éditeur sans code pour créer ses fiches et quiz.
- Étape 3 : aide aux devoirs sourcée par IA, en dernier, avec soin.
- Étape 4 : application mobile, d'abord une PWA installable avec notifications de série ; natif via Capacitor seulement si un vrai besoin le justifie.
- Nommage (non bloquant, à trancher quand le MVP existe) : pistes CodeGotchi, SkillMon, EvoluLearn, Anima ; collection SavoirDex ou LudoDex ; mascotte d'origine envisagée, un canard qui évolue.

## Critères de réussite

- Un vrai jeune utilise la couche A avant que la couche B soit attaquée.
- Le scope ne déborde pas tant que la base ne sert pas.
- L'usage est documenté dès le premier test (nombre de jeunes aidés, matières) pour nourrir les dossiers de financement.
- L'aide IA cite ses sources et signale ses doutes.
- Le projet ne prend jamais le pas sur VENABALL ni sur VENA.$cdc$
where slug = 'cours' and (cdc is null or btrim(cdc) = '');

commit;

-- Vérification : longueur du CDC par projet (0 = pas de CDC)
select slug, coalesce(char_length(cdc), 0) as cdc_caracteres
from shared.projets order by ordre;
