---
titre: "Le numéro de papa : quand la clé d'identité rassemble des gens différents"
projet: "vea"
bloc: 2
themes: ["base-de-donnees", "modelisation", "metier"]
source: "apps/vea/sql/vea-merge-preinscrit-phone-v2.sql"
date: 2026-09-04
---

## Le concept

VEA pré-inscrit des jeunes lors des animations, sur une feuille ou un formulaire rapide. Plus tard, le jeune se crée un compte. Il faut relier les deux, sinon il repart de zéro et perd sa progression.

La version 1 fusionnait automatiquement sur un seul critère : **le numéro de téléphone**. C'est le raisonnement naturel — un numéro, une personne.

En quartier, c'est faux. Plusieurs enfants d'une même famille donnent le numéro du parent. Résultat concret : le petit frère qui s'inscrit avec le numéro de papa se retrouvait rattaché à la fiche — et à la progression — de sa grande sœur déjà pré-inscrite. Deux personnes fusionnées en une. Des données corrompues, et **difficiles à détecter** : la fiche existe, elle est cohérente, elle est simplement à la mauvaise personne.

La v2 exige **téléphone + prénom + nom** identiques, tous normalisés :

```sql
v_phone  := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''), '\s', '', 'g');
v_prenom := lower(trim(coalesce(new.raw_user_meta_data->>'prenom','')));
v_nom    := lower(trim(coalesce(new.raw_user_meta_data->>'nom','')));
```

La normalisation n'est pas cosmétique : sans elle, `"06 12 34 56 78"` et `"0612345678"` sont deux chaînes différentes, et `"Dupont"` ne rejoint pas `"dupont"`. Comparer des saisies humaines sans les normaliser, c'est comparer des fautes de frappe.

Et la règle de prudence : **si le prénom ou le nom manque, on ne fusionne pas.** Une fratrie ne déclenche plus rien, chaque enfant garde sa fiche, et un rapprochement manuel reste possible. Le principe : en cas de doute, **ne rien faire est réversible, fusionner ne l'est pas.**

La leçon générale dépasse le cas : une **clé d'identité** doit être choisie sur la réalité du terrain, pas sur ce qui semble unique en théorie. Un téléphone identifie un foyer, pas une personne. Une adresse mail non plus toujours. Ce que je croyais être un identifiant était un attribut partagé.

## Comment je l'explique au jury

« Je fusionnais automatiquement une fiche pré-inscrite avec un nouveau compte sur le seul critère du téléphone. En quartier, plusieurs enfants d'une même famille utilisent le numéro du parent : un petit frère héritait de la fiche et de la progression de sa grande sœur. Le bug est particulièrement mauvais parce qu'il ne produit aucune erreur — juste une fiche cohérente attribuée à la mauvaise personne. J'exige maintenant téléphone plus prénom plus nom, tous normalisés, et je ne fusionne pas si l'un manque. Ce que j'en retiens : une clé d'identité se choisit sur la réalité du terrain. Un téléphone identifie un foyer, pas un individu. »

## La question vicieuse du jury

**« Et deux frères prénommés pareil ? Ou deux homonymes dans le même club ? »**

Ils ne sont pas couverts, et le cas n'est pas théorique — les prénoms se répètent dans les familles, et un club de quartier peut avoir deux homonymes. Ma règle actuelle les fusionnerait à tort, exactement comme la v1 fusionnait les fratries. Ce que la v2 apporte, ce n'est pas la certitude : c'est d'avoir réduit la probabilité d'un faux rapprochement de « fréquent » à « rare ». La vraie sortie de ce problème n'est pas d'empiler des critères — on n'atteindra jamais l'unicité par accumulation d'attributs devinés — mais de **ne plus deviner** : donner à l'animateur un code de pré-inscription, ou lui faire valider le rapprochement dans le back-office. Une fusion automatique est toujours un pari sur l'identité, et le bon design consiste à supprimer le pari plutôt qu'à l'affiner. Ce qui reste vrai en attendant, c'est le sens du défaut : je préfère deux fiches à séparer manuellement à deux personnes mélangées qu'on ne pourra plus démêler.
