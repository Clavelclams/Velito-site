-- ============================================================================
-- VEA — Just Dance Party du 26/10/2026 : qui existe déjà ? (LECTURE SEULE)
-- ----------------------------------------------------------------------------
-- [28/10/2026] Ne fait QUE des SELECT. Aucune écriture, aucun compte créé.
-- À coller dans Supabase > SQL Editor > New query, puis Run.
-- Résultat : un tableau (recherche, trouve, ...). Bouton "Copy" > Markdown,
-- puis colle-le dans la conversation.
--
-- Comparaison sans accents ni majuscules (translate), sans l'extension unaccent.
-- Les personnes dont on n'a que le prénom sont cherchées sur le prénom seul :
-- plusieurs résultats possibles, c'est voulu (on tranche ensemble).
-- Les lignes "sœur de…", "amie de…", "jeune de 14 ans" ne sont pas cherchées.
-- ============================================================================

with liste(ordre, prenom, nom) as (
  values
  (1,'Nina','Maugard'), (2,'Alia','Millier Lahmari'), (3,'Oumayma','Ben Salah'),
  (4,'Farah','Ben Salah'), (5,'Hadjar','Bedrouni'), (6,'Yamina','Maghraoui'),
  (7,'Sounkamba','Sano'), (8,'Genaba','Sano'), (9,'Pandora','Eziorah'),
  (10,'Aya','El Hamdaoui'), (11,'Maïssa','Guelfat'), (12,'Chaïnez','Guelfat'),
  (13,'Asma','Guelfat'), (14,'Aïcha','Bouabdallah'), (15,'Rec-Préfi','Milapie'),
  (16,'Cler-Mirice','Milapie'), (17,'Mélissane',null), (18,'Annah','Daoudi'),
  (19,'Clavel','Ndema Moussa'), (20,'Berstelien','Milapie'), (21,'Celyan','Ait Hamou'),
  (22,'Issam','Ait Hamou'), (23,'Alban','Thierry'), (24,'Tony','Tagoe'),
  (25,'Lény','Coulpied'), (26,'Max','Reinert'), (27,'Miguel',null),
  (28,'Aloïs','Bondjokwe'), (29,'Neil',null), (30,'Maxence',null),
  (31,'Iless',null), (32,'Amin','Guelfat'), (33,'Arthur','Fossier'),
  (34,'Gavin',null), (35,'Timéo',null)
),
-- normalisation : minuscules, sans accents, sans tirets/espaces
norm as (
  select l.*,
    translate(lower(l.prenom), 'àâäéèêëîïôöùûüçÿ- ', 'aaaeeeeiioouuucy') as p_n,
    translate(lower(coalesce(l.nom,'')), 'àâäéèêëîïôöùûüçÿ- ', 'aaaeeeeiioouuucy') as n_n
  from liste l
),
parts as (
  select p.id, p.prenom, p.nom, p.pseudo, p.user_id, p.pre_inscrit, p.sexe,
    extract(year from p.date_naissance)::int as annee,
    translate(lower(coalesce(p.prenom,'')), 'àâäéèêëîïôöùûüçÿ- ', 'aaaeeeeiioouuucy') as p_n,
    translate(lower(coalesce(p.nom,'')), 'àâäéèêëîïôöùûüçÿ- ', 'aaaeeeeiioouuucy') as n_n
  from vea.participants p
)
select
  n.ordre,
  n.prenom || ' ' || coalesce(n.nom, '[nom à compléter]') as recherche,
  case
    when pa.id is null then 'AUCUN'
    when n.n_n <> '' and pa.n_n = n.n_n and pa.p_n = n.p_n then 'EXACT'
    when n.n_n = '' then 'PRENOM SEUL'
    else 'PROCHE'
  end as trouve,
  pa.id as participant_id,
  pa.prenom, pa.nom, pa.pseudo, pa.sexe, pa.annee,
  case when pa.user_id is not null then 'compte' when pa.pre_inscrit then 'pre-inscrit'
       when pa.id is not null then 'ancien (sans compte)' end as statut,
  (select count(*) from vea.presences pr where pr.participant_id = pa.id) as nb_presences
from norm n
left join parts pa
  on (n.n_n <> '' and pa.n_n = n.n_n and pa.p_n = n.p_n)                -- exact
  or (n.n_n <> '' and pa.n_n = n.n_n and left(pa.p_n,3) = left(n.p_n,3)) -- même nom, prénom proche
  or (n.n_n <> '' and pa.p_n = n.p_n and left(pa.n_n,4) = left(n.n_n,4)) -- même prénom, nom proche
  or (n.n_n = '' and pa.p_n = n.p_n)                                     -- prénom seul
order by n.ordre, trouve;

-- ----------------------------------------------------------------------------
-- Yamina Maghraoui : un compte existe-t-il avec son email ?
-- (auth.users n'est lisible que depuis le SQL Editor, pas depuis l'app)
-- ----------------------------------------------------------------------------
select 'auth.users' as source, u.id, u.email, u.created_at, u.email_confirmed_at is not null as email_confirme
from auth.users u where lower(u.email) = 'yaminamaghraoui.rr80@gmail.com'
union all
select 'vea.participants', p.id, p.email, p.created_at, null
from vea.participants p where lower(p.email) = 'yaminamaghraoui.rr80@gmail.com';

-- Et ses droits actuels, si elle a un compte
select up.scope, up.extra_scopes, o.slug
from shared.user_permissions up
join shared.organizations o on o.id = up.organization_id
join auth.users u on u.id = up.user_id
where lower(u.email) = 'yaminamaghraoui.rr80@gmail.com';
