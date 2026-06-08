# Playtest papier Loup-Garou — Juin 2026

**Sprint 0 du plan V2** (cf. `loup-garou-implementation.md` section 7)
**Objectif** : valider les timings, l'équilibrage des rôles, et le sous-ensemble V2.0a AVANT de coder une seule ligne.

**Règle d'or** : tant que ce document n'est pas rempli avec au moins **3 parties testées**, on ne touche PAS au code.

---

## Préparation matériel

- Cartes de rôles improvisées (post-its ou papier cartonné, 1 par joueur, retournées)
- Un narrateur / meneur (toi, Clavel)
- Un chrono (téléphone)
- Ce mémo imprimé ou ouvert sur un tel
- Pool de rôles V2.0a candidat (à valider par le test) :
  - **Loups** : 1-3 selon nombre de joueurs
  - **Villageois** : remplissage
  - **Voyante** (×1)
  - **Sorcière** (×1)
  - **Chasseur** (×1)
  - **Cupidon** (×1, joue 1 fois la nuit 0)
  - **Idiot du Village** (×1)
  - **Loup Blanc** (×0 ou 1 selon nombre)
  - **Montreur d'Ours** (×0 ou 1)
  - **Bouc Émissaire** (×0 ou 1)
  - **Maire** : élu, pas distribué

---

## Composition recommandée par nombre de joueurs

| Joueurs | Loups | Loup Blanc | Spéciaux Village | Villageois |
|---|---|---|---|---|
| 5 | 1 | 0 | Voyante, Sorcière | 1 |
| 6 | 1 | 0 | Voyante, Sorcière, Chasseur | 1 |
| 7 | 2 | 0 | Voyante, Sorcière, Cupidon | 1 |
| 8 | 2 | 0 | Voyante, Sorcière, Cupidon, Chasseur | 1 |
| 9 | 2 | 1 | Voyante, Sorcière, Cupidon, Chasseur | 1 |
| 10 | 2 | 1 | Voyante, Sorcière, Cupidon, Chasseur, Idiot | 1 |
| 11 | 3 | 1 | + Montreur d'Ours | 1 |
| 12 | 3 | 1 | + Bouc Émissaire | 1 |

À ajuster après les playtests.

---

## Partie 1 — Bureau VEA (table, salle)

**Date** : _____________
**Lieu** : _____________
**Nombre de joueurs** : _____________
**Joueurs présents** : _____________

### Composition utilisée

| Rôle | Nombre |
|---|---|
| Loup-Garou | _ |
| Loup Blanc | _ |
| Voyante | _ |
| Sorcière | _ |
| Chasseur | _ |
| Cupidon | _ |
| Idiot du Village | _ |
| Montreur d'Ours | _ |
| Bouc Émissaire | _ |
| Villageois | _ |

### Timings observés

| Phase | Durée prévue (spec) | Durée réelle | Observation |
|---|---|---|---|
| Nuit 0 — Cupidon | 60s | _____ | _________________ |
| Nuit 0 — Voleur (si testé) | 30s | _____ | _________________ |
| Élection Maire | 60s | _____ | Combien de tours de vote ? |
| Nuit — Voyante | 30s | _____ | Trop court / trop long ? |
| Nuit — Loups | 60s | _____ | Trop court / trop long ? |
| Nuit — Sorcière | 30s | _____ | Décision rapide ou hésitation ? |
| Jour — Débat | 120s | _____ | Frustrant / suffisant ? |
| Jour — Vote village | non specifié | _____ | Proposition de durée : ____ s |

### Durée totale partie

- Temps avant 1re mort : _____ min
- Temps total partie : _____ min
- Camp gagnant : _____________

### Points de friction

- [ ] Une règle n'était pas claire pour les joueurs → _____________
- [ ] Une phase semblait trop longue → _____________
- [ ] Une phase semblait trop courte → _____________
- [ ] Un rôle a paralysé la partie (AFK / indécision) → _____________
- [ ] L'ordre nocturne a posé problème → _____________
- [ ] Autre : _____________

### Rôles évalués

| Rôle | Sentiment des joueurs (boring/fun/cassé) | Garder en V2.0a ? |
|---|---|---|
| Loup | _________________ | ✅ obligatoire |
| Voyante | _________________ | _____ |
| Sorcière | _________________ | _____ |
| Chasseur | _________________ | _____ |
| Cupidon | _________________ | _____ |
| Idiot | _________________ | _____ |
| Loup Blanc | _________________ | _____ |
| Montreur d'Ours | _________________ | _____ |
| Bouc Émissaire | _________________ | _____ |

---

## Partie 2 — Trajet basket / sortie (mini-bus ou voiture)

**Date** : _____________
**Trajet** : _____________
**Durée trajet** : _____ min
**Nombre de joueurs** : _____________

### Observations spécifiques au Mode Voiture

- [ ] Le bruit de la route gêne la narration → _____________
- [ ] Le conducteur a-t-il été distrait ? → _____________
- [ ] Les joueurs arrière entendent-ils bien le narrateur ? → _____________
- [ ] Possibilité de chuchotement entre voisins de banquette (triche) → _____________
- [ ] Énergie globale du groupe : 🪫 / 🔋 / ⚡ / ____

### Idées spécifiques voiture

- _____________
- _____________
- _____________

### Reprendre la grille de la Partie 1 ici

(Composition + timings + frictions + rôles)

---

## Partie 3 — Soirée VEA (salle / chez quelqu'un)

**Date** : _____________
**Contexte** : _____________
**Nombre de joueurs** : _____________

### Spécificités soirée

- [ ] L'alcool a-t-il dégradé la qualité du jeu ? → _____________
- [ ] La salle était-elle calme assez ? → _____________
- [ ] Les joueurs étaient-ils tous concentrés en même temps ? → _____________
- [ ] Le narrateur a-t-il été audible ? → _____________

### Reprendre la grille de la Partie 1 ici

---

## Décisions finales (à remplir après les 3 parties)

### Composition V2.0a définitive

Le set MINIMAL pour le sprint 1 de code. À limiter à ce qui marche bien et n'a pas posé de problème.

| Rôle | Inclus en V2.0a ? | Justification |
|---|---|---|
| Loup-Garou | ✅ | obligatoire |
| Villageois | ✅ | obligatoire |
| Voyante | _____ | _____________ |
| Sorcière | _____ | _____________ |
| Maire (élu) | _____ | _____________ |
| Chasseur | _____ | _____________ |
| Cupidon | _____ | _____________ |
| Idiot | _____ | _____________ |
| Loup Blanc | _____ | _____________ |
| Montreur d'Ours | _____ | _____________ |
| Bouc Émissaire | _____ | _____________ |

### Timings retenus pour le code

| Phase | Durée à coder |
|---|---|
| Cupidon (nuit 0) | _____ s |
| Élection Maire | _____ s |
| Voyante | _____ s |
| Loups | _____ s |
| Loup Blanc (nuits paires) | _____ s |
| Sorcière | _____ s |
| Reveal morts | _____ s |
| Débat jour | _____ s |
| Vote village | _____ s |

### Règles maison à intégrer

Si vous avez inventé des variantes pendant les parties (règle locale d'Amiens, twist VEA, etc.) :

- _____________
- _____________

### Risques identifiés à mitiger côté code

- _____________
- _____________
- _____________

### Faisabilité narration TTS (Mode Voiture)

- [ ] Une voix synthétique fr-FR (par défaut Android/iOS) sera-t-elle audible en voiture ? Test fait : oui / non
- [ ] Faut-il pré-rendre les phrases avec ElevenLabs dès V2 ? oui / non
- [ ] Y a-t-il des phrases trop complexes pour la TTS ? Lesquelles : _____________

---

## Validation du go-code

Le code Sprint 1 (V2.0a) peut commencer SI :

- [ ] Les 3 parties ont été jouées ET notées dans ce document
- [ ] Le set de rôles V2.0a est tranché et écrit ci-dessus
- [ ] Les timings sont écrits ci-dessus
- [ ] Aucune règle n'est encore ambiguë pour le narrateur humain
- [ ] La condition de victoire à 3 camps (Loup Blanc) a été testée au moins une fois

Si une case n'est pas cochée → on rejoue une partie avant de coder.

---

*Mémo à conserver dans `docs/interactive/` à côté de la spec produit et de la spec implémentation. À versionner avec le code pour traçabilité jury CDA.*
