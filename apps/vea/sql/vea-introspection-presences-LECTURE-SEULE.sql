-- ============================================================================
-- VEA — Introspection du schéma "présences" (LECTURE SEULE)
-- ----------------------------------------------------------------------------
-- But : voir ce qui EXISTE réellement en base avant de concevoir la saisie
-- rapide des présents. Les tables vea.participants / evenements / presences /
-- logs_xp et la RPC register_preinscrit_scan ont été créées à la main dans
-- Supabase : elles ne sont versionnées dans aucun fichier du repo.
--
-- Ce script ne fait QUE des SELECT sur le catalogue Postgres. Aucune écriture.
-- À coller dans Supabase > SQL Editor > New query, puis Run.
-- Résultat : un seul tableau (k, nom, detail). Bouton "Copy" > Markdown,
-- puis colle-le dans la conversation.
-- ============================================================================

with
cols as (
  select 'COL'::text as k,
         (table_name || '.' || column_name)::text as nom,
         (data_type || ' | null=' || is_nullable || ' | def=' || coalesce(column_default, ''))::text as detail
  from information_schema.columns
  where table_schema = 'vea'
    and table_name in ('participants', 'evenements', 'presences', 'logs_xp', 'preinscriptions_event')
),
cons as (
  select 'CONTRAINTE', (conrelid::regclass::text || ' . ' || conname), pg_get_constraintdef(oid)
  from pg_constraint
  where connamespace = 'vea'::regnamespace
    and conrelid::regclass::text in ('vea.participants', 'vea.evenements', 'vea.presences', 'vea.logs_xp')
),
idx as (
  select 'INDEX', (tablename || ' . ' || indexname)::text, indexdef::text
  from pg_indexes
  where schemaname = 'vea' and tablename in ('participants', 'evenements', 'presences', 'logs_xp')
),
pol as (
  select 'RLS', (tablename || ' . ' || policyname)::text,
         (cmd || ' roles=' || roles::text || ' using=' || coalesce(qual, '') || ' check=' || coalesce(with_check, ''))::text
  from pg_policies
  where schemaname = 'vea' and tablename in ('participants', 'evenements', 'presences', 'logs_xp')
),
trg as (
  select 'TRIGGER', (event_object_table || ' . ' || trigger_name)::text,
         (action_timing || ' ' || event_manipulation || ' -> ' || action_statement)::text
  from information_schema.triggers
  where trigger_schema = 'vea'
),
fns as (
  select 'FONCTION', p.proname::text, pg_get_function_identity_arguments(p.oid)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'vea'
),
ext as (
  select 'EXTENSION', extname::text, extversion::text from pg_extension
),
-- Comment les séances sont nommées / typées (pour le regroupement "même type")
types_ev as (
  select 'EV_TYPE', coalesce(type, '(null)')::text, (count(*) || ' events')::text
  from vea.evenements group by type
),
noms_ev as (
  select 'EV_NOM', nom::text, (type || ' | ' || date::text || ' | ' || coalesce(statut, ''))::text
  from (select * from vea.evenements order by date desc limit 25) e
),
volumes as (
  select 'VOLUME', 'participants', count(*)::text from vea.participants
  union all select 'VOLUME', 'presences', count(*)::text from vea.presences
  union all select 'VOLUME', 'participants sans phone', count(*)::text from vea.participants where phone is null
  union all select 'VOLUME', 'participants sans date_naissance', count(*)::text from vea.participants where date_naissance is null
)
select * from cols
union all select * from cons
union all select * from idx
union all select * from pol
union all select * from trg
union all select * from fns
union all select * from ext
union all select * from types_ev
union all select * from noms_ev
union all select * from volumes
order by 1, 2;

-- ----------------------------------------------------------------------------
-- 2e requête (à lancer séparément, sélectionne-la puis Run) : le corps exact de
-- la RPC utilisée par le scan QR et par l'ajout manuel actuel.
-- ----------------------------------------------------------------------------
-- select pg_get_functiondef(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'vea' and p.proname in ('register_preinscrit_scan', 'is_vea_editor');
