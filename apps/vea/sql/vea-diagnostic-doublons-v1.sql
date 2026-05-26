-- ============================================================
-- VEA — Diagnostic des doublons de fiches participants
-- ============================================================
--
-- BUT : on REGARDE avant de fusionner. Ce script ne modifie RIEN.
--
-- REGLE DE FUSION (corrigee 24/05 — remarque Clavel)
--   On fusionne UNIQUEMENT si MEME prenom + MEME nom (idealement confirme par
--   MEME date de naissance). Le TELEPHONE n'est PAS un critere de fusion :
--   en quartier, plusieurs enfants d'une meme famille partagent souvent le
--   numero du parent (papa/maman). Meme tel + noms differents = FAMILLE,
--   surtout PAS un doublon -> ne jamais fusionner sur ce seul critere.
-- ============================================================


-- ------------------------------------------------------------
-- 1) CIBLE : toutes les fiches de Celyan et Yamina
--    (adapte l'orthographe si besoin : Celyan / Celian, etc.)
-- ------------------------------------------------------------
select
  id,
  prenom,
  nom,
  user_id,                         -- NULL = pas de compte (pre-inscrit / old vea)
  pre_inscrit,
  date_naissance,
  phone,
  telephone,
  email,
  xp_saison_actuelle,
  created_at
from vea.participants
where prenom ilike '%celyan%'
   or prenom ilike '%celian%'
   or prenom ilike '%cely%'
   or prenom ilike '%yamina%'
   or prenom ilike '%yamin%'
order by prenom, created_at;


-- ------------------------------------------------------------
-- 2) VRAIS DOUBLONS = MEME prenom + MEME nom (critere fiable).
--    La date de naissance est affichee pour CONFIRMER : si elle est
--    identique (ou coherente) -> fusion sure. Si elle differe nettement,
--    ce sont peut-etre deux personnes homonymes -> on verifie avant.
-- ------------------------------------------------------------
with norm as (
  select
    id,
    lower(trim(prenom)) as p,
    lower(trim(nom))    as n,
    user_id,
    pre_inscrit,
    date_naissance,
    phone,
    telephone,
    xp_saison_actuelle,
    created_at
  from vea.participants
  where coalesce(trim(prenom), '') <> '' and coalesce(trim(nom), '') <> ''
)
select
  p as prenom_norm,
  n as nom_norm,
  count(*)                                              as nb_fiches,
  count(user_id)                                        as nb_avec_compte,
  array_agg(id order by created_at)                     as ids,
  array_agg(coalesce(user_id::text, 'NULL') order by created_at) as user_ids,
  array_agg(coalesce(date_naissance::text, '?') order by created_at) as dates_naissance,
  array_agg(coalesce(phone, telephone, '—') order by created_at)     as tels
from norm
group by p, n
having count(*) > 1
order by nb_fiches desc, p;


-- ------------------------------------------------------------
-- 3) INFO FAMILLE (PAS un critere de fusion) : memes telephones partages.
--    Sert UNIQUEMENT a reperer les fratries (meme numero parent). Si les
--    NOMS/PRENOMS sont differents -> ce sont des freres/soeurs, NE PAS
--    fusionner. Ne fusionne sur cette liste QUE si une ligne a aussi le
--    meme prenom+nom (et alors elle est deja dans la requete 2).
-- ------------------------------------------------------------
with tels as (
  select
    id, prenom, nom, user_id, pre_inscrit, date_naissance,
    regexp_replace(coalesce(phone, telephone, ''), '\s', '', 'g') as tel_norm
  from vea.participants
)
select
  tel_norm,
  count(*)                                                  as nb_fiches,
  count(distinct lower(trim(prenom)) || '|' || lower(trim(nom))) as nb_personnes_distinctes,
  array_agg(prenom || ' ' || nom order by prenom)           as personnes,
  array_agg(coalesce(date_naissance::text, '?') order by prenom) as dates_naissance
from tels
where length(tel_norm) >= 8
group by tel_norm
having count(*) > 1
order by nb_fiches desc;
-- Lecture : si nb_personnes_distinctes > 1 sur une meme ligne -> FAMILLE
-- (plusieurs prenoms/noms, meme tel) -> NE PAS fusionner. Si = 1 -> c'est la
-- meme personne en double (deja capte par la requete 2).
