# Guide de déploiement & test — Velito Compta

> Objectif : passer de « codé » à « ça tourne pour de vrai ». À faire **une fois**,
> dans l'ordre. Coche chaque étape. Compte ~45 min la première fois.
> Tout se passe dans le projet Supabase **du hub** (décision : pas de projet dédié).

---

## Étape 0 — Prérequis

- [ ] Le monorepo est installé : à la **racine** de `Velito-site`, lance `npm install`
      (c'est le workspace turbo qui relie `@repo/*` — sans ça, ni le lint ni le
      build de `apps/compta` ne marchent).
- [ ] Tu as accès au **Dashboard Supabase** du projet hub (Settings > API).

---

## Étape 1 — Variables d'environnement

- [ ] Copie `apps/compta/.env.example` en `apps/compta/.env.local`.
- [ ] Renseigne (mêmes valeurs que le hub) :
  - `NEXT_PUBLIC_SUPABASE_URL` = URL projet (Dashboard > Settings > API)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé anon
  - `COMPTA_EMAILS_AUTORISES` = **ton email** (celui de ton compte). Sans lui, le
    middleware te renvoie un 403 même connecté (liste blanche obligatoire).

> `.env.local` est ignoré par Git : les secrets ne partent jamais sur GitHub.

---

## Étape 2 — Migrations SQL (Dashboard > SQL Editor > New query)

Exécute les 5 fichiers **dans cet ordre exact** (chacun dépend du précédent) :

1. [ ] `sql/01_schema_noyau.sql` — 5 tables + trigger profil + index
2. [ ] `sql/02_rls_noyau.sql` — Row Level Security (cloisonnement)
3. [ ] `sql/03_justificatifs_storage.sql` — bucket privé + RLS Storage
4. [ ] `sql/04_partie_double.sql` — comptes/écritures + trigger d'équilibre
5. [ ] `sql/05_categorie_compte.sql` — lien catégorie → compte PCG

> Si une migration échoue, **arrête-toi et lis l'erreur** : les suivantes en
> dépendent. (Ex : `03`/`05` référencent des objets créés en `02`/`04`.)

---

## Étape 3 — Compte utilisateur + verrouillage

- [ ] **Authentication > Providers** : garde Email activé.
- [ ] **Authentication > Sign up** : **OFF** (décision : pas d'inscription
      publique, compte créé à la main = pas de surface d'attaque).
- [ ] **Authentication > Users > Add user** : crée ton compte (email + mot de
      passe). Utilise le **même email** que dans `COMPTA_EMAILS_AUTORISES`.
- [ ] Récupère ton uuid : `select id, email from auth.users;` (SQL Editor).
- [ ] Vérifie que ton profil a été créé par le trigger :
      `select * from public.utilisateur;` (une ligne avec ton email).
      **Si vide** (compte créé avant le trigger) : insère-le à la main —
      `insert into public.utilisateur (id, email) values ('TON-UUID','ton@email');`

---

## Étape 4 — Seed des entités (VEA / VENA)

Dans le SQL Editor, remplace `TON-UUID` par le tien :

```sql
insert into public.entite (proprietaire_id, nom, type_juridique) values
  ('TON-UUID', 'VEA',  'association'),
  ('TON-UUID', 'VENA', 'societe');
```

- [ ] Exécuté. Vérifie : `select id, nom from public.entite;` (2 lignes).

---

## Étape 5 — Lancer l'app

- [ ] Depuis `apps/compta` : `npm run dev` (port **3006**).
- [ ] Ouvre `http://localhost:3006` → tu dois être redirigé vers `/login`.

---

## Étape 6 — Parcours de test (la vraie validation)

Coche au fur et à mesure. **C'est ici que les bugs d'intégration apparaîtront.**

**Authentification**
- [ ] Login avec ton email/mot de passe → arrive sur l'accueil, voit VEA + VENA.
- [ ] Un email **hors** liste blanche (si tu testes) → 403.

**Lot 1 (le noyau)**
- [ ] Clique VENA → onglets visibles (Tableau de bord, Transactions, Importer,
      Catégories, Comptabilité, Export).
- [ ] Catégories → crée « Matériel » (dépense) et « Prestations » (recette).
- [ ] Transactions > Nouvelle → dépense 12,50 € TVA 2,50 € → Enregistrer →
      retour liste, ligne en rouge.
- [ ] Teste une **TVA > TTC** → doit être **refusée** avec message clair.
- [ ] Édite la transaction, change le montant → liste à jour.
- [ ] Tableau de bord → solde, mois, répartition cohérents.
- [ ] Import → colle un petit CSV (`Date;Libellé;Montant`) → mappe → importe →
      lignes en « à vérifier ».
- [ ] Export → télécharge le CSV → ouvre dans Excel (accents + colonnes OK).

**Lot 2 (justificatifs)**
- [ ] Ouvre une transaction → **+ Ajouter** un ticket (image/PDF) → il apparaît.
- [ ] **Voir** → ouvre l'URL signée. **Supprimer** → disparaît.
- [ ] Transactions > Pièces manquantes → liste cohérente.

**Socle partie double**
- [ ] Comptabilité → **Initialiser le plan comptable** → ~20 comptes.
- [ ] Comptabilité → **Régénérer les écritures** → compteur Écritures monte.
- [ ] Journal → balance **Équilibrée**, écritures débit/crédit visibles.
- [ ] États → bilan **Équilibré**, compte de résultat cohérent.
- [ ] IS (VENA) → estimation affichée ; (VEA) → note « non applicable ».
- [ ] FEC → télécharge → fichier **non vide**, 18 colonnes tabulées.
- [ ] Documents (VENA) → génère la décision d'associé unique → fenêtre
      d'impression → PDF.

---

## Étape 7 — Points de vigilance (bugs probables à surveiller)

| Zone | Symptôme possible | Piste |
|---|---|---|
| **Trigger d'équilibre différé** (sql/04) | insert d'écriture rejeté | vérifier que les lignes partent bien en **un seul** insert (elles le sont côté repo) |
| **Storage** | upload 403 / « voir » cassé | bucket `justificatifs` bien créé (sql/03) + policies présentes |
| **RLS** | listes vides alors qu'il y a des données | ton `utilisateur` existe + `entite.proprietaire_id` = ton uuid |
| **Params async Next 16** | erreur `params` | déjà géré (`await params`), mais surveiller au build |
| **Écritures vides** | FEC/bilan vides | PCG pas initialisé, ou transactions créées avant → « Régénérer les écritures » |
| **Middleware 403** | bloqué après login | ton email absent de `COMPTA_EMAILS_AUTORISES` |

---

## Étape 8 — Repartir propre (si besoin de tout réinitialiser)

> ⚠️ Détruit les données compta (pas le hub). À n'utiliser qu'en test.

```sql
drop table if exists public.ligne_ecriture, public.ecriture, public.compte,
  public.justificatif, public.transaction, public.categorie, public.entite,
  public.utilisateur cascade;
-- puis ré-exécuter sql/01 → sql/05.
```

---

## Après validation

Une fois ce parcours vert : l'app passe de « ~90 % codé / 0 % validé » à
**réellement utilisable**. C'est le meilleur moment pour :
1. noter les bugs trouvés (il y en aura) et les corriger ;
2. commencer le **dossier professionnel CDA** à partir du `README` (journal de
   décisions) et de `CDC_FINALISATION_COMPTA.md`.

---

## Étape 9 — Mise en ligne sur `compta.velito.fr`

Tu as créé le sous-domaine sur OVH (DNS) : nécessaire, mais **pas suffisant**. Il
faut (1) déployer l'app et (2) y rattacher le domaine.

**A. DNS OVH — vérifier la cible**
- [ ] Dans la zone DNS OVH, `compta` doit pointer vers l'hébergeur qui sert
      l'app. Sur Vercel : un enregistrement **CNAME** `compta` → `cname.vercel-dns.com`
      (ou l'A record indiqué par Vercel). Un sous-domaine créé mais pointant
      « dans le vide » n'affichera rien.

**B. Déployer l'app (Vercel, comme les autres apps du monorepo)**
- [ ] Nouveau projet Vercel lié au repo `Velito-site`.
- [ ] **Root Directory** = `apps/compta` (monorepo — chaque app = un projet).
- [ ] Framework détecté : Next.js. Build par défaut.
- [ ] **Environment Variables** (Production) — les mêmes que `.env.local` :
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `COMPTA_EMAILS_AUTORISES`.
- [ ] Deploy.

**C. Rattacher le domaine**
- [ ] Vercel > Project > Settings > **Domains** > ajoute `compta.velito.fr`.
- [ ] Vercel vérifie le DNS (celui d'OVH de l'étape A) → statut « Valid ».

**D. Vérifier**
- [ ] Ouvre `https://compta.velito.fr` → redirige vers `/login` (middleware).
- [ ] Login → tu accèdes (ton email est dans `COMPTA_EMAILS_AUTORISES`).

**E. Lien depuis le hub** *(déjà fait)*
- Compta est ajoutée au catalogue d'apps du hub (`apps/hub/src/app/account/page.tsx`).
  Elle apparaît dans « Mon compte » → section apps. **Volontairement pas dans la
  galaxie publique** (`modules.ts`) : c'est un outil interne, pas une marque.

> ⚠️ Le lien dans le hub ne « marche » qu'une fois les étapes A→C faites.
> Avant ça, cliquer mène à un sous-domaine sans app.
