---
titre: "Une clé d'API qu'on ne peut pas voler en volant la base"
projet: "arena"
bloc: 3
themes: ["api", "securite-applicative", "base-de-donnees"]
source: "apps/arena/sql/014_arena_api_cles.sql, apps/arena/lib/arena/api-cles.ts, apps/arena/lib/arena/api-v1.ts"
date: 2026-11-18
---

## Le concept

Depuis le 14/11/2026, ARENA a une API publique en lecture : `/api/v1/tournois`, `/api/v1/tournois/{token}`, `/api/v1/classement`. Un club peut afficher ses résultats sur son site. Il faut une clé, créée par le staff dans `/admin/api`.

Les données sont déjà publiques. Alors pourquoi une clé ? Pour trois raisons, et aucune n'est « protéger les données » :

1. **Savoir qui consomme** : une clé = une organisation, un nom (« Site du club »).
2. **Limiter le débit** : 120 requêtes par minute et par clé. Un script mal écrit ne fait pas tomber le site un jour de tournoi.
3. **Couper un abus sans couper tout le monde** : on révoque UNE clé.

**La clé ne donne aucun droit en plus.** Les routes lisent avec un client Supabase anonyme et sans cookie (`lib/supabase/anon.ts`) : la RLS publique décide de ce qui sort. Même avec une clé valide, pas de brouillon, pas d'année de naissance, pas de mineur.

**Comment la clé est stockée.** C'est le cœur de la fiche :

```ts
export function genererCle(): string {
  return "arena_" + randomBytes(32).toString("base64url"); // 256 bits
}
export function empreinteCle(cle: string): string {
  return createHash("sha256").update(cle, "utf8").digest("hex");
}
```

- La clé complète n'est montrée **qu'une fois**, à la création. La base ne garde que son **empreinte SHA-256** et un préfixe lisible (`arena_ab12cd`) pour que le staff reconnaisse ses clés.
- À chaque requête, je recalcule l'empreinte de la clé reçue et je la cherche en base. Si quelqu'un vole la table, il a des empreintes : impossible de retrouver les clés.
- La clé se lit dans un **en-tête** (`Authorization: Bearer arena_…`), jamais dans l'URL : une URL finit dans les journaux des serveurs et l'historique.

**Le compteur, sans course.** La fonction `arena.api_consommer` vérifie la clé ET compte la requête en une seule instruction :

```sql
INSERT INTO arena.api_usage AS u (cle_id, minute, nb) VALUES (v_cle.id, v_min, 1)
ON CONFLICT (cle_id, minute) DO UPDATE SET nb = u.nb + 1
RETURNING u.nb INTO v_nb;
```

Deux requêtes simultanées ne peuvent pas lire le même compteur et passer toutes les deux : Postgres sérialise l'incrément. Une ligne par clé et par minute (« fenêtre fixe »), purgée au bout d'un jour.

**Les tables sont fermées.** RLS activée sans policy, aucun droit pour `anon` ni `authenticated`. Seul le serveur y touche.

Preuves : 10 tests sur les clés (`lib/arena/api-cles.test.ts`) et 38 contrôles PGlite pour les migrations 013 et 014 (`sql/test_sets_api.mjs`), dont « la 4e requête est refusée avec une limite à 3 » et « anon ne lit pas la table des clés ».

## Comment je l'explique au jury

« L'API est gratuite et ne montre que des données publiques : elle lit avec le client anonyme, donc la RLS s'applique. La clé sert à identifier qui consomme, à limiter le débit et à couper un abus. Je ne stocke que l'empreinte SHA-256 de la clé, comme un mot de passe : une fuite de la base ne donne aucune clé utilisable. Le comptage se fait en une instruction INSERT ON CONFLICT : deux requêtes simultanées ne peuvent pas passer sous la limite toutes les deux. »

## La question vicieuse du jury

**« Pourquoi SHA-256 et pas bcrypt, puisque vous comparez ça à un mot de passe ? »**

bcrypt est lent exprès : il sert à ralentir l'attaque par force brute d'un mot de passe **faible**, choisi par un humain. Ma clé n'est pas choisie par un humain : 32 octets aléatoires, 256 bits. Il n'y a rien à deviner, même avec une empreinte rapide. Et l'empreinte rapide a un avantage : elle est déterministe, donc je peux la chercher directement par index (`empreinte` est `UNIQUE`). Avec bcrypt (sel aléatoire), je devrais charger toutes les clés et les comparer une par une à chaque requête. Le choix dépend de l'entropie du secret : faible entropie, hachage lent ; forte entropie, hachage rapide.

Ce qui manque, honnêtement : la fenêtre fixe laisse passer jusqu'à 240 requêtes à cheval sur deux minutes, et il n'y a pas d'alerte quand une clé est souvent bloquée.
