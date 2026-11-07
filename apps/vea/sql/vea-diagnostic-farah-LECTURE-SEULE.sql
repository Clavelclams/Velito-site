-- ============================================================================
-- VEA — Diagnostic des deux Farah (29/10/2026) — LECTURE SEULE, ne modifie rien
-- ============================================================================
-- Exécuté le 29/10/2026. Constat :
--   - 2 fiches : « Farah ELBEUF » (ff23c339, créée le 18/05/2026 20:48, à la
--     main, events_old 35, benevole_hours 35) et « Farah Ben Salah »
--     (f2b6a20e, créée le 28/10/2026 par le script Just Dance Party).
--   - Aucune présence ni ligne de points n'est mal rattachée : Farah ELBEUF n'a
--     AUCUNE présence, son total vient des compteurs saisis à la main
--     (events_old, benevole_hours).
--   - L'historique de Farah Ben Salah (Notion : 148 h, 2022 à 2025) n'a jamais
--     été importé dans Supabase.
-- ============================================================================

-- 1. Profils « Farah » + toutes leurs participations et points
with f as (
  select * from vea.participants
  where prenom ilike '%farah%' or nom ilike '%farah%' or pseudo ilike '%farah%'
),
lignes as (
  select coalesce(pr.participant_id, l.participant_id) as pid, pr.id as presence_id, pr.event_slug, pr.motif,
         pr.heures_aide, pr.horodatage, pr.scanned_by, l.action, l.xp_gagne, l.description, l.saison,
         l.cree_par, l.created_at as log_le
  from vea.presences pr
  full join vea.logs_xp l on l.presence_id = pr.id
  where coalesce(pr.participant_id, l.participant_id) in (select id from f)
)
select left(f.id::text, 8) as id, f.prenom, f.nom, f.pseudo, f.quartier, f.pre_inscrit, (f.user_id is not null) as compte,
       f.created_at::date as cree_le, f.xp_saison_actuelle as xp_saison, f.events_old, f.benevole_hours,
       e.nom as evenement, coalesce(e.date, li.horodatage::date) as date_evt, li.motif, li.action, li.xp_gagne,
       li.description,
       case when li.presence_id is null and li.action is not null then 'points sans presence'
            when li.presence_id is null then '-'
            when li.scanned_by is null then 'script SQL / import'
            when li.scanned_by = f.user_id then 'scan QR (elle-meme)'
            else 'ajout par ' || coalesce(s.prenom, '?') end as source
from f
left join lignes li on li.pid = f.id
left join vea.evenements e on e.event_slug = li.event_slug
left join vea.participants s on s.user_id = coalesce(li.scanned_by, li.cree_par)
order by f.created_at, date_evt nulls first;

-- 2. Fiches créées le 18/05 après midi (lot bénévoles 20:12 + Farah 20:48)
select to_char(created_at,'HH24:MI:SS') as heure, left(id::text,8) as id, prenom, nom, role, events_old, benevole_hours
from vea.participants
where created_at >= '2026-05-18 12:00' and created_at < '2026-05-19'
order by created_at;

-- 3. Prénoms portés par plusieurs fiches (à la casse près ; les accents
--    « Lény / Leny » ne sont pas regroupés)
select initcap(lower(trim(prenom))) as prenom, count(*) as nb,
       string_agg(nom || coalesce(' [' || pseudo || ']','') || coalesce(' ('|| quartier ||')','')
                  || case when user_id is not null then ' *compte*' when pre_inscrit then ' pre' else '' end
                  || ' old:' || coalesce(events_old,0) || ' ' || left(id::text,8), ' ; ' order by nom) as fiches
from vea.participants
group by lower(trim(prenom))
having count(*) > 1
order by nb desc, 1;
