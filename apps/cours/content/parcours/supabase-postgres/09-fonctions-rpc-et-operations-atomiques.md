---
titre: "RPC : une fonction Postgres appelée depuis le navigateur, et pourquoi l'atomicité compte"
parcours: "supabase-postgres"
ordre: 9
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

PostgREST expose les tables. Il expose aussi les **fonctions** : `supabase.rpc("add_player_score", { p_player_id, p_points })` appelle `interactive.add_player_score(uuid, int)`. C'est le moyen de faire exécuter à la base une opération que ni `select` ni `update` ne savent exprimer proprement — et le bon endroit pour tout ce qui doit être **atomique**.

**Le bug que ça a corrigé.** Tous les jeux d'Interactive incrémentaient le score en trois temps depuis le navigateur : lire la valeur, ajouter en JavaScript, écrire. Deux joueurs qui marquent dans la même fraction de seconde lisent la même valeur, calculent chacun, et le second **écrase** le premier. Un point disparaît, sans erreur nulle part. C'est la *lost update*, le problème de concurrence le plus classique, et il est indétectable en testant seul.

**La correction : un seul `UPDATE` en base.**

```sql
create or replace function interactive.add_player_score(p_player_id uuid, p_points int)
returns int
language sql
security definer
set search_path = interactive, public
as $$
  update interactive.session_players
     set score = greatest(0, score + p_points)
   where id = p_player_id
  returning score;
$$;

grant execute on function interactive.add_player_score(uuid, int) to anon, authenticated;
```

`score = score + p_points` **dans l'instruction** : Postgres lit et écrit dans la même opération, sous verrou de ligne. Deux appels concurrents s'exécutent l'un après l'autre, les deux points sont comptés. Le `returning score` renvoie la valeur consolidée — pas de `SELECT` supplémentaire pour l'afficher.

Trois choix à défendre dans cette fonction :

- **`security definer`** : la RLS interdit l'`UPDATE` direct sur `session_players` (aucune policy d'écriture pour le client). La fonction, avec les droits de son créateur, passe. Elle devient la **seule porte** d'écriture du score — et elle ne sait faire qu'une chose. Le `search_path` est figé (leçon 4).
- **`greatest(0, …)`** : la règle métier « le score ne descend jamais sous zéro » (certains jeux ont des malus), écrite dans la fonction, donc appliquée quel que soit l'appelant.
- **`language sql`** et non `plpgsql` : une seule instruction, pas de logique — SQL pur suffit et l'optimiseur le comprend mieux.

**Quand une RPC, quand une Server Action.** Les deux exécutent du code côté serveur. La différence :

- Une **RPC** tourne **dans** Postgres, dans la transaction, avec les garanties de la base. Parfait pour : incrément atomique, opération sur plusieurs lignes qui doit être tout-ou-rien, calcul lourd sur des données déjà en base.
- Une **Server Action** tourne dans Next, peut appeler plusieurs services, envoyer un mail, faire de la logique TypeScript. Parfait pour : orchestrer, valider des droits complexes, combiner base + autre chose.

Une action peut appeler une RPC. La RPC fait la partie atomique, l'action fait le reste.

**Ce que « atomique » veut dire ici.** Une instruction SQL est atomique par construction : elle s'exécute entièrement ou pas du tout, et Postgres pose les verrous nécessaires pendant son exécution. Le `read-modify-write` en trois étapes côté client n'a aucune de ces garanties — entre le `read` et le `write`, tout peut arriver. La règle : **si une opération peut se ramener à une instruction SQL, écris cette instruction. Ne la décompose pas.**

**Quand une instruction ne suffit pas.** « Attribuer le bonus au premier qui trouve, et à personne d'autre » dépend de la lecture de *plusieurs* lignes avant de décider. Là, une fonction `plpgsql` avec `SELECT … FOR UPDATE` (verrouille les lignes lues jusqu'à la fin de la transaction) ou un niveau d'isolation `SERIALIZABLE` deviennent nécessaires. C'est un cran au-dessus ; sache qu'il existe, et que la première question reste « puis-je le faire en une instruction ? ».

**Typage côté client.** `supabase.rpc()` renvoie `{ data, error }` comme le reste. Le `data` est du type de retour de la fonction (`int` → `number`). Si tu génères les types Supabase (`supabase gen types typescript`), les RPC sont typées avec leurs arguments — tu perds les fautes de frappe dans les noms de paramètres.

## À retenir

- `supabase.rpc("nom", args)` appelle une fonction Postgres. C'est là que va l'atomique.
- Lire-calculer-écrire côté client = lost update sous concurrence. `score = score + p` en base = correct.
- `security definer` + aucune policy d'écriture = la fonction est la seule porte. Une chose, bien.
- RPC pour l'atomique en base ; Server Action pour orchestrer. L'une peut appeler l'autre.
- Si ça tient en une instruction SQL, écris l'instruction.

## Mise en pratique

Objectif : reproduire la lost update, puis la corriger avec une RPC — et mesurer la différence.

1. SQL Editor : `CREATE TABLE public.lecon_score (id int PRIMARY KEY, score int DEFAULT 0); INSERT INTO public.lecon_score VALUES (1, 0);` RLS avec policy SELECT `true` et UPDATE `true` (volontairement laxiste pour le test).
2. Client Component de test avec un bouton « +1 naïf » : `const { data } = await supabase.from("lecon_score").select("score").eq("id", 1).single(); await supabase.from("lecon_score").update({ score: data.score + 1 }).eq("id", 1);`. Clique 10 fois **vite** (ou boucle 20 appels en `Promise.all`). Puis `SELECT score FROM public.lecon_score;` → moins que 20. Des incréments ont été perdus.
3. `UPDATE public.lecon_score SET score = 0;`. Crée la RPC : `CREATE FUNCTION public.lecon_inc(p_id int, p_n int) RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ UPDATE public.lecon_score SET score = score + p_n WHERE id = p_id RETURNING score; $$; GRANT EXECUTE ON FUNCTION public.lecon_inc(int,int) TO anon, authenticated;`
4. Bouton « +1 atomique » : `await supabase.rpc("lecon_inc", { p_id: 1, p_n: 1 })`. 20 appels en `Promise.all`. `SELECT score` → exactement 20.
5. Retire la policy UPDATE : `DROP POLICY … ON public.lecon_score;`. Le bouton naïf échoue (RLS). Le bouton atomique marche toujours (`security definer`). C'est « la seule porte ».
6. Lis `apps/interactive/sql/interactive-add-player-score-rpc-v1.sql` en entier, puis cherche ses appels : `findstr /s "add_player_score" apps\interactive\*.ts apps\interactive\*.tsx`. Y a-t-il encore un jeu qui fait lire-calculer-écrire ? Si oui, c'est un bug latent — note-le.
7. `DROP FUNCTION public.lecon_inc; DROP TABLE public.lecon_score;`, supprime le composant.

Résultat attendu : tu as perdu des points sous concurrence, tu les as récupérés avec une instruction atomique, et tu sais quand une RPC est la bonne réponse.
