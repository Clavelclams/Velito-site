-- ============================================================================
-- VELITO COMPTA — Migration 02 : Row Level Security (cloisonnement)
-- ----------------------------------------------------------------------------
-- À exécuter APRÈS 01_schema_noyau.sql.
--
-- PRINCIPE RLS : une fois activée sur une table, PLUS RIEN ne passe par
-- défaut ("default deny"). Chaque ligne n'est visible/modifiable que si une
-- policy l'autorise explicitement. Le filtre est appliqué PAR POSTGRES
-- LUI-MÊME, à chaque requête, quel que soit le code qui l'envoie.
--
-- Pourquoi c'est la bonne couche pour le cloisonnement VEA/VENA :
-- un `where entite_id = ...` oublié dans le code applicatif = fuite de
-- données. Avec RLS, même une requête boguée "select * from transaction"
-- ne renvoie QUE les lignes autorisées. La sécurité ne repose pas sur la
-- discipline du développeur, elle est structurelle.
--
-- Comment Postgres sait QUI demande : Supabase transmet le JWT de
-- l'utilisateur connecté à chaque requête, et auth.uid() renvoie son uuid
-- (le même que utilisateur.id). Non connecté → auth.uid() est null → aucune
-- policy ne matche → zéro ligne.
--
-- USING vs WITH CHECK (question de jury classique) :
--   USING      : filtre les lignes qu'on peut LIRE / modifier / supprimer.
--   WITH CHECK : valide les lignes qu'on ÉCRIT (insert/update). Sans lui,
--                on pourrait INSÉRER une transaction chez l'entité d'un
--                autre (on ne pourrait pas la relire, mais l'écriture
--                sale aurait eu lieu). Les deux sont indispensables.
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 : activer la RLS sur les 5 tables (default deny immédiat)
-- ============================================================================
alter table public.utilisateur  enable row level security;
alter table public.entite       enable row level security;
alter table public.categorie    enable row level security;
alter table public.transaction  enable row level security;
alter table public.justificatif enable row level security;


-- ============================================================================
-- ÉTAPE 2 : fonction utilitaire de propriété
-- ----------------------------------------------------------------------------
-- "Est-ce que l'utilisateur connecté possède l'entité X ?" — la question que
-- 3 tables sur 5 se posent. On l'écrit UNE fois, les policies l'appellent.
--
-- security definer : la fonction lit public.entite avec les droits de son
-- créateur, sans être elle-même re-filtrée par les policies d'entite (évite
-- une évaluation récursive RLS-dans-RLS).
-- stable : indique à Postgres que le résultat ne change pas au sein d'une
-- même requête → il peut mettre le résultat en cache au lieu de réévaluer
-- ligne par ligne. Important sur une liste de milliers de transactions.
-- (select auth.uid()) : le sous-select est évalué UNE fois par requête,
-- pas une fois par ligne — optimisation recommandée par Supabase.
-- ============================================================================
create or replace function public.est_proprietaire_entite(p_entite_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.entite e
    where e.id = p_entite_id
      and e.proprietaire_id = (select auth.uid())
  );
$$;


-- ============================================================================
-- ÉTAPE 3 : les policies, table par table
-- ----------------------------------------------------------------------------
-- Logique en chaîne de propriété :
--   utilisateur --possède--> entite --contient--> categorie / transaction
--                                                      --contient--> justificatif
-- Chaque table remonte la chaîne jusqu'à auth.uid().
-- ============================================================================

-- utilisateur : chacun ne voit et ne modifie QUE son propre profil.
create policy "profil: soi-meme uniquement"
  on public.utilisateur
  for all
  using      ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- entite : seul le propriétaire voit/gère ses entités. C'est ici que le
-- cloisonnement commence : Clavel voit VEA et VENA parce qu'il possède les
-- deux ; un futur autre utilisateur ne verrait que les siennes.
create policy "entite: proprietaire uniquement"
  on public.entite
  for all
  using      ( proprietaire_id = (select auth.uid()) )
  with check ( proprietaire_id = (select auth.uid()) );

-- categorie : accessible si on possède l'entité de rattachement.
create policy "categorie: via propriete de l'entite"
  on public.categorie
  for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

-- transaction : même logique. La combinaison avec la FK composite de la
-- migration 01 donne une double protection :
--   RLS         → on ne LIT/ÉCRIT que dans ses propres entités ;
--   FK composite → même autorisé à écrire, impossible de mélanger une
--                  catégorie VEA avec une transaction VENA.
create policy "transaction: via propriete de l'entite"
  on public.transaction
  for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

-- justificatif : un maillon plus loin dans la chaîne — on remonte
-- justificatif → transaction → entité → propriétaire.
create policy "justificatif: via la transaction parente"
  on public.justificatif
  for all
  using (
    exists (
      select 1
      from public.transaction t
      where t.id = transaction_id
        and public.est_proprietaire_entite(t.entite_id)
    )
  )
  with check (
    exists (
      select 1
      from public.transaction t
      where t.id = transaction_id
        and public.est_proprietaire_entite(t.entite_id)
    )
  );


-- ============================================================================
-- NOTE MULTI-UTILISATEURS (préparation sans refonte)
-- ----------------------------------------------------------------------------
-- Le schéma accueille déjà PLUSIEURS utilisateurs, chacun avec SES entités :
-- rien à changer pour ça, les policies filtrent par auth.uid().
--
-- Le jour où une MÊME entité doit être partagée entre plusieurs personnes
-- (ex : le trésorier de VEA), l'extension est ADDITIVE :
--   1. create table entite_membre (entite_id, utilisateur_id, role, pk(les 2))
--   2. remplacer le corps de est_proprietaire_entite() par
--      "propriétaire OU membre" — les policies, elles, ne bougent PAS :
--      elles appellent toutes la fonction.
-- Aucune table existante modifiée, aucune donnée migrée : c'est le principe
-- "ouvert à l'extension, fermé à la modification" du CDC §5.2, appliqué
-- aussi à la sécurité.
-- ============================================================================
