---
titre: "Sortir le métier du contrôleur pour que le web et le mobile partagent les mêmes règles"
projet: "venaball"
bloc: 1
themes: ["architecture", "securite-applicative"]
source: "src/Service/ConvocationManager.php (VC-3, 04/08/2026)"
date: 2026-09-04
---

## Le concept

Venaball a deux façades : le site web en Twig, et une API JSON pour l'application mobile Expo. Le jour où l'app a eu besoin de convoquer des joueuses, les règles de convocation vivaient dans `ConvocationController`, mélangées au formulaire, au jeton CSRF, aux messages flash et à la redirection.

Deux options. Recopier le code dans le contrôleur d'API — et garantir la divergence : le projet en avait déjà fait les frais avec deux agrégateurs de stats faisant presque la même chose, dont l'écart n'a été découvert que quand les deux ont affiché des chiffres différents. Ou extraire.

`ConvocationManager` est cette extraction. La logique métier y vit seule ; les contrôleurs ne font plus que **traduire l'entrée et la sortie** — un `Request` HTTP d'un côté, du JSON de l'autre.

Ce que le service contient, c'est le métier, avec ses raisons :

**Décocher supprime la convocation, même déjà répondue — mais on le journalise.** Le coach a le droit de changer son effectif. Effacer la réponse de quelqu'un sans laisser de trace, c'est ce qu'on regrette le jour d'un litige.

**On ne re-notifie jamais une joueuse déjà convoquée.** Le coach rouvrira sa liste dix fois pour l'ajuster. Seules les *nouvelles* convocations déclenchent une notification. Une notification qu'on spamme est une notification qu'on ignore.

Et la règle de sécurité, celle qui justifie à elle seule l'extraction :

> On ne convoque jamais depuis une liste envoyée par le client. On part de l'**effectif réel de l'équipe** et on ne garde que les identifiants qui en font partie.

Un client bricolé pourrait poster l'identifiant d'une joueuse d'un autre club. Sans ce filtre, elle serait convoquée — et son nom renvoyé dans la réponse. C'est une **IDOR en écriture**, et le remède est toujours le même : ne pas valider ce que le client envoie, mais **partir de ce que le serveur sait** et intersecter.

Le point à saisir : cette règle est écrite **une fois**. Avant l'extraction, elle aurait dû être écrite dans le contrôleur web *et* dans le contrôleur d'API, et le jour où j'en aurais corrigé une seule, l'autre serait devenue la faille.

## Comment je l'explique au jury

« Quand l'application mobile a eu besoin des règles de convocation, elles étaient dans le contrôleur web, mêlées au formulaire et à la redirection. J'ai extrait la logique dans un service : les contrôleurs ne font plus que traduire l'entrée et la sortie, HTTP d'un côté, JSON de l'autre. J'ai évité la duplication parce que le projet en avait déjà payé le prix avec deux agrégateurs de stats divergents. Le gain le plus important est sécuritaire : la règle qui dit qu'on ne convoque jamais depuis la liste envoyée par le client, mais depuis l'effectif réel de l'équipe, est écrite une seule fois. Dupliquée, elle aurait fini corrigée d'un côté seulement. »

## La question vicieuse du jury

**« Vous avez déplacé du code d'un fichier à un autre. En quoi est-ce de l'architecture ? »**

Parce que ce n'est pas un déplacement, c'est un changement de **dépendances**. Avant, la règle métier dépendait de `Request`, de la session, du système de messages flash et de la redirection — donc elle ne pouvait exister que dans un contexte HTTP web. Après, elle dépend de l'`EntityManager` et de repositories, et rien d'autre : elle est appelable depuis un contrôleur web, un contrôleur d'API, une commande console ou un test, sans HTTP du tout. C'est ça, la couche métier — pas un dossier, un ensemble de dépendances. Le test le vérifie : mes tests fonctionnels de convocation appellent le service directement, sans monter de requête HTTP. Ce qui reste imparfait, et que je ne peux pas revendiquer : le service dépend toujours de Doctrine, donc il n'est pas testable sans base. Une architecture hexagonale complète mettrait un port de persistance derrière une interface et injecterait un adaptateur en mémoire dans les tests. Pour un projet à un développeur, j'ai jugé que le rapport bénéfice/complexité ne le justifiait pas — mais c'est un arbitrage, pas une ignorance de l'option.
