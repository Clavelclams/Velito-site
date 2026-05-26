-- ============================================================
-- VEA — Fusion auto pre-inscrit -> compte : v2 FAMILLE-SAFE
-- ============================================================
--
-- POURQUOI v2 (24/05/2026 — remarque Clavel)
--   La v1 fusionnait un nouveau compte avec une fiche pre-inscrite sur le
--   SEUL critere du TELEPHONE. Or en quartier, plusieurs enfants d'une meme
--   famille partagent le numero du parent (papa/maman). Resultat : le petit
--   frere qui s'inscrit avec le numero de papa pouvait se voir rattacher a la
--   fiche (et a la progression) de sa grande soeur deja pre-inscrite. Faux
--   merge = donnees corrompues, difficile a detecter.
--
-- CORRECTIF
--   On exige desormais TELEPHONE + PRENOM + NOM identiques (normalises) avant
--   de fusionner automatiquement. Une fratrie (meme tel, noms differents) ne
--   declenche plus aucune fusion : chaque enfant garde sa propre fiche.
--   Si le prenom OU le nom manque dans les metadata du signup, on ne fusionne
--   pas (prudence) — la fiche pourra etre fusionnee a la main si besoin.
--
-- PAS DE DOUBLON CREE
--   CREATE OR REPLACE remplace la fonction EN PLACE : le trigger existant
--   (zz_merge_preinscrit_by_phone) continue de pointer dessus, on n'ajoute
--   aucun trigger. Quand la fusion a lieu, la fiche vide du nouveau compte est
--   toujours supprimee. Quand elle n'a pas lieu (fratrie / pas de match nom),
--   la personne garde simplement sa fiche unique — rien n'est duplique.
--
-- IDEMPOTENT : relancable sans risque (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- ============================================================

create or replace function shared.merge_preinscrit_by_phone()
returns trigger
language plpgsql
security definer
set search_path = public, vea, shared
as $$
declare
  v_phone        text;
  v_prenom       text;
  v_nom          text;
  v_preinscrit   vea.participants%rowtype;
  v_current      vea.participants%rowtype;
begin
  -- Normalise les metadata fournies au signup.
  v_phone  := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\s', '', 'g');
  v_prenom := lower(trim(coalesce(new.raw_user_meta_data->>'prenom', '')));
  v_nom    := lower(trim(coalesce(new.raw_user_meta_data->>'nom', '')));

  -- Pas de tel exploitable -> rien a faire (flux normal).
  if length(v_phone) < 8 then
    return new;
  end if;

  -- FAMILLE-SAFE : sans prenom ET nom, on NE fusionne PAS (evite de coller le
  -- compte sur la fiche d'un frere/soeur au meme numero).
  if v_prenom = '' or v_nom = '' then
    return new;
  end if;

  -- 1) Fiche pre-inscrite (sans compte) au MEME numero ET MEME prenom+nom.
  --    On compare les telephones normalises sur les deux colonnes historiques
  --    (phone ET telephone) et les noms normalises.
  select *
    into v_preinscrit
  from vea.participants
  where user_id is null
    and lower(trim(prenom)) = v_prenom
    and lower(trim(nom))    = v_nom
    and (
      regexp_replace(coalesce(phone, ''),     '\s', '', 'g') = v_phone
      or regexp_replace(coalesce(telephone, ''), '\s', '', 'g') = v_phone
    )
  order by created_at desc
  limit 1;

  -- Aucun pre-inscrit correspondant : flux normal, le compte garde sa fiche.
  if v_preinscrit.id is null then
    return new;
  end if;

  -- 2) Fiche eventuellement deja creee pour CE compte par les triggers precedents.
  select *
    into v_current
  from vea.participants
  where user_id = new.id
  limit 1;

  -- 3) Rattache le compte a la fiche pre-inscrite (= celle qui a la progression).
  update vea.participants
     set user_id     = new.id,
         email       = coalesce(new.email, email),
         pre_inscrit = false
   where id = v_preinscrit.id;

  -- 4) Supprime la fiche vide fraichement creee pour le compte (si distincte).
  if v_current.id is not null and v_current.id <> v_preinscrit.id then
    delete from vea.participants where id = v_current.id;
  end if;

  return new;

exception
  -- BLINDAGE : la fusion ne doit JAMAIS bloquer la creation de compte.
  when others then
    raise warning 'merge_preinscrit_by_phone (v2) a echoue pour user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Trigger inchange (re-cree idempotent). Prefixe zz_ = se declenche APRES
-- handle_new_user et link_participant_to_user (ordre alphabetique).
drop trigger if exists zz_merge_preinscrit_by_phone on auth.users;
create trigger zz_merge_preinscrit_by_phone
  after insert on auth.users
  for each row
  execute function shared.merge_preinscrit_by_phone();
