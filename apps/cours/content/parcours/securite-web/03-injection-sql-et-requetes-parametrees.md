---
titre: "Injection SQL : pourquoi tu n'en as jamais eu, et comment ça pourrait changer"
parcours: "securite-web"
ordre: 3
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

L'injection SQL est la faille la plus célèbre du web, et tu ne l'as **jamais** eue. Pas par vigilance : parce que tes outils l'empêchent par défaut. Savoir pourquoi te permet de ne pas la réintroduire le jour où tu sors des outils.

**La faille.** Un code qui construit une requête en collant une entrée utilisateur :

```php
$sql = "SELECT * FROM joueur WHERE pseudo = '" . $_GET['pseudo'] . "'";
```

Avec `pseudo = ' OR 1=1 --`, la requête devient `SELECT * FROM joueur WHERE pseudo = '' OR 1=1 --'` : tout le monde. Avec `'; DROP TABLE joueur; --` : plus de table. L'entrée est **interprétée comme du code** parce qu'elle est mélangée au code. C'est la même idée que le CSV non échappé ou le XSS : **une donnée qui atterrit dans une syntaxe sans être marquée comme donnée**.

**Pourquoi tu n'en as pas.**

- **Doctrine (Venaball)** : `$repo->findOneBy(['pseudo' => $pseudo])` ou le QueryBuilder `->where('j.pseudo = :pseudo')->setParameter('pseudo', $pseudo)`. La valeur est envoyée **séparément** de la requête : le moteur reçoit `WHERE pseudo = ?` et, à part, la valeur `' OR 1=1 --`. Il ne l'interprète jamais comme du SQL — c'est une chaîne, point. C'est la **requête paramétrée** (ou *prepared statement*).
- **Supabase (tout Velito-site)** : `.eq("pseudo", pseudo)` construit une URL PostgREST avec la valeur encodée ; PostgREST la passe en paramètre à Postgres. Même garantie. Le commentaire du module signalements de VENA le dit : « aucune injection SQL possible (requêtes paramétrées Supabase) ».

Dans les deux cas, **la séparation code / donnée est faite par l'outil**, pas par toi. Tu n'as pas à échapper, à filtrer les apostrophes, à « nettoyer » — tout ça est fragile et inutile. Tu passes la valeur en paramètre, et c'est fini.

**Où ça peut revenir.** Trois endroits où tu quittes l'outil :

1. **Une requête brute avec concaténation.** `$this->em->getConnection()->executeQuery("… WHERE slug = '$slug'")` ou `supabase.rpc("f", { sql: "…" + valeur })`. Si tu écris du SQL en chaîne, la valeur **doit** être un paramètre : `executeQuery("… WHERE slug = :slug", ['slug' => $slug])`.
2. **Une migration avec des données.** `UPDATE club SET sigle = 'MABB' WHERE id = 2 AND slug = 'mabb'` — valeurs en dur, pas d'entrée utilisateur, donc pas d'injection. Mais si une migration prenait une valeur d'un fichier ou d'une variable d'environnement, la question se poserait.
3. **Les noms d'objets.** Un paramètre ne peut porter qu'une **valeur**, jamais un nom de table ou de colonne. `ORDER BY :colonne` ne marche pas. Si l'utilisateur choisit la colonne de tri, tu dois valider contre une **liste blanche** (`in_array($col, ['nom', 'date'])`) avant de la coller. C'est le seul cas où la concaténation est inévitable, et c'est pour ça qu'elle est encadrée par une liste fermée.

**Les cousins de l'injection SQL.** Même mécanisme, autre syntaxe :

- **Injection de commande** : `exec("convert " . $nomFichier)` avec un nom de fichier contenant `; rm -rf /`. Solution : `escapeshellarg`, ou mieux, une bibliothèque qui ne passe pas par le shell.
- **Injection dans un `.htaccess` ou une config** générée à partir d'entrées.
- **Injection LDAP, XPath, NoSQL** — `{ "$gt": "" }` dans une requête Mongo construite depuis du JSON utilisateur.

Le réflexe est toujours le même : **repérer où une donnée entre dans une syntaxe, et s'assurer qu'elle y entre comme donnée.**

**La RLS ne protège pas de l'injection.** Une requête injectée s'exécute avec le rôle de l'appelant, donc filtrée par la RLS — ça limite les dégâts en lecture. Mais un `DROP` ou un `UPDATE` injecté via une fonction `SECURITY DEFINER` mal écrite passe. Les deux protections sont indépendantes.

## À retenir

- L'injection = une donnée interprétée comme du code, parce qu'elle est collée dedans.
- Doctrine et Supabase paramètrent tout. Tu n'échappes rien, tu passes des paramètres.
- Retour possible : SQL brut concaténé, noms de colonnes dynamiques (→ liste blanche), commandes shell.
- Un paramètre porte une valeur, jamais un nom de table/colonne.
- Même réflexe pour CSV, HTML, shell : où la donnée entre-t-elle dans une syntaxe ?

## Mise en pratique

Objectif : voir l'injection réussir sur du code volontairement vulnérable, puis échouer sur du code paramétré.

1. Dans le SQL Editor Supabase : `CREATE TABLE public.lecon_inj (id serial, pseudo text); INSERT INTO public.lecon_inj (pseudo) VALUES ('alice'), ('bob');`
2. Crée une fonction **vulnérable** (pour la démonstration, à supprimer après) : `CREATE FUNCTION public.lecon_cherche_mal(p text) RETURNS SETOF public.lecon_inj LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY EXECUTE 'SELECT * FROM public.lecon_inj WHERE pseudo = ''' || p || ''''; END $$;`. Appelle-la avec `'alice'` → une ligne. Avec `''' OR 1=1 --'` → **toutes** les lignes. Injection réussie.
3. La version correcte : `CREATE FUNCTION public.lecon_cherche_bien(p text) RETURNS SETOF public.lecon_inj LANGUAGE sql AS $$ SELECT * FROM public.lecon_inj WHERE pseudo = p; $$;`. Même appel malveillant → zéro ligne (aucun pseudo ne vaut littéralement `' OR 1=1 --`). Paramétré, donc inerte.
4. Cherche dans ton code : `findstr /s "executeQuery\|executeStatement\|createNativeQuery" apps mabb-site\src` et `findstr /s "EXECUTE " apps\*\sql mabb-site\migrations`. Pour chaque résultat, vérifie : concaténation ou paramètre ? Un `EXECUTE` avec `||` et une valeur externe est une injection potentielle.
5. Cas du tri dynamique : trouve (ou imagine) un endroit où l'utilisateur choisit une colonne de tri. Écris la liste blanche qui l'encadre, et le refus si la valeur n'y est pas.
6. `DROP FUNCTION public.lecon_cherche_mal; DROP FUNCTION public.lecon_cherche_bien; DROP TABLE public.lecon_inj;`

Résultat attendu : tu as fait réussir une injection, tu as vu le paramètre la neutraliser, et tu as audité tes requêtes brutes.
