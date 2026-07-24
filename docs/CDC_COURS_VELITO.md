# CDC — cours.velito.fr — Révision & lutte contre le décrochage scolaire

> Rédigé le 2026-07-12. Consolide : la vision « Duolingo du code », la décision
> Notion « 🦆 Autodidacte » (11/06), le code **déjà existant** dans `apps/cours`,
> et le cadrage confirmé par Clavel le 12/07 (angle **inclusion / décrochage
> scolaire**).
>
> **Positionnement (confirmé) :** outil **GRATUIT**. Deux publics : (1) **révision
> perso CDA** de Clavel, (2) **les jeunes en décrochage scolaire** de la communauté
> VEA/VENA (réviser, créer leurs fiches, être aidés sur les devoirs). **PAS un
> produit à vendre. Zéro monétisation.** Développé sur le **temps extra** de Clavel,
> **jamais** au détriment de VENABALL (ex-MABB, projet CDA) ni des ventes VENA.

---

## 🎯 La mission (le vrai pourquoi)

Aider — à son échelle — des **jeunes en décrochage scolaire** (VEA, quartiers). Leur
donner un endroit pour **réviser** autrement, **créer leurs propres fiches/cours**,
être **aidés sur leurs devoirs de façon fiable et sourcée**, et **reprendre
confiance**. C'est un **levier d'inclusion** — cœur de la mission VEA (et un vrai
argument pour les **dossiers de subvention**).

**Chaque fonctionnalité se juge à une seule question : « est-ce que ça aide vraiment
un jeune décroché ? »**

Note : le module « code / Symfony » est surtout **l'usage perso de Clavel** (CDA).
Pour les jeunes, les matières seront **maths, français, histoire…** → l'outil est
conçu **agnostique de la matière** dès le départ (cf. §4).

---

## 📍 État actuel du dépôt (analyse du 12/07)

`apps/cours` **existe** (Next.js 16 + Supabase + Tailwind, port dev 3007). C'est un
**socle de révision fonctionnel**, PAS encore le produit pour les jeunes.

**Ce qui est fait (couche A) :**
- **Auth** : login + `middleware.ts` default-deny + liste blanche
  `COURS_EMAILS_AUTORISES` (pattern repris de Compta).
- **Pages** : dashboard (`app/page.tsx`), visionneuse de **fiches de révision**
  (`app/fiches/[slug]`), visionneuse de **fiches projet** (`app/projets/[slug]`).
- **Contenu = fichiers Markdown** dans `content/` (lus via `gray-matter` +
  `react-markdown`) — pas de base de données. Aujourd'hui : **3 fiches (compta) +
  1 fiche projet (compta)**, générés par conversation Claude via `PROMPT_FICHES.md`.
- Couche `lib/fiches/` qui **isole l'accès aux données** → passage en base possible
  plus tard sans toucher les pages.

**Ce qui N'EXISTE PAS encore :** aucun quiz, aucune gamification, aucune mascotte,
**aucun éditeur no-code (UGC)**, pas de contenu « matières scolaires ».

**Conséquence honnête :** en l'état, c'est **l'outil de révision CDA de Clavel**.
Un jeune en décrochage **ne peut pas encore s'en servir** (contenu = code, création
réservée à une conversation Claude). Le **socle technique** est là ; le **produit
pour les jeunes** reste largement à construire. On **fait évoluer** le socle, on ne
repart pas de zéro.

---

## 🧱 Les deux couches

**Couche A — Révision & fiches (EXISTE, à finir/étendre).** Fiches Markdown,
dashboard, auth. Utile tout de suite pour le CDA. Pour servir les jeunes, il lui
manque : du **contenu matières scolaires** + un **éditeur no-code** (couche B ét. 2).

**Couche B — Jeu de quiz gamifié (à construire, optionnel, par-dessus A).** Le
« Duolingo » : exercices interactifs, XP, séries, **mascotte qui évolue**. C'est ce
qui rend l'apprentissage engageant pour un jeune décroché — mais ça vient **après**
que la couche A serve vraiment.

---

## 🎮 Couche B — le MVP jeu (quand on y arrive)

**Types d'exercices — commencer par les 2 plus simples :**
- ✅ **QCM / Vrai-Faux** · ✅ **Texte à trous**.
- ⏳ Plus tard : **drag & drop** (ordonner), **association** (relier concept ↔ définition).

**Gamification — light :** **XP** + **streak** (jours consécutifs) + **1 mascotte**
qui évolue avec les bonnes réponses (œuf → bébé → adulte). **Pas** de Pokédex
complet, **pas** de skins, **pas** de boutique (ça sert à monétiser, on ne monétise
pas).

**L'angle le plus utile en décrochage :** l'élève **colle son cours / sa leçon** →
l'app en fait des fiches + un quiz. Il **s'approprie** son cours au lieu de le subir.

---

## 🏗️ Architecture & modèle de données

**Stack : Next.js + Supabase + Tailwind** — déjà le cas. **On ne code PAS en
Symfony** : VENABALL/ex-MABB est déjà le projet Symfony CDA, ne pas dupliquer. Le
cours *parle* de Symfony, il n'a pas besoin d'être *écrit* en Symfony.

**L'insight à garder (anticipe tout le reste) :** une table **`exercice`** avec un
champ **`payload` en JSONB**. Un seul moteur lit le JSON et affiche n'importe quel
type de question (QCM, trou, drag & drop), **quelle que soit la matière**. Question
créée par toi, par un jeune, ou par une IA plus tard → **même moteur d'affichage**.
Ne jamais coder les questions « en dur ».

**Tables (quand la couche B passe en base ; la couche A reste en Markdown au début) :**
```
utilisateur       (id, email, role, xp_total, streak, dernier_jour_actif)
matiere           (id, nom)                                     -- maths, français, code…
cours             (id, matiere_id, titre, auteur_id, ordre)
chapitre          (id, cours_id, titre, ordre, prerequis_id?)
exercice          (id, chapitre_id, type, payload jsonb, ordre)
progression       (user_id, exercice_id, reussi, tentatives,
                   prochaine_revision_at)                       -- répétition espacée
compagnon         (id, nom, theme, images_par_stade jsonb)
user_compagnon    (user_id, compagnon_id, xp, sante,
                   derniere_revision_at, stade)
```
- `role` : élève / créateur (bénévole, prof) → prépare l'UGC et l'aide encadrée.
- **Dépérissement** (courbe de l'oubli) : une tâche planifiée baisse `sante` des
  compagnons non révisés depuis 24 h. Optionnel, garder simple.

---

## 🗺️ Roadmap (chaque étape gated sur « est-ce que ça aide vraiment un jeune ? »)

- **Étape 0 — Finir la couche A + tester en vrai.** La donner à **1-2 jeunes** avec
  un peu de contenu scolaire, observer ce qui accroche. **Ne rien construire de plus
  tant que ce test n'est pas fait.** (Le meilleur filtre anti-usine-à-gaz.)
- **Étape 1 — MVP jeu (couche B)** : QCM + texte à trous, XP + streak, **1 mascotte
  évolutive**. Moteur **agnostique de la matière**.
- **Étape 2 — Créer ses propres fiches / cours (UGC)** : un **éditeur SANS code**
  pour qu'un jeune (ou un bénévole VEA) crée ses fiches et quiz **sans** passer par
  une conversation Claude. C'est **la** brique qui rend l'outil autonome et utile
  en décrochage.
- **Étape 3 — Aide aux devoirs, SOURCÉE (IA)** : le jeune colle son exercice →
  l'app **explique la démarche avec des sources fiables**, pas une réponse toute
  faite.
  ⚠️ **Non négociable** : pour un enfant, une IA qui **hallucine une fausse réponse
  fait plus de mal que de bien**. Doit **citer ses sources**, **expliquer le
  raisonnement**, **assumer le doute** (« pas sûr, vérifie ici »). Morceau le plus
  délicat et responsabilisant → **en dernier, avec soin, jamais bâclé.**
- **Étape 4 — L'app mobile** : d'abord une **PWA** (installable, notifications de
  série/rappel, gratuit à faire) ; le **natif** (iOS/Android via Capacitor)
  **seulement si** un vrai besoin le justifie — c'est le morceau cher et long.
- **Pokédex complet, social/ligues** = très loin. **Monétisation : jamais** dans ce
  cadre (outil gratuit d'inclusion).

---

## 🏷️ Nommage (pas bloquant)

Pistes : **CodeGotchi**, **SkillMon**, **EvoluLearn**, **Anima**. Le Codex des
créatures = **SavoirDex** / **LudoDex**. Mascotte d'origine (Notion) = un **canard
qui évolue** (inspi TikTok @alicebranz). À trancher quand le MVP existe, pas avant.

---

## 🚧 Garde-fous

- **Gratuit, inclusion (jeunes en décrochage) + CDA perso.** Pas un produit, pas de
  monétisation.
- **Temps extra uniquement.** VENABALL (CDA) et ventes VENA passent avant.
- **Web only** en V1. Pas de natif, pas de sync multi-plateforme.
- **Finir + TESTER la couche A avant d'attaquer la couche B.** Ne pas laisser la
  grande vision (mascotte + IA + Codex) exploser le scope avant qu'un vrai jeune
  utilise la base.
- **L'aide aux devoirs par IA doit être fiable ou ne pas exister.** Pour des enfants,
  une erreur non signalée est pire que rien.
- **Angle VEA/subventions** : documenter l'usage (nombre de jeunes aidés, matières)
  dès le premier test — ça nourrit les dossiers de financement.
