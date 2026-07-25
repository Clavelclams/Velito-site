---
titre: "C'est quoi une base de données relationnelle ?"
parcours: "sql"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

Imagine un classeur Excel géant qui gère tout Venaball : les utilisateurs, les clubs, les rôles. Tu pourrais mettre tout ça dans une seule feuille avec des colonnes « email, nom, club, rôle »… et ça marcherait cinq minutes. Puis Jean devient COACH au MABB **et** PARENT au même club : tu dupliques sa ligne, son email apparaît deux fois. Le jour où il change d'email, tu dois corriger toutes les lignes. Tu en oublies une : tes données se contredisent. C'est ce qu'on appelle une **anomalie de mise à jour**, et c'est exactement le problème que les bases de données relationnelles résolvent.

Une **base de données relationnelle** (comme PostgreSQL, que tu utilises dans Velito Compta via Supabase, ou MySQL, qui fait tourner Venaball) organise les données en **tables**. Une table, c'est comme une feuille Excel très disciplinée :

- Chaque **colonne** a un nom et un **type** fixé à l'avance : `email` est un texte de 180 caractères maximum, `is_active` est un booléen (vrai/faux), `created_at` est une date. Impossible de mettre « bonjour » dans une colonne de dates — la base refuse.
- Chaque **ligne** (on dit aussi « enregistrement » ou « row ») représente UN objet du monde réel : un utilisateur, un club.
- Chaque ligne possède un **identifiant unique**, l'`id`, qui permet de la retrouver sans ambiguïté.

Le mot « relationnelle » vient du fait que les tables se **référencent entre elles**. Au lieu de recopier le nom du club dans chaque ligne utilisateur, la table `user_club_role` de Venaball stocke juste `user_id = 4` et `club_id = 1` : des renvois vers les tables `user` et `club`. L'information n'existe qu'à UN seul endroit. Si le club change de nom, on modifie une seule ligne dans `club`, et tout le monde voit le nouveau nom.

Pour parler à la base, on utilise **SQL** (Structured Query Language), un langage quasi identique partout. Par exemple :

```sql
-- Affiche toutes les colonnes de toutes les lignes de la table user
SELECT * FROM "user";
```

Dans ton projet Symfony, tu n'écris presque jamais de SQL à la main : **Doctrine** (l'ORM) traduit tes objets PHP en tables. Chaque fichier de `src/Entity/Core/` correspond à une table MySQL. Quand tu écris `#[ORM\Column(length: 180)]` sur `$email`, Doctrine crée une colonne `VARCHAR(180)`. Mais devant le jury CDA, dire « Doctrine s'en occupe » ne suffit pas : tu dois savoir ce qui se passe en dessous. C'est le but de ce parcours.

Dernier point de vocabulaire : le logiciel qui gère tout ça (stockage, sécurité, accès simultanés) s'appelle un **SGBD** (Système de Gestion de Base de Données). PostgreSQL et MySQL sont deux SGBD relationnels. Ils diffèrent sur des détails (PostgreSQL écrit les identifiants entre guillemets doubles `"user"`, MySQL entre backticks `` `user` `` — regarde le `#[ORM\Table(name: '`user`')]` dans ton User.php : ces backticks sont là parce que `user` est un mot réservé en MySQL), mais les concepts sont les mêmes.

## À retenir

- Une base relationnelle organise les données en **tables** (colonnes typées, lignes = enregistrements), chaque ligne ayant un **id unique**.
- Contrairement à Excel, la base **impose les types** et évite la duplication : une information vit à UN seul endroit, les autres tables y font référence.
- Dupliquer une donnée (ex. le nom du club dans chaque ligne utilisateur) crée des **anomalies de mise à jour** : c'est LA raison d'être du modèle relationnel.
- **SQL** est le langage commun à tous les SGBD relationnels ; PostgreSQL (Supabase/Velito) et MySQL (Venaball) en sont deux implémentations.
- Doctrine est un **ORM** : il fait le pont entre tes classes PHP et les tables MySQL, mais le jury attend que tu comprennes les tables derrière.

## Mise en pratique

Objectif : créer ta première table dans l'éditeur SQL de Supabase (projet Velito Compta ou un projet de test).

1. Ouvre Supabase → ton projet → menu « SQL Editor » → « New query ».
2. Copie-colle et exécute :

```sql
-- Une table d'entraînement : les clubs, version simplifiée de Venaball
CREATE TABLE club_test (
  id SERIAL PRIMARY KEY,        -- identifiant auto-incrémenté
  nom VARCHAR(150) NOT NULL,    -- texte obligatoire, 150 caractères max
  ville VARCHAR(100),           -- texte facultatif
  is_active BOOLEAN DEFAULT true
);
```

3. Insère deux lignes :

```sql
INSERT INTO club_test (nom, ville) VALUES
  ('MABB', 'Amiens'),
  ('ASVEL', 'Villeurbanne');
```

4. Affiche le contenu : `SELECT * FROM club_test;`
5. Essaie maintenant de casser le typage : `INSERT INTO club_test (nom) VALUES (NULL);`

Résultat attendu : l'étape 4 affiche 2 lignes avec des `id` 1 et 2 générés automatiquement ; l'étape 5 échoue avec une erreur `null value in column "nom" violates not-null constraint` — la base refuse une donnée invalide, ce qu'Excel n'aurait jamais fait. Garde cette table, on la réutilisera.
