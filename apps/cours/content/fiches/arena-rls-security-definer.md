---
titre: "RLS + SECURITY DEFINER : l'isolation multi-tenant garantie par Postgres"
projet: "arena"
bloc: 2
themes: ["base-de-donnees", "securite-applicative"]
source: "apps/arena/sql/001_arena_schema_v1.sql"
date: 2026-09-04
---

## Le concept

Le réflexe naturel, quand on veut qu'une orga ne voie que ses tournois, c'est d'ajouter un filtre dans la requête : `.eq("organisation_id", monOrga)`. Ça marche — jusqu'à la requête où on oublie le filtre. Et il n'y a rien pour prévenir : le code compile, la page s'affiche, elle affiche juste trop.

La **Row Level Security** déplace ce filtre dans la base. Chaque table a `ENABLE ROW LEVEL SECURITY` et des *policies* qui décrivent ce qu'un rôle a le droit de voir. À partir de là, un `SELECT * FROM arena.tournois` sans le moindre `WHERE` ne rend que les lignes autorisées : le filtre n'est plus quelque chose qu'on peut oublier.

Le problème pratique : la policy doit répondre à « cet utilisateur est-il staff de cette organisation ? », et la réponse est dans `shared.user_permissions` — une table que `anon` et `authenticated` n'ont pas le droit de lire. D'où la fonction :

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

**`SECURITY DEFINER`** : la fonction s'exécute avec les droits de celui qui l'a *créée*, pas de celui qui l'appelle. C'est ce qui lui permet de lire une table interdite à l'appelant. Elle ne rend qu'un booléen — jamais le contenu de la table.

**`SET search_path = shared, public`** : c'est la ligne de sécurité, et elle n'est pas optionnelle. Sans elle, un utilisateur pourrait créer un schéma à lui contenant une fausse table `user_permissions`, la placer en tête de son `search_path`, et la fonction — qui tourne avec les droits élevés — lirait *sa* table. Figer le `search_path` ferme cette porte. **Toute fonction `SECURITY DEFINER` sans `search_path` figé est une faille.**

Le dernier étage : `GRANT SELECT ON ALL TABLES IN SCHEMA arena TO anon, authenticated` — lecture seule. Aucune policy d'écriture pour `authenticated`. La surface d'écriture directe depuis le navigateur est **nulle par défaut** ; les écritures passent par des Server Actions qui vérifient les droits puis utilisent `service_role`.

## Comment je l'explique au jury

« L'isolation entre organisations est garantie par Postgres, pas par mes requêtes. Chaque table a la RLS activée et des policies qui décrivent qui voit quoi : même si j'oublie un filtre dans le code, la base ne rend pas les lignes des autres. Les policies s'appuient sur une fonction `est_staff` en `SECURITY DEFINER`, qui peut lire la table de permissions interdite à l'appelant et ne rend qu'un booléen. Son `search_path` est figé, sinon un utilisateur pourrait lui présenter une fausse table de permissions et la faire répondre oui. Et `authenticated` n'a que le SELECT : aucune écriture directe depuis le client. »

## La question vicieuse du jury

**« Si toutes les écritures passent par `service_role`, qui contourne la RLS, à quoi sert-elle ? »**

Elle sert sur la moitié la plus exposée : **la lecture**. Toutes les pages publiques — le tournoi partagé par QR code, le classement, les profils joueurs — sont lues par un client anonyme, et c'est la RLS qui décide de ce qui sort. Un tournoi en `BROUILLON` renvoie 404 à un visiteur, sans que j'aie écrit la moindre condition dans la route. Pour les écritures, la RLS est effectivement contournée par `service_role`, donc la protection est ailleurs : la Server Action appelle `requireStaff` avant d'écrire, et surtout les invariants critiques sont posés en **triggers**, qui eux s'appliquent à `service_role` aussi — un match validé ne peut plus changer de score, même avec la clé de service. J'ai trois lignes de défense à trois niveaux : la RLS pour la lecture, le contrôle applicatif pour l'écriture, les triggers et contraintes pour les invariants. Aucune ne suffit seule.
