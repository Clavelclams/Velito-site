---
titre: "Une machine à états sort les transitions interdites du code métier"
projet: "arena"
bloc: 3
themes: ["architecture", "metier"]
source: "apps/arena/lib/arena/transitions.ts"
date: 2026-09-04
---

## Le concept

Un tournoi a cinq états : `BROUILLON`, `OUVERT`, `EN_COURS`, `TERMINE`, `ANNULE`. Tous les changements ne sont pas permis — on ne repasse pas un tournoi terminé en brouillon, on ne rouvre pas des inscriptions sur un tournoi en cours.

La version naïve, c'est une cascade de `if` dans la fonction qui change le statut. Elle grossit à chaque nouvel état, et elle est impossible à tester sans base de données. La version que j'ai retenue, c'est **une table de transitions** dans un module pur :

```ts
const TRANSITIONS: Record<StatutTournoi, readonly StatutTournoi[]> = {
  BROUILLON: ["OUVERT", "ANNULE"],
  OUVERT:    ["BROUILLON", "ANNULE"],
  EN_COURS:  ["TERMINE", "ANNULE"],
  TERMINE:   [],
  ANNULE:    [],
};

export function transitionAutorisee(depuis: StatutTournoi, vers: StatutTournoi): boolean {
  return TRANSITIONS[depuis].includes(vers);
}
```

Toutes les règles sont **lisibles d'un coup d'œil**, à un seul endroit. `TERMINE` et `ANNULE` ont un tableau vide : ce sont des états terminaux, et ça se voit sans lire une ligne de logique.

L'absence la plus intéressante est `OUVERT → EN_COURS`. Elle n'est pas dans la table, et c'est délibéré : démarrer un tournoi n'est pas un changement de statut, c'est une opération qui **génère le bracket**. Elle passe par `demarrerTournoi`, jamais par le formulaire générique de changement d'état. Ce que la table interdit, c'est d'arriver à `EN_COURS` sans avoir créé les matchs — un état incohérent où le tournoi serait démarré mais vide.

Deuxième garde, sur l'entrée. Le statut arrive d'un `FormData`, donc du navigateur, donc de quelque chose auquel je ne fais pas confiance :

```ts
export function estStatutTournoi(valeur: string): valeur is StatutTournoi {
  return ["BROUILLON", "OUVERT", "EN_COURS", "TERMINE", "ANNULE"].includes(valeur);
}
```

Le type de retour `valeur is StatutTournoi` est un **prédicat de type** : après un `if (estStatutTournoi(x))`, TypeScript sait que `x` est un `StatutTournoi`. La vérification a lieu à l'exécution — TypeScript disparaît à la compilation et ne protège de rien face à un POST forgé.

## Comment je l'explique au jury

« Le cycle de vie d'un tournoi est une machine à états, écrite comme une table qui associe à chaque statut la liste de ses successeurs autorisés. C'est dans un module pur, sans base ni framework, donc testable en quelques millisecondes. Les états terminaux ont une liste vide, ça se lit directement. Une transition est volontairement absente — passer de OUVERT à EN_COURS — parce que démarrer un tournoi génère aussi le bracket : ça ne peut pas être un simple changement de statut. Et comme la valeur vient d'un formulaire, je la valide à l'exécution avec un prédicat de type avant de la traiter : TypeScript n'existe plus au runtime. »

## La question vicieuse du jury

**« Votre table dit que `OUVERT → BROUILLON` est permis. On peut donc refermer les inscriptions après que des gens se sont inscrits ? »**

Oui, et c'est un choix, pas un oubli. Un orga qui a publié trop tôt — mauvaise date, mauvais lieu — doit pouvoir repasser en brouillon pour corriger sans annuler l'événement. Les inscriptions déjà prises ne sont pas détruites : elles restent en base, et repasser en `OUVERT` les retrouve. Ce que ça ne fait pas, en revanche, c'est **prévenir les inscrits** que le tournoi a disparu de la liste publique — et c'est un vrai manque produit, pas technique. Ce qui est en revanche verrouillé, c'est le retour en arrière depuis `EN_COURS` : une fois le bracket généré et des scores saisis, il n'y a plus de chemin retour dans la table. Repasser en brouillon à ce stade impliquerait de détruire des matchs joués, et je préfère qu'un tournoi mal démarré soit annulé et recréé plutôt que silencieusement vidé.
