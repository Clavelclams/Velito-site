---
titre: "Une base de code, deux produits : choisir l'identité sur le domaine, pas sur une variable"
projet: "venaball"
bloc: 3
themes: ["architecture", "deploiement", "multi-tenant"]
source: "src/Service/MarqueResolver.php (09/09/2026)"
date: 2026-09-09
---

## Le concept

Depuis le 9 septembre, **le même code Symfony** est déployé sur deux hébergements et sert deux produits :

- `manager.mabb.fr` / `pirb.mabb.fr` → **MABB Manager**, l'outil privé du club historique
- `club.venaball.fr` / `api.venaball.fr` → **Venaball Club**, le produit vendu aux autres clubs

Même dépôt, même tag, deux bases de données, deux identités visuelles. Le nom affiché, la palette, la baseline changent ; le code non.

Il ne faut pas confondre ça avec les **couleurs de club** (`Club::couleurPrimaire`), qui personnalisent l'interface *pour un club donné à l'intérieur d'une instance*. Ici on parle de l'identité du **produit** : un club X sur `club.venaball.fr` voit « Venaball Club » avec ses couleurs à lui. Deux niveaux de personnalisation, deux mécanismes.

Le choix technique : `MarqueResolver` lit le **host de la requête**, pas une variable d'environnement.

```php
$host = $this->requestStack->getCurrentRequest()?->getHost() ?? '';

// str_ends_with plutôt qu'un str_contains : « venaball.fr.attaquant.tld »
// ne doit pas passer pour du Venaball.
if ($host !== '' && (str_ends_with($host, 'venaball.fr') || str_starts_with($host, 'club.venaball'))) {
    return self::VENABALL;
}
return self::MABB;
```

Deux raisons de préférer le host à un `APP_MARQUE=venaball` dans le `.env` :

1. **Une même instance peut servir plusieurs domaines.** C'est déjà le cas côté MABB (`manager.`, `pirb.`, `mabb.fr`). Une variable dirait « cette instance est X » ; le host dit « cette requête est pour X ». Le second est plus vrai.
2. **Le défaut est sûr.** Un déploiement mal configuré — variable oubliée, host inconnu — retombe sur MABB Manager, jamais sur la marque commerciale. On ne montre pas « Venaball » aux utilisateurs du club par accident. Le défaut protège l'existant, pas la nouveauté.

Le détail de sécurité est dans le commentaire : `str_ends_with` et non `str_contains`. `venaball.fr.attaquant.tld` *contient* `venaball.fr`, mais ne *se termine pas* par lui. Un test de chaîne trop large fait qu'un domaine hostile obtient l'identité de la marque — et donc sa confiance visuelle.

Côté Twig, une extension expose une variable `marque` disponible partout : `{{ marque.nom }}`, `{{ marque.primaire }}`. Les templates ne connaissent ni MABB ni Venaball ; ils affichent ce qu'on leur donne.

## Comment je l'explique au jury

« Mon code Symfony sert deux produits : MABB Manager pour le club d'origine et Venaball Club pour les clubs clients. Ce n'est pas deux branches ni deux dépôts — c'est le même code déployé deux fois avec deux bases. L'identité de marque est résolue sur le host de la requête, pas sur une variable d'environnement, pour deux raisons : une instance peut servir plusieurs domaines, et surtout le défaut est sûr — un host inconnu retombe sur la marque historique, jamais sur la commerciale. La vérification utilise `str_ends_with` et pas `str_contains`, sinon un domaine `venaball.fr.attaquant.tld` obtiendrait l'identité Venaball. Et je distingue la marque du produit des couleurs d'un club : ce sont deux niveaux de personnalisation. »

## La question vicieuse du jury

**« Deux instances, un seul code : le jour où une fonctionnalité doit exister sur Venaball et pas sur MABB, vous faites comment ? »**

Aujourd'hui, avec un `if ($marque->estVenaball())` — et c'est exactement le début du problème. La première fois, c'est une ligne. La dixième, le code est truffé de conditions de marque, et une fonctionnalité qui « ne devrait exister que sur Venaball » est devenue impossible à tester sans reproduire les deux hosts. La réponse propre est d'exprimer ces différences comme des **capacités configurées** plutôt que comme des tests d'identité : la marque porte un tableau de fonctionnalités activées, et le code demande « cette instance a-t-elle la facturation ? » au lieu de « est-ce Venaball ? ». Le jour où un troisième produit apparaît, ou où le MABB veut la facturation, on change une ligne de configuration, pas trente conditions. Je n'en suis pas là — il n'y a qu'une différence réelle aujourd'hui, l'affichage — mais je sais où est la pente, et l'audit du 09/09 a déjà recensé 286 endroits où le code suppose « le club = la MABB ». Ce chiffre est le vrai coût de la transition mono → multi, et il n'est pas encore payé.
