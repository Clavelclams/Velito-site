# Playtest Interactive — juillet 2026 : triage et corrections

> Retours de la session de test multi-joueurs (rapportés par Clavel le 09/07/2026).
> Statuts : ✅ corrigé · 🟡 à faire · 🔵 décision produit requise · ⚪ rien à faire

## Bugs corrigés ✅

| Retour | Cause racine | Correctif | Fichiers |
|---|---|---|---|
| Laser ne se lance pas, ça active Quizz | `"laser"` absent de la whitelist `game_type` → session créée sans type → fallback Quiz du lobby | Ajout à la validation + au type union. Commentaire "toute nouvelle carte DOIT être ajoutée ici" | `app/host/actions.ts` |
| Reflex : en muet le son reste actif | `stopAllSfx()` n'était appelé que par `useBackgroundMusic`, jamais monté sur les écrans de jeu | `stopAllSfx()` déplacé dans `setGloballyMuted()` — le mute coupe désormais les SFX en cours sur TOUS les écrans | `lib/audio.ts` |
| Salle d'attente : brouhaha "appels Discord" quand plusieurs joueurs rejoignent | 1 son par joueur, throttle 300 ms insuffisant + son joué dans un setter React (effet de bord) | Son décidé hors setter (Set d'ids vus) + throttle 2,5 s spécifique à ce son, volume 0,4 → 0,35 | `app/host/HostLobby.tsx`, `lib/audio.ts` (option `throttleMs`) |
| P'tit bac : les sons se cumulent | Sons de phase longs (round-end) jamais stoppés avant le suivant | Option `exclusive: true` sur les sons de phase — chaque son coupe le précédent | `lib/audio.ts`, `app/host/HostPetitBacGame.tsx` |
| Quizz : "parfois bug, faut rafraîchir" | Grave : TV et téléphones lisaient `QUIZ_QUESTIONS` NON filtré alors que le serveur note sur la banque filtrée par thème → question affichée ≠ question corrigée dès qu'un thème ≠ Mix | Résolveur partagé `resolveQuestion()` serveur/TV/téléphone + `theme`/`questionOrder` dans les states clients | `lib/games/quiz-questions.ts`, `quiz-actions.ts`, `HostQuizGame.tsx`, `PlayQuizGame.tsx` |
| Pin point : le reveal ne montre pas les placements | Étiquettes Leaflet en `permanent: false` (visibles au survol — personne ne survole une TV) + pas de recadrage : pins hors champ invisibles | `fitBounds` sur tous les pins au reveal + étiquette permanente sur la cible | `app/play/[code]/LeafletMap.tsx`, `app/host/HostGeoGame.tsx` |
| P'tit bac : "fubifubihbf" accepté si la 1re lettre est bonne | Couche L1 "catégories ouvertes" (Prénoms, Célébrité) acceptait TOUT | L1 supprimé. Nouveau : anti-charabia (L0) + dico local + Wiktionary + **fallback Wikipédia** pour les noms propres (prénoms, célébrités, marques, villes). Le doute (API down) profite toujours au joueur | `lib/games/petit-bac-dictionary.ts` |
| Card de jeu "pas cliquable / délai avant la salle" | La Server Action (auth + abo + code + insert) tournait sans AUCUN feedback → re-clics et impression de bug | Overlay "Création de la salle…" + bouton désactivé pendant l'action (`useFormStatus`) | `app/dashboard/GameCardButton.tsx` (nouveau), `app/dashboard/page.tsx` |

## Réglages demandés ✅

| Retour | Correctif |
|---|---|
| Choisir le nombre de questions au Quizz | Sélecteur au lobby (10/15/20/30, défaut 15) + tirage **mélangé** côté serveur (fini "toujours les 15 mêmes questions") + libellés mensongers "70/10 questions" remplacés par le compte réel de la banque |
| P'tit bac : plus de temps pour lire les résultats | `PETITBAC_REVEAL_DURATION_SEC` 8 s → 20 s |
| Pin point : placements anonymes ("plus drôle de deviner qui s'est trompé") | Pins joueurs sans pseudo et couleur unique au reveal. Le podium latéral garde les noms pour les scores |

## Rien à faire ⚪

- Blind test : OK (le choix du nombre de musiques **existe déjà** au lobby : 7/12/15 — vérifier pourquoi il n'a pas été vu, peut-être peu visible)
- Dessin : OK
- Reflex gameplay : OK (seul le bug de mute, corrigé)
- Musique de fond : OK

## Décisions produit à prendre 🔵

1. ~~Renommer "Estim'"~~ ✅ **FAIT (10/07/2026)** : nom d'affichage → **"How Much?!"** (choix Clavel). Modifié aux 4 endroits visibles joueur (`dashboard/page.tsx`, `HostEstimGame.tsx` ×2, `PlayEstimGame.tsx`). L'identifiant technique `estim` (DB, enum `game_type`, actions, noms de fichiers/composants) est VOLONTAIREMENT conservé : le joueur ne le voit jamais, et le changer casserait les sessions existantes + migrations SQL pour zéro gain. "INESTIMABLE" (label de score joke) conservé : c'est un mot français courant, pas le nom du jeu.
2. **Icônes des cards : centrage / photos** — le centrage CSS est correct (flex centré) ; l'impression de décalage vient du halo flou derrière l'emoji. Passer à des photos/illustrations = décision d'assets (qui les produit ? quelle DA ?). À traiter avec `velito-webdesign` quand les assets existent.

## Enrichissement du contenu (10/07/2026) ✅

Retour "on fait vite le tour des questions/réponses" — banques agrandies :

| Jeu | Avant | Après | Note |
|---|---|---|---|
| Quiz | 60 questions (10/thème) | **108** (18/thème) | Combiné au tirage mélangé : une partie de 15 questions pioche dans 108 |
| Pin point | 15 cibles | **35** | Paris manquait ! +5 France, +5 Europe, +10 Monde. 7 rounds/partie → 5 parties pour tout voir |
| Estim / How Much?! | 60 objets | **68 + 3 jokes** | Nouveaux objets à prix stables (Switch 2, SMIC, LEGO Falcon, baby-foot Bonzini, A320…), emoji fallback (aucune image à produire) |
| Dessin | ~96 mots | **~150** | +15 facile, +24 moyen, +15 difficile |
| Blind test | ~80 morceaux | inchangé | ❌ Pas enrichissable sans fichiers audio : chaque morceau exige un extrait MP3 à sourcer (droits !). À traiter comme un chantier d'assets, pas de code |

**INESTIMABLE (jokes Estim)** : ré-introduit avec un tirage à **2 %** par manche (décision Clavel). Les jokes sont EXCLUS du tirage uniforme — ils ne peuvent tomber que via ce 2 %. Trois jokes courts et rythmés (leçon du retrait de juin : l'ancien tombait trop souvent). Tout le monde gagne 50 pts, zéro scoring.

## Vérifications à faire par Clavel avant commit

```
cd apps/interactive
npm run check-types
npm run lint
npm run build
```
Puis re-tester en local : lancer Laser (doit lancer Laser), un Quizz thème "Sport" en 10 questions (TV et téléphones synchro), mute pendant un son long au Reflex, reveal Pin point (pins visibles, anonymes, carte recadrée), P'tit bac avec un mot charabia en catégorie Prénom (doit être rejeté).

⚠️ Note de traçabilité : la validation P'tit bac appelle désormais aussi l'API Wikipédia FR (mêmes conditions que Wiktionary : gratuite, sans clé, cache 24 h).
