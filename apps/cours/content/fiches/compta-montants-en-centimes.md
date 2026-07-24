---
titre: "Montants en centimes entiers — jamais de flottant en compta"
projet: "compta"
bloc: 2
themes: ["base-de-donnees", "fiabilite"]
source: "apps/compta/lib/services/montants.ts · sql/01_schema_noyau.sql"
date: 2026-07-10
---

## Le concept

Un ordinateur stocke les nombres à virgule en binaire, et 0,1 n'a pas de
représentation binaire exacte : `0.1 + 0.2` vaut `0.30000000000000004`. En
comptabilité, ces micro-erreurs se cumulent et donnent des soldes faux.

Ma parade dans Velito Compta : **tous les montants sont des entiers, en
centimes** (`bigint` côté Postgres, `number` côté JS — exact jusqu'à 2^53,
soit ~90 000 milliards d'euros en centimes). `12,50 €` est stocké `1250`.
La conversion centimes ↔ euros n'existe qu'à UN endroit :
`lib/services/montants.ts`.

Deuxième piège évité : le parsing de la saisie utilisateur. `parseFloat("12,50")`
vaut `12` (il s'arrête à la virgule) et `12.10 * 100` vaut `1209.999…`. Ma
fonction `eurosVersCentimes()` découpe la CHAÎNE en partie entière et partie
décimale, et ne fait que des opérations entières. 23 tests unitaires couvrent
les cas limites.

## Comment je l'explique au jury

« J'ai stocké tous les montants en centimes entiers plutôt qu'en flottant,
parce que les flottants binaires ne représentent pas exactement les décimaux
— 0,1 plus 0,2 ne fait pas 0,3 en binaire, et en comptabilité un arrondi qui
se cumule, c'est un solde faux. J'ai écarté le type numeric de Postgres car
le client JavaScript le renvoie en chaîne de caractères pour préserver la
précision, et une addition de chaînes en JS concatène au lieu d'additionner.
L'entier, lui, reste fiable de la base jusqu'au navigateur. »

## La question vicieuse du jury

**« Et pourquoi pas `numeric(12,2)` alors, puisqu'il est exact aussi ? »**
Réponse : numeric est exact DANS Postgres, mais mon application est en
JavaScript — supabase-js renvoie numeric en `string` (pour ne pas perdre de
précision), et `"10" + "5"` donne `"105"` en JS. J'aurais déplacé le risque
de la base vers le code client. L'entier en centimes est le seul type exact
de bout en bout dans MA stack. Le compromis : convertir à l'affichage — et
cette conversion vit dans un seul fichier de la couche métier, testé.
