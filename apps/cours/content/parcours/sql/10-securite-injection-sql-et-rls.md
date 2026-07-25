---
titre: "Sécurité : injection SQL, requêtes préparées et RLS Supabase"
parcours: "sql"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Dernière leçon, et sujet garanti au jury : la sécurité des données. Deux volets — l'attaque la plus célèbre du web (l'injection SQL) et une défense que tu utilises déjà (le RLS de Supabase).

**L'injection SQL.** Imagine un code naïf qui colle des bouts de texte :

```php
// ⚠️ CODE VOLONTAIREMENT VULNÉRABLE — ne jamais faire ça
$sql = "SELECT * FROM user WHERE email = '" . $_POST['email'] . "'";
```

Avec un email normal, tout va bien. Mais si l'utilisateur tape `' OR '1'='1`, la requête devient :

```sql
SELECT * FROM user WHERE email = '' OR '1'='1';
-- '1'='1' est toujours vrai → renvoie TOUS les utilisateurs
```

La saisie a été **interprétée comme du code SQL**. Avec `'; DROP TABLE user; --`, on détruit la table ; avec un `UNION SELECT`, on exfiltre les mots de passe. Faille n°1 du classement OWASP, née d'UNE seule erreur : mélanger le code (la requête) et les données (la saisie).

**La parade : les requêtes préparées** (prepared statements). On envoie la requête avec des **paramètres** à trous, puis les valeurs séparément :

```sql
SELECT * FROM "user" WHERE email = $1;  -- $1 est un paramètre (? en MySQL)
-- La valeur est transmise À CÔTÉ, jamais concaténée dans le texte SQL
```

La base sait alors que `' OR '1'='1` est une **valeur à comparer** (un email bizarre qui ne matchera rien), pas du code à exécuter. La faille disparaît structurellement.

Bonne nouvelle : **Doctrine fait ça systématiquement**. Quand tu écris `->where('u.email = :email')->setParameter('email', $email)`, Doctrine génère une requête préparée. La phrase à dire au jury : « je ne concatène jamais de saisie utilisateur dans une requête ; tout passe par les paramètres nommés de Doctrine, qui utilise des requêtes préparées PDO ». Le danger résiduel : les rares endroits où on écrit du SQL natif à la main — même là, on utilise `setParameter`, jamais la concaténation.

**Deuxième volet : Row Level Security (RLS)**, le modèle de Supabase que tu pratiques dans Velito Compta (relis ta fiche compta-rls-default-deny). L'injection SQL contrôle CE QUE la requête dit ; le RLS contrôle CE QUE la requête a le droit de voir, **ligne par ligne**. Principe : des règles de filtrage attachées à la table elle-même, appliquées par PostgreSQL quelle que soit la requête :

```sql
-- 1. Activer le RLS : par défaut, PLUS PERSONNE ne voit rien (default deny)
ALTER TABLE depense ENABLE ROW LEVEL SECURITY;

-- 2. Ouvrir uniquement ce qui est légitime :
CREATE POLICY "chacun voit ses depenses"
ON depense FOR SELECT
USING (user_id = auth.uid());  -- auth.uid() = l'utilisateur connecté (Supabase)
```

« Default deny » : on interdit tout, puis on autorise explicitement — le même esprit que le `status = 'pending'` par défaut de UserClubRole. Même si le front-end de Velito Compta avait un bug, ou si un attaquant appelait l'API directement, PostgreSQL ne renverrait QUE les lignes autorisées par la policy : la sécurité vit dans la base, au plus près de la donnée. Le RLS est propre à PostgreSQL — MySQL n'a pas d'équivalent natif : dans Venaball, ce filtrage (« un dirigeant ne voit que SON club ») est fait par le code Symfony (voters, requêtes filtrées par club). Une différence d'architecture à savoir expliquer en soutenance.

Conclusion du parcours : la **défense en profondeur** — requêtes préparées (contre l'injection) + contraintes (leçon 9) + RLS ou logique applicative (contre les accès illégitimes) + secrets hashés (ApiToken ne stocke que le SHA-256 du jeton : un dump de la table ne donne rien).

## À retenir

- **Injection SQL** = une saisie utilisateur concaténée dans la requête devient du code exécutable (`' OR '1'='1`). Faille n°1 de l'OWASP.
- **Requête préparée** = requête à trous + valeurs envoyées séparément : la saisie reste une donnée, jamais du code. La parade structurelle.
- Doctrine protège Venaball **si** on utilise `setParameter` — jamais de concaténation, même en SQL natif.
- **RLS** (PostgreSQL/Supabase) = filtrage ligne par ligne attaché à la table : `ENABLE ROW LEVEL SECURITY` (default deny) puis des `CREATE POLICY` explicites avec `auth.uid()`.
- Défense en profondeur : requêtes préparées + contraintes + RLS/voters + secrets hashés (cf. ApiToken et son SHA-256).

## Mise en pratique

Objectif : simuler une injection puis poser une policy RLS, dans l'éditeur SQL de Supabase.

1. Ressens l'injection sans PHP : sur `membre_test`, la requête « légitime » est `SELECT * FROM membre_test WHERE prenom = 'Jean';`. Exécute maintenant la version « injectée » que produirait une concaténation naïve : `SELECT * FROM membre_test WHERE prenom = '' OR '1'='1';` — compte les lignes renvoyées.
2. Crée une table façon Velito Compta et active le default deny :

```sql
CREATE TABLE depense_test (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  libelle VARCHAR(200) NOT NULL,
  montant NUMERIC(10,2) NOT NULL
);
ALTER TABLE depense_test ENABLE ROW LEVEL SECURITY;
```

3. Écris la policy `FOR SELECT` avec `USING (user_id = auth.uid())` sur le modèle du cours (nomme-la « proprietaire lit ses depenses »).
4. Vérifie dans le Dashboard Supabase : Table Editor → `depense_test` → l'écusson « RLS enabled » et ta policy listée dans Authentication → Policies. Note que dans le SQL Editor tu passes par le rôle admin (`postgres`) qui **bypass** le RLS — c'est côté API/client que la policy s'applique.
5. Relis ta fiche compta-rls-default-deny et complète-la si besoin : ajoute la phrase « même logique que le status pending de UserClubRole : tout est interdit par défaut, chaque droit est ouvert explicitement ».
6. Pour finir le parcours, ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/ApiToken.php` et relis le bloc de commentaire SÉCURITÉ : tu y reconnais maintenant le hash SHA-256, l'index, la clé étrangère CASCADE et l'expiration — quatre décisions de conception que tu sais justifier une par une.

Résultat attendu : (1) TOUTES les lignes sont renvoyées alors que le filtre visait « Jean » — c'est l'injection, vécue de l'intérieur ; (3) la policy se crée sans erreur ; (4) RLS visible et actif pour les clients API. Tu termines ce parcours capable d'expliquer au jury comment tes DEUX projets réels protègent leurs données, chacun à sa manière.
