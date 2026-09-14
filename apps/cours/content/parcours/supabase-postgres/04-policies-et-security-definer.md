---
titre: "SECURITY DEFINER : une fonction qui a plus de droits que celui qui l'appelle"
parcours: "supabase-postgres"
ordre: 4
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

La policy `tournois_lecture` d'ARENA appelle `arena.est_staff(organisation_id)`. Cette fonction doit répondre « l'utilisateur courant est-il staff de cette organisation ? » — et la réponse est dans `shared.user_permissions`, une table que `anon` et `authenticated` **n'ont pas le droit de lire**. Comment une policy, exécutée avec les droits de l'utilisateur, peut-elle lire une table qui lui est interdite ?

**`SECURITY DEFINER`.** Par défaut, une fonction Postgres s'exécute avec les droits de celui qui l'**appelle** (`SECURITY INVOKER`). Avec `SECURITY DEFINER`, elle s'exécute avec les droits de celui qui l'a **créée** — toi, via le SQL Editor, donc un rôle qui lit tout. La fonction devient une **porte contrôlée** : l'appelant ne peut pas lire la table, mais il peut poser une question précise à une fonction qui, elle, le peut.

```sql
CREATE OR REPLACE FUNCTION arena.est_staff(p_organisation uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shared.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.organization_id = p_organisation
      AND up.scope IN ('owner', 'editor')
  );
$$;
```

Elle ne rend qu'un **booléen**. Jamais le contenu de la table. C'est le principe : une fonction `SECURITY DEFINER` expose le **minimum** — une réponse, pas des données.

**`SET search_path` : la ligne qui n'est pas optionnelle.** C'est le piège classique, et il est grave. Sans `SET search_path = shared, public`, la fonction résout les noms de tables non qualifiés selon le `search_path` **de l'appelant**. Un utilisateur malveillant pourrait :

1. créer un schéma à lui, `evil`, avec une table `user_permissions` contenant une ligne `(son_id, ton_orga, 'owner')` ;
2. mettre `evil` en tête de son `search_path` ;
3. appeler `est_staff(ton_orga)` — qui, avec des droits élevés, lirait `evil.user_permissions` et répondrait **vrai**.

Figer le `search_path` dans la définition de la fonction ferme cette porte : quel que soit l'appelant, `user_permissions` veut dire `shared.user_permissions`. **Toute fonction `SECURITY DEFINER` sans `search_path` figé est une faille**, et Supabase le signale dans ses *Security Advisors*. Le lint de Supabase te le dira ; écoute-le.

Note que la fonction d'ARENA qualifie **aussi** le nom (`shared.user_permissions`) — ceinture et bretelles. Fais les deux.

**`STABLE`.** Un indice pour l'optimiseur : « pour les mêmes arguments, dans la même requête, cette fonction rend le même résultat ». Postgres peut alors ne l'appeler qu'une fois par requête au lieu d'une fois par ligne. Sur une policy évaluée sur 10 000 lignes, la différence est énorme. `IMMUTABLE` serait plus fort (jamais de changement du tout — faux ici, ça dépend de `auth.uid()`), `VOLATILE` est le défaut (rappelée à chaque ligne).

**`GRANT EXECUTE`.** Créer la fonction ne suffit pas : `GRANT EXECUTE ON FUNCTION arena.est_staff(uuid) TO anon, authenticated;` — sinon la policy qui l'appelle échoue avec « permission denied ». Sur Supabase, les fonctions dans `public` sont souvent exécutables par défaut ; dans un schéma custom, non.

**Deux autres usages dans ton écosystème.**

- `shared.is_velito_admin()` (VENA) — même motif : « suis-je admin ? », booléen, `SECURITY DEFINER`, `search_path` figé.
- `interactive.add_player_score(uuid, int)` — un cas différent : elle **écrit**. Elle fait l'`UPDATE` du score même si la RLS interdit l'`UPDATE` direct de `session_players`. C'est la **seule porte** d'écriture du score depuis le client, et elle ne fait qu'une chose, atomiquement (leçon 9).

**La règle de conception.** Une fonction `SECURITY DEFINER` est un **privilège délégué**. Elle doit être : petite, à une seule responsabilité, avec des arguments validés, un `search_path` figé, et un résultat minimal. Si tu écris une fonction `SECURITY DEFINER` de 50 lignes qui fait trois choses, tu as créé un contournement de la RLS avec trois surfaces d'attaque.

## À retenir

- `SECURITY DEFINER` = la fonction tourne avec les droits de son créateur, pas de l'appelant.
- Usage : répondre à une question (« est staff ? ») sur une table interdite, en ne rendant qu'un booléen.
- `SET search_path` figé : **obligatoire**, sinon un schéma hostile peut détourner la fonction.
- `STABLE` pour que Postgres ne l'appelle qu'une fois par requête. `GRANT EXECUTE` sinon permission denied.
- Petite, une responsabilité, résultat minimal. Sinon c'est un trou.

## Mise en pratique

Objectif : écrire une fonction `SECURITY DEFINER`, la détourner sans `search_path`, puis la sécuriser.

1. SQL Editor : `CREATE SCHEMA lecon; CREATE TABLE lecon.secrets (user_id uuid, niveau text); INSERT INTO lecon.secrets VALUES (auth.uid(), 'vip');` — non, `auth.uid()` est NULL ici ; utilise ton id depuis `auth.users`. Ne donne **aucun** GRANT sur `lecon.secrets` à `anon`/`authenticated`.
2. Fonction **sans** search_path : `CREATE FUNCTION lecon.est_vip() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM secrets WHERE user_id = auth.uid() AND niveau = 'vip'); $$; GRANT EXECUTE ON FUNCTION lecon.est_vip() TO authenticated; GRANT USAGE ON SCHEMA lecon TO authenticated;` Note : `secrets` sans schéma, volontairement.
3. Depuis un Client Component connecté : `supabase.schema("lecon").rpc("est_vip")` → `true` (tu es vip). Puis `.from("secrets").select("*")` → permission denied. La fonction répond, la table est fermée. C'est le motif.
4. Le détournement (à faire dans le SQL Editor, en simulant) : `CREATE SCHEMA evil; CREATE TABLE evil.secrets (user_id uuid, niveau text); INSERT INTO evil.secrets VALUES ('00000000-0000-0000-0000-000000000000', 'vip'); SET search_path = evil, public; SELECT lecon.est_vip();` — dans un vrai scénario avec un appelant dont `auth.uid()` vaut cet id, la fonction lirait `evil.secrets`. Constate que `search_path` change la résolution du nom.
5. Sécurise : `CREATE OR REPLACE FUNCTION lecon.est_vip() … SECURITY DEFINER SET search_path = lecon, public AS $$ SELECT EXISTS (SELECT 1 FROM lecon.secrets …) $$;`. Nom qualifié **et** search_path figé. Refais l'étape 4 : impossible de détourner.
6. Dashboard → *Database → Advisors* (ou *Security Advisor*). Lis les alertes de type « Function Search Path Mutable ». Corrige chacune sur tes vraies fonctions.
7. `DROP SCHEMA lecon CASCADE; DROP SCHEMA evil CASCADE; RESET search_path;` et supprime le composant de test.

Résultat attendu : tu as écrit une fonction déléguée, vu comment on la détourne, et tu sais que `SET search_path` n'est pas une option.
