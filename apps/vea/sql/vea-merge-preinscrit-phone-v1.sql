-- ============================================================
-- VEA — Fusion automatique d'un pré-inscrit (par téléphone) avec un nouveau compte
-- ============================================================
--
-- CONTEXTE
--   Un visiteur peut participer à des events SANS compte : le scan QR
--   "pré-inscrit" (RPC vea.register_preinscrit_scan) crée une fiche
--   vea.participants identifiée par le TÉLÉPHONE (colonne `phone`),
--   avec user_id = NULL et pre_inscrit = true. Sa progression (xp, events,
--   présences, heures) s'accumule sur cette fiche.
--
--   Quand cette personne crée enfin un compte (/signup), on veut RÉCUPÉRER
--   cette progression au lieu de créer une fiche neuve vide → sinon doublon
--   et progression perdue (ce qui obligeait à une fusion manuelle).
--
-- STRATÉGIE (additive, ne touche AUCUNE fonction existante)
--   On ajoute un trigger AFTER INSERT sur auth.users, nommé `zz_...` pour
--   qu'il s'exécute APRÈS les triggers existants (handle_new_user,
--   link_participant_to_user) — l'ordre de déclenchement est alphabétique
--   par nom de trigger. Quand le nouveau compte a fourni un téléphone dans
--   ses metadata (raw_user_meta_data->>'phone'), on :
--     1. cherche une fiche pré-inscrite (user_id NULL) au même numéro,
--     2. y rattache le compte (user_id, email),
--     3. supprime la fiche vide que les triggers précédents ont pu créer
--        pour ce compte (un compte tout neuf n'a aucune progression à perdre).
--
-- SÉCURITÉ
--   SECURITY DEFINER pour pouvoir écrire dans vea.participants depuis le
--   contexte d'un INSERT sur auth.users. Pas d'effet si aucun téléphone
--   fourni ou aucun pré-inscrit correspondant : le flux normal continue.
--
-- IDEMPOTENT : peut être relancé sans casser (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- ============================================================

create or replace function shared.merge_preinscrit_by_phone()
returns trigger
language plpgsql
security definer
set search_path = public, vea, shared
as $$
declare
  v_phone        text;
  v_preinscrit   vea.participants%rowtype;
  v_current      vea.participants%rowtype;
begin
  -- Normalise le téléphone fourni au signup (retire espaces). Pas de tel -> rien à faire.
  v_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\s', '', 'g');
  if length(v_phone) < 8 then
    return new;
  end if;

  -- 1) Fiche pré-inscrite (sans compte) correspondant à ce numéro.
  --    On compare les téléphones normalisés (colonnes `phone` ET `telephone`
  --    pour couvrir les deux conventions historiques).
  select *
    into v_preinscrit
  from vea.participants
  where user_id is null
    and (
      regexp_replace(coalesce(phone, ''),     '\s', '', 'g') = v_phone
      or regexp_replace(coalesce(telephone, ''), '\s', '', 'g') = v_phone
    )
  order by created_at desc
  limit 1;

  -- Aucun pré-inscrit à ce numéro : flux normal, le nouveau compte garde sa fiche.
  if v_preinscrit.id is null then
    return new;
  end if;

  -- 2) Fiche éventuellement déjà créée pour CE compte par les triggers précédents.
  select *
    into v_current
  from vea.participants
  where user_id = new.id
  limit 1;

  -- 3) Rattache le compte à la fiche pré-inscrite (= celle qui a la progression).
  update vea.participants
     set user_id     = new.id,
         email       = coalesce(new.email, email),
         pre_inscrit = false
   where id = v_preinscrit.id;

  -- 4) Supprime la fiche vide fraîchement créée pour le compte (s'il y en a une
  --    distincte de la pré-inscrite). Un compte tout neuf n'a pas de progression.
  if v_current.id is not null and v_current.id <> v_preinscrit.id then
    delete from vea.participants where id = v_current.id;
  end if;

  return new;

exception
  -- BLINDAGE : la fusion ne doit JAMAIS bloquer la création de compte.
  -- En cas d'erreur (FK, donnée inattendue, etc.) on log un warning et on
  -- laisse l'inscription se terminer normalement (l'utilisateur garde alors
  -- une fiche neuve, comme avant — fusion manuelle possible si besoin).
  when others then
    raise warning 'merge_preinscrit_by_phone a échoué pour user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Le préfixe zz_ garantit que ce trigger se déclenche APRÈS handle_new_user
-- et link_participant_to_user (ordre alphabétique des noms de trigger).
drop trigger if exists zz_merge_preinscrit_by_phone on auth.users;
create trigger zz_merge_preinscrit_by_phone
  after insert on auth.users
  for each row
  execute function shared.merge_preinscrit_by_phone();
