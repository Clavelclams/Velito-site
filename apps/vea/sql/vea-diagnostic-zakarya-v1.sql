-- ============================================================
-- VEA — Diagnostic Zakarya (avant fusion compte + pre-inscription)
-- ============================================================
--
-- SITUATION (decrite par Clavel)
--   Zakarya a DEUX fiches dans vea.participants :
--     (A) une fiche PRE-INSCRIPTION (user_id NULL, pre_inscrit = true),
--         creee via scan/ajout manuel — peut contenir sa progression (XP,
--         presences) et eventuellement son vrai nom.
--     (B) une fiche COMPTE (user_id rempli), creee a son /signup, ou il a
--         saisi un PSEUDO a la place de son vrai prenom/nom (pas serieux).
--
--   OBJECTIF FINAL (apres fusion) : UNE seule fiche, avec :
--     - user_id  = son compte (pour qu'il se connecte),
--     - prenom   = "Zakarya", nom = son VRAI nom de famille,
--     - pseudo   = son pseudo (c'est CA qui s'affiche sur /joueurs ;
--                  l'admin /admin/bilan voit prenom+nom reels),
--     - toute la progression (XP / presences) conservee.
--
-- CE SCRIPT NE MODIFIE RIEN. Il sert juste a voir les 2 fiches et a savoir
-- laquelle porte la progression. Colle-moi les resultats + dis-moi son vrai
-- nom de famille -> je genere le merge exact (avec les vrais IDs).
-- ============================================================


-- 1) Toutes les fiches "zak" (prenom, nom OU pseudo). Les fiches avec compte
--    remontent en premier.
select
  id,
  prenom,
  nom,
  pseudo,
  user_id,                 -- NULL = pre-inscription / sans compte
  pre_inscrit,
  is_public,               -- true = visible sur /joueurs
  role,
  phone,
  telephone,
  email,
  xp_saison_actuelle,
  created_at
from vea.participants
where prenom ilike '%zak%'
   or nom    ilike '%zak%'
   or pseudo ilike '%zak%'
order by (user_id is not null) desc, created_at;


-- 2) Activite reelle par fiche (nb de presences enregistrees) : permet de voir
--    quelle fiche porte la progression a conserver.
select
  p.id,
  coalesce(nullif(trim(p.prenom), ''), '(vide)') as prenom,
  coalesce(nullif(trim(p.nom), ''), '(vide)')    as nom,
  p.pseudo,
  p.user_id,
  p.xp_saison_actuelle,
  count(pr.id) as nb_presences
from vea.participants p
left join vea.presences pr on pr.participant_id = p.id
where p.prenom ilike '%zak%'
   or p.nom    ilike '%zak%'
   or p.pseudo ilike '%zak%'
group by p.id, p.prenom, p.nom, p.pseudo, p.user_id, p.xp_saison_actuelle
order by nb_presences desc, p.created_at;
