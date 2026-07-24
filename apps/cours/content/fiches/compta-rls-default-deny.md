---
titre: "Row Level Security : le cloisonnement garanti par la base, pas par le code"
projet: "compta"
bloc: 2
themes: ["securite", "base-de-donnees"]
source: "apps/compta/sql/02_rls_noyau.sql"
date: 2026-07-10
---

## Le concept

Dans Velito Compta, les données de VEA (association) et de VENA (SASU) ne
doivent JAMAIS se mélanger. J'aurais pu compter sur des `where entite_id = X`
dans chaque requête — mais un `where` oublié = une fuite de données.

La Row Level Security (RLS) de Postgres inverse la logique : une fois
activée sur une table, **plus rien ne passe par défaut** ("default deny").
Chaque ligne n'est visible que si une *policy* l'autorise. Le filtre est
appliqué par Postgres lui-même, à chaque requête : mes policies remontent la
chaîne de propriété `transaction → entite → proprietaire_id = auth.uid()`
(l'uuid extrait du JWT de l'utilisateur connecté par Supabase).

Conséquence spectaculaire : mon repository fait un `select * from entite`
**sans aucun filtre**, et ne reçoit pourtant que MES entités. Prouvé par
tests automatisés (harnais PGlite, 18 assertions : l'utilisateur B ne lit ni
n'écrit rien chez A, un anonyme ne voit rien).

Distinction clé dans une policy : `USING` filtre ce qu'on peut LIRE/modifier,
`WITH CHECK` valide ce qu'on ÉCRIT. Sans WITH CHECK, on pourrait insérer une
ligne chez quelqu'un d'autre sans pouvoir la relire — écriture sale quand même.

## Comment je l'explique au jury

« Le cloisonnement entre mes deux entités n'est pas assuré par la discipline
de mon code applicatif mais par la structure de la base : Row Level Security
en default-deny, avec des policies qui remontent la propriété jusqu'à
l'utilisateur du JWT. Même une requête volontairement malveillante sans
clause where ne peut pas lire les données d'une autre entité — je l'ai
prouvé par des tests automatisés qui simulent deux utilisateurs. »

## La question vicieuse du jury

**« Si la RLS protège tout, pourquoi gardez-vous aussi des contrôles dans
l'application ? »** Réponse : défense en profondeur. La RLS protège les
DONNÉES, mais l'expérience utilisateur a besoin de contrôles applicatifs
(messages d'erreur propres, middleware qui redirige vers /login, liste
blanche d'accès à l'interface). Et inversement : si une faille applicative
apparaît, la RLS reste le dernier rempart. Chaque étage a son rôle ; aucun
ne fait confiance à l'étage du dessus.
