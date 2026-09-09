---
titre: "Intégrer une API tierce : séparer ce qui se teste de ce qui se branche"
projet: "arena"
bloc: 3
themes: ["api", "architecture", "tests"]
source: "apps/arena/lib/toornament.ts"
date: 2026-09-04
---

## Le concept

Le positionnement d'ARENA est de **compléter** les grandes plateformes esport, pas de les concurrencer : un profil ARENA est un « CV esport », et un résultat obtenu ailleurs doit pouvoir s'y afficher avec un lien vers la source. D'où l'import Toornament.

Trois décisions structurent ce module.

**Le choix de l'API.** Toornament en expose trois. La *Viewer API* sert les données publiques d'un tournoi avec une simple clé — pas d'OAuth, aucun accès aux données privées. Les APIs Organizer et Participant demanderaient des autorisations que je n'ai aucune raison de détenir. **On demande le droit le plus faible qui répond au besoin** — le moindre privilège appliqué à une intégration.

**La séparation pur / réseau.** Le module a deux moitiés explicites : le parsing d'URL et la mise en forme sont des fonctions pures, testées dans `toornament.test.ts` ; les appels HTTP sont des fonctions async, non testées unitairement. Je ne teste pas le réseau, je teste **ce que je fais des réponses**. Un test qui appelle vraiment Toornament serait lent, instable, et échouerait le jour où leur API a un hoquet — un test qui échoue pour une raison extérieure au code finit par être ignoré, et un test ignoré est pire que pas de test.

**La validation du domaine.** L'utilisateur colle une URL, dans une des quatre formes réellement rencontrées :

```
https://www.toornament.com/fr/tournaments/386310599608992768/information
https://play.toornament.com/fr/tournaments/386310599608992768/...
```

```ts
export function extraireIdTournoiToornament(url: string): string | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  /* vérifie le DOMAINE, puis le motif du chemin */
}
```

Deux choses ici. La fonction rend `null` et **ne lève jamais** : l'appelant transforme ce `null` en message clair pour l'utilisateur, au lieu d'une exception à rattraper. Et je vérifie le **domaine**, pas seulement le motif du chemin — accepter `n-importe-quel-site.com/tournaments/123` laisserait créer des résultats « vérifiables » dont le lien ne pointe pas vers Toornament. Le lien est la preuve ; s'il peut pointer ailleurs, la preuve ne vaut rien.

## Comment je l'explique au jury

« Pour importer des résultats Toornament, j'ai pris leur Viewer API : elle sert les données publiques avec une simple clé, là où les autres APIs demanderaient des autorisations dont je n'ai pas besoin — c'est le moindre privilège. Le module est coupé en deux : le parsing d'URL et la mise en forme sont purs et testés, les appels réseau ne le sont pas. Je ne teste pas le réseau, je teste ce que je fais des réponses. Et je valide le domaine de l'URL collée, pas seulement sa forme : le lien vers la source est ce qui rend le résultat vérifiable, donc il doit vraiment pointer vers Toornament. »

## La question vicieuse du jury

**« Vous importez des données d'un site tiers. Que se passe-t-il quand ils changent leur API, ou quand elle est en panne ? »**

En panne, c'est le cas simple : l'import est une action manuelle du staff, pas un job de fond. Rien ne se dégrade côté joueur, le staff voit une erreur et réessaie plus tard. Aucune fonctionnalité d'ARENA ne dépend de Toornament pour fonctionner — c'est un enrichissement, pas une dépendance. La migration `006_arena_resultats_externes.sql` stocke le résultat importé **chez moi** : une fois l'import fait, la donnée est à moi et survit à la disparition de Toornament, avec l'URL source conservée pour la traçabilité. Le changement d'API est le vrai risque, et il n'est pas couvert : si leur format évolue, mon parsing casse et je ne l'apprendrai qu'au prochain import raté. La parade honnête serait un test de contrat exécuté séparément de la CI — pas dans les tests unitaires, où il rendrait le build instable, mais dans un job planifié qui m'alerte. Ce n'est pas fait ; c'est la limite que j'ai acceptée pour une fonctionnalité d'enrichissement utilisée quelques fois par mois.
