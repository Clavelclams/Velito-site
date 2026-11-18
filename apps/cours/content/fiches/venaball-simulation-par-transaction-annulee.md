---
titre: "Simuler une opération de masse avec le vrai code : une transaction qu'on annule au lieu de la valider"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "resilience"]
source: "src/Command/FfbbRelireSaisonCommand.php"
date: 2026-11-18
---

## Le concept

Le 16/11/2026, la lecture des résumés FFBB a été refaite. Tous les matchs déjà importés avaient été lus avec l'ancienne méthode, parfois fausse. Il fallait donc les **relire tous**, en production, sur les vraies données du club. Avant d'écrire quoi que ce soit, je voulais voir ce qui allait changer : quels scores, combien de joueuses reconnues, quels avertissements.

```jeu
{ "type": "choix", "question": "Pour un mode simulation, quelle approche garantit que la simulation montre exactement ce que fera l'exécution réelle ?", "choix": ["Écrire une deuxième version du code, qui calcule sans enregistrer", "Exécuter le vrai code dans une transaction, puis l'annuler", "Copier la base de production sur mon PC et lancer là-bas", "Ajouter un if ($simulation) devant chaque écriture"], "bonne": 1, "explication": "Deux versions du code finissent toujours par diverger, et un if oublié écrit en base. Avec la transaction annulée, c'est le même code qui tourne : seule la dernière instruction change." }
```

Une **transaction** est un groupe d'écritures que la base traite comme un tout : soit on les valide toutes (`commit`), soit on les annule toutes (`rollBack`). Tant que la transaction est ouverte, les changements ne sont pas définitifs. La commande `app:ffbb:relire-saison` s'en sert comme mode simulation :

```php
// src/Command/FfbbRelireSaisonCommand.php
$this->em->getConnection()->beginTransaction();
try {
    $res = $this->parser->parseEtPersister($r, $lecture['texte'], $lecture['lignes']);
    $apres = sprintf('%s-%s', $r->getScoreEquipe() ?? '?', $r->getScoreAdverse() ?? '?');
    if ($appliquer) {
        $this->em->flush();
        $this->em->getConnection()->commit();
    } else {
        $this->em->getConnection()->rollBack();
    }
} catch (\Throwable $e) {
    if ($this->em->getConnection()->isTransactionActive()) {
        $this->em->getConnection()->rollBack();
    }
    throw $e;
}
```

Le parser fait son vrai travail, écritures comprises. Je lis le résultat (le score « après »), puis sans l'option `--appliquer` j'annule tout. Quatre détails comptent :

- **La simulation est le comportement par défaut.** Pour écrire, il faut ajouter `--appliquer`. Oublier une option ne doit jamais déclencher l'action dangereuse.
- **Une transaction par match**, pas une pour toute la saison : un match qui échoue n'annule pas les autres.
- **`$this->em->clear()` après chaque match.** Annuler la transaction remet la base en état, mais pas les objets PHP : Doctrine garde en mémoire des entités modifiées. Sans `clear()`, le match suivant partirait d'objets qui ne correspondent plus à la base.
- **`isOpen()` en début de boucle** : après certaines erreurs SQL, Doctrine ferme son gestionnaire d'entités. La commande s'arrête avec un message clair au lieu d'enchaîner des erreurs.

```jeu
{ "type": "ordre", "consigne": "Remets dans l'ordre ce qui se passe pour un match en simulation.", "etapes": ["Lire le PDF avec Google Vision", "Ouvrir la transaction", "Lancer le vrai parser, qui écrit en base", "Noter le score et les avertissements obtenus", "Annuler la transaction", "Vider les objets Doctrine en mémoire"], "explication": "L'appel à Vision est fait avant la transaction : c'est un appel réseau lent, et une transaction doit rester ouverte le moins longtemps possible." }
```

Le résultat réel : première simulation sur 25 matchs, lecture du tableau, correction d'un cas, deuxième simulation, puis `--appliquer` : 23 matchs relus sans rien à signaler, 2 marqués « à revoir » pour une joueuse sans fiche.

Sans simulation : une correction de masse lancée à l'aveugle sur les stats d'une saison entière, avec pour seul recours la sauvegarde.

## Comment je l'explique au jury

« J'avais à relire tous les résumés de match d'une saison en production. Je ne voulais pas d'un mode simulation qui soit une copie du code, parce que les deux versions finissent par ne plus faire la même chose. La commande ouvre donc une transaction par match, exécute le vrai traitement, relève ce qui a changé, puis annule la transaction. Par défaut elle simule ; il faut passer `--appliquer` pour valider. J'ai lancé deux simulations, corrigé ce qu'elles montraient, et seulement ensuite appliqué. Le point technique à ne pas rater, c'est de vider le gestionnaire d'entités après chaque annulation, sinon Doctrine garde en mémoire des objets qui ne reflètent plus la base. »

## La question vicieuse du jury

**« Votre simulation est-elle vraiment sans effet ? »**

Sur la base, oui. Ailleurs, non, et il faut le savoir. Une transaction n'annule que ce qui passe par la base. Chaque match simulé fait deux **appels payants à Google Vision** (environ 0,003 euro par match, c'est écrit dans l'en-tête de la commande). Si le traitement envoyait un e-mail, une notification push ou écrivait un fichier, la simulation les ferait pour de vrai. J'ai relu le parser pour vérifier qu'il n'envoie rien, mais aucun test ne le garantit dans la durée : quelqu'un peut y ajouter une notification demain.

Deuxième limite : certaines instructions SQL ne s'annulent pas. Sur MySQL, un `ALTER TABLE` valide la transaction en cours sans prévenir. La commande n'en fait pas, mais c'est la raison pour laquelle cette technique ne marche pas pour simuler une migration.

Troisième limite, de calendrier : la simulation dit ce qui changerait **au moment où elle tourne**. Si un coach saisit des stats entre la simulation et l'application, le résultat diffère. Pour 25 matchs relus en quelques minutes, je l'ai accepté.
