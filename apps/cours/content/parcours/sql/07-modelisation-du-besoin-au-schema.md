---
titre: "Modélisation : du besoin métier au schéma de tables"
parcours: "sql"
ordre: 7
niveau: "intermediaire"
duree: 30
date: 2026-07-25
---

## Le cours

Leçon la plus importante du parcours : c'est LE cœur du bloc 2 du référentiel CDA (« concevoir et développer la persistance des données »). Le jury ne te demandera pas seulement d'écrire du SQL — il te demandera de **justifier ton schéma**. Voici la méthode.

**Étape 1 — partir du besoin, en français.** Exemple Venaball : « des utilisateurs s'inscrivent ; il existe des clubs ; un utilisateur peut avoir un ou plusieurs rôles (coach, joueur, parent…) dans un ou plusieurs clubs ». On souligne les noms (candidats **entités** : Utilisateur, Club, Rôle) et les verbes/liens (candidats **associations** : « a un rôle dans »).

**Étape 2 — dessiner le MCD** (Modèle Conceptuel de Données, méthode Merise — l'équivalent UML est le diagramme de classes). On y pose les entités et surtout les **cardinalités**, c'est-à-dire les « combien » :

- **1-N (un-à-plusieurs)** : UN club a PLUSIEURS adhésions, une adhésion concerne UN seul club. C'est la relation la plus courante.
- **N-N (plusieurs-à-plusieurs)** : un utilisateur est lié à plusieurs clubs, ET un club est lié à plusieurs utilisateurs.
- **1-1** : rare — souvent le signe que les deux entités pourraient fusionner (ou qu'on isole des données sensibles).

Pour trouver la cardinalité, pose toujours les deux questions dans les deux sens : « un user peut-il avoir plusieurs clubs ? » (oui) et « un club peut-il avoir plusieurs users ? » (oui) → N-N.

**Étape 3 — traduire en tables (le modèle physique).** Les règles mécaniques :

- Une entité → une table, avec une clé primaire `id`.
- Une relation **1-N** → une **clé étrangère du côté N**. C'est le côté « plusieurs » qui porte le renvoi : `api_token.user_id` pointe vers `user`, jamais l'inverse (un user a plusieurs tokens → impossible de stocker « les » tokens dans une colonne de `user`).
- Une relation **N-N** → **une table de liaison** (table pivot). On ne peut PAS la représenter avec une seule clé étrangère : il faut une troisième table contenant deux clés étrangères. C'est exactement `user_club_role` dans Venaball : `user_id` + `club_id`.

Et Venaball illustre un raffinement que le jury adorera : la **N-N porteuse de données** (ou « enrichie »). La table pivot ne contient pas que les deux clés — l'association elle-même a des attributs : `role` (COACH, JOUEUR…), `status` (pending/active/rejected), `valide_par_user_id`, `valide_at`, `created_at`. La question « OÙ mettre le rôle ? » est un test de conception classique : pas dans `user` (il varie selon le club), pas dans `club` (il varie selon la personne) → il appartient à **la relation** entre les deux, donc à la table pivot.

**Étape 4 — poser les contraintes.** Un schéma sans contraintes est une déclaration d'intention ; les contraintes le font respecter. Regarde UserClubRole.php :

```php
#[ORM\UniqueConstraint(name: 'unique_user_club_role', columns: ['user_id', 'club_id', 'role'])]
```

Cette **contrainte d'unicité composite** dit : « le MÊME user ne peut pas avoir DEUX FOIS le MÊME rôle dans le MÊME club » — mais peut avoir deux rôles différents dans le même club. C'est une règle métier gravée dans la base : même un bug du code PHP ne pourra pas la violer.

Cette démarche (éliminer les redondances, chaque fait à un seul endroit) porte un nom : la **normalisation**. Sans réciter les formes normales, retiens l'esprit : si une information est recopiée à plusieurs endroits, ton schéma a probablement un défaut — crée une table et une clé étrangère.

## À retenir

- Démarche de conception : besoin en français → entités + associations + **cardinalités** (MCD) → tables + clés (modèle physique) → contraintes.
- Relation **1-N** : clé étrangère **du côté N** (côté « plusieurs »). Relation **N-N** : **table de liaison** avec deux clés étrangères — obligatoire.
- Une N-N peut être **porteuse de données** : `user_club_role` porte `role`, `status`, l'audit de validation — les attributs qui appartiennent à la relation, pas aux entités.
- Une **contrainte d'unicité composite** (user_id + club_id + role) grave une règle métier dans la base, hors d'atteinte des bugs applicatifs.
- Normaliser = chaque fait stocké à UN seul endroit ; la redondance est un signal d'alarme de conception.

## Mise en pratique

Objectif : modéliser toi-même une nouvelle fonctionnalité Venaball, puis vérifier contre le vrai schéma.

1. Ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/UserClubRole.php` et reconstitue sur papier le MCD du trio User–Club : dessine 2 rectangles (User, Club), la relation N-N entre eux, et liste les attributs portés par la relation. Vérifie que ta liste contient au moins `role`, `status`, `roleDemande`, `valideAt`.
2. Nouveau besoin (fictif mais réaliste) : « Venaball doit gérer des ÉQUIPES : chaque équipe appartient à UN club ; un joueur peut être inscrit dans PLUSIEURS équipes ; pour chaque inscription on note la date et le numéro de maillot. » Sur papier : identifie les entités, les deux relations et leurs cardinalités.
3. Traduis en SQL dans l'éditeur Supabase :

```sql
CREATE TABLE equipe_test (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  club_id INT NOT NULL REFERENCES c_test(id) ON DELETE CASCADE  -- 1-N : FK côté N
);
-- À toi d'écrire la table de liaison joueur/équipe :
-- deux FK, numero_maillot INT, inscrit_le DATE,
-- et une contrainte UNIQUE (user_id, equipe_id).
```

4. Teste ta contrainte : insère deux fois le même joueur dans la même équipe.
5. Question jury (réponds à voix haute) : pourquoi le numéro de maillot est-il dans la table de liaison et pas dans la table joueur ?

Résultat attendu : (2) Club—Équipe = 1-N (FK `club_id` dans `equipe_test`), Joueur—Équipe = N-N porteuse de données (table de liaison) ; (4) la deuxième insertion échoue avec `duplicate key value violates unique constraint` ; (5) parce qu'un joueur peut avoir un numéro DIFFÉRENT dans chaque équipe : le numéro qualifie la relation, pas le joueur. Si tu sais dire ça, tu tiens ta soutenance bloc 2.
