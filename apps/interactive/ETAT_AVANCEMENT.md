# État d'avancement — Velito Interactive

> Audit au 2026-07-07. **100 % = fonctionnalité terminée, cohérente, sans dette.**
> Contrairement à compta (jamais exécutée), Interactive est **déjà en prod**
> (`interactive.velito.fr`). L'audit est donc une **revue de code**, pas une
> supposition — mais je n'ai pas rejoué les parcours en live.

---

## 1. Ce que c'est

Plateforme de **jeux multijoueurs en soirée** (type Unboared / Kahoot local),
éditée par VENA, pour bars / MJC / espaces jeunes. Deux rôles :
- **Host** (l'écran TV / animateur) : lance une session, pilote les manches ;
- **Play** (`/play/[code]`) : les joueurs rejoignent au téléphone via un code.

Intégrée au **SSO du hub** : cookie partagé `.velito.fr`, un compte pour tout.
Modèle éco : **abonnement** (essai + déclaration SIRET pro / usage individuel).
Landing publique de conversion + `/dashboard` (galerie de jeux des abonnés).

**Volumétrie** : ~63 fichiers, ~16 000 lignes. C'est une **grosse app mature**,
la plus aboutie du hub avec VEA.

---

## 2. Les 8 jeux — matrice de complétude

Chaque jeu = logique (`lib/games`) + écran host + écran play + server actions + SQL.

| Jeu | Logique | Host | Play | Actions | SQL | Dashboard |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Quiz | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Blind Test | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Petit Bac | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Dessin (draw) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Estim' | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Réflexe | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Loup-Garou | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dispo |
| Géo / **Pin'Point** | ✅ (nommé `geo`) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ voir §4 |

**7 jeux sur 8 sont complets et cohérents.** Le 8e (Géo/Pin'Point) est codé mais
victime d'un **problème de nommage / contrainte SQL** (§4).

---

## 3. Le socle (hors jeux)

| Zone | État | Note |
|---|---|---|
| Landing publique (`app/page.tsx`) | **~90 %** | Marketing complet (hero, étapes, jeux, pricing, CTA, VENA éditeur). Note interne : « polish DA après ». |
| Dashboard abonnés | **~90 %** | Galerie de jeux, création de session par `game_type`, progressive enhancement (form + hidden). |
| Sessions temps réel (host/play) | **~90 %** | Realtime Supabase, code de session, QR (`qrcode`), carte Leaflet pour le géo. |
| SSO hub | **100 %** | Cookie `.velito.fr` partagé, middleware identique au hub. |
| Abonnement (essai / SIRET / individuel) | **~85 %** | `previewSiret`, `activateTrial`, `declareIndividual`. À valider live (paiement réel ?). |
| Audio (musiques + SFX) | **✅** | Lobby, dashboard, click, victoire, etc. Belle attention au détail. |
| **README / doc** | **~10 %** | ⚠️ Toujours le boilerplate `create-next-app`. Aucune doc technique. |

---

## 4. ⚠️ Dette / incohérences trouvées (le vrai apport de l'audit)

**A. Pin'Point : disponible dans l'UI, mais ni codé ni autorisé en base.**
- Le dashboard affiche `pinpoint` avec `available: true`.
- MAIS il n'existe **aucun fichier** `lib/games/pinpoint`, `HostPinpoint`,
  `PlayPinpoint`, `pinpoint-actions` (le code du jeu de carte s'appelle `geo`).
- ET la contrainte SQL `sessions_game_type_check` **ne contient pas `pinpoint`**
  (elle liste `geo`). → Lancer une session « Pin'Point » **serait rejetée par la
  base**, ou lancerait le jeu `geo` selon le mapping.
- Migration `interactive-rename-geo-to-pinpoint-v1.sql` : le renommage a été
  **amorcé mais pas terminé** (UI = pinpoint, code = geo, contrainte = geo).

**B. Deux contraintes `game_type` concurrentes.**
- `...snake-case.sql` : liste `…, geo, estim, reflex, loup_garou, undercover`
  (**pas `draw`**).
- `...add-draw.sql` : liste `…, draw, undercover` (**pas via snake-case**).
- Elles font toutes deux `DROP … ADD CONSTRAINT`. **La dernière appliquée gagne.**
  Si `snake-case` passe après `add-draw`, tu **reperds `draw`**. L'ordre n'est
  garanti par rien (nom de fichier). Fragile.

**C. `undercover` : valeur d'enum fantôme.**
- Présent dans les contraintes SQL, mais **aucun code**, absent du dashboard.
  → jeu planifié jamais construit (valeur morte à assumer ou retirer).

**D. README boilerplate** (déjà noté) : zéro doc technique pour une app de 16k lignes.

---

## 5. Verdict chiffré

| Vue | % | Lecture |
|---|---|---|
| **Jeux** (7/8 complets) | **~90 %** | Solide ; seul Pin'Point/geo est bancal |
| **Socle** (landing, dashboard, sessions, SSO, abo) | **~88 %** | Mature, en prod ; abo à valider |
| **Cohérence base ↔ code** | **~70 %** | ⚠️ enum game_type (pinpoint/draw/undercover) à assainir |
| **Documentation** | **~10 %** | README boilerplate |
| **Global (produit)** | **~85 %** | Vrai produit vivant, bien plus abouti que compta |

---

## 6. Recommandations (par ordre de valeur)

1. **Assainir l'enum `game_type`** (1 migration unique, propre) : décider
   `geo` vs `pinpoint`, y aligner UI + code + contrainte, inclure `draw`,
   retirer/assumer `undercover`. → corrige un **bug réel** (Pin'Point cassé) et
   la fragilité des migrations concurrentes.
2. **Finir le renommage geo → pinpoint** (ou l'annuler) de bout en bout.
3. **Écrire la vraie doc** (README + mini-CDC) — utile jury CDA aussi.
4. Ensuite seulement : nouveau jeu (`undercover` ?) ou polish DA.

> Le point 1 est le plus rentable : c'est le seul endroit où l'app a une
> **incohérence qui casse une fonctionnalité affichée comme disponible**.
