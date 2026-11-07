-- ============================================================================
-- VELITO COMPTA — Migration 07 : droits sur les tables de trésorerie (07/11/2026)
-- ----------------------------------------------------------------------------
-- Bug constaté en production juste après la 06 : les pages Trésorerie et
-- Transactions renvoyaient une erreur serveur. Cause : les tables créées par
-- la 06 n'avaient AUCUN privilège pour le rôle `authenticated` (Supabase ne
-- les accorde plus automatiquement aux nouvelles tables). Sans GRANT, Postgres
-- refuse la requête AVANT même d'évaluer la RLS.
--
-- Deux verrous distincts, à ne pas confondre :
--   1. GRANT  : le rôle a-t-il le droit de toucher à la table ?
--   2. RLS    : quelles LIGNES ce rôle peut-il voir ou écrire ?
-- La 06 posait le 2 sans le 1.
--
-- On accorde à `authenticated` seulement (pas à `anon` : compta est 100 %
-- privé). La RLS de la 06 continue de limiter aux entités de l'utilisateur.
-- Leçon : test_schema.mjs accordait lui-même tous les droits avant de tester ;
-- il vérifie désormais les privilèges réels (voir le test « droits »).
-- ============================================================================

grant select, insert, update, delete on public.compte_tresorerie to authenticated;
grant select, insert, update, delete on public.solde_observe     to authenticated;

-- Vérification : true partout pour authenticated, false pour anon.
select t,
       has_table_privilege('authenticated', t, 'select') as authenticated_select,
       has_table_privilege('authenticated', t, 'insert') as authenticated_insert,
       has_table_privilege('anon', t, 'select')          as anon_select
from unnest(array['public.compte_tresorerie', 'public.solde_observe']) as t;

-- DOWN :
-- revoke all on public.compte_tresorerie from authenticated;
-- revoke all on public.solde_observe from authenticated;
