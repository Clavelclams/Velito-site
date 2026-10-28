---
titre: "Un robot qui lit les PDF deux fois par jour sans jamais effacer ce que le coach a corrigé"
projet: "venaball"
bloc: 3
themes: ["resilience", "metier"]
source: "src/Command/ProcessFfbbResumesOcrCommand.php"
date: 2026-10-04
---

## Le concept

Après un match officiel, la FFBB fournit un PDF « résumé » avec les minutes jouées, les tirs réussis et les fautes de chaque joueuse. Le coach le dépose dans Venaball. Pour transformer ce PDF en statistiques, le projet utilise l'**OCR** (reconnaissance optique de caractères : un service qui lit le texte d'une image) de Google Vision, puis un **parser** (un programme qui découpe ce texte en données structurées) qui remplit les `EvaluationMatch` de chaque joueuse.

Le 01/10/2026 (commit `c443cc1`), cette lecture est devenue **automatique** : un **cron** (une tâche que le serveur lance tout seul à heure fixe) doit l'exécuter à 8 h et 18 h. Automatiser pose deux questions. Que se passe-t-il quand la tâche tourne pour la cinquantième fois sur les mêmes PDF ? Et que se passe-t-il si un coach a corrigé à la main une stat mal lue ?

**Première réponse : l'idempotence.** Une opération est **idempotente** quand la lancer une fois ou dix fois donne le même résultat. Ici, chaque rencontre garde un **marqueur** : la date du dernier passage et l'**empreinte** du fichier (un `sha1`, une signature de 40 caractères qui change dès qu'un seul octet du fichier change). Deux colonnes ajoutées par la migration `Version20260930160000` : `resume_ocr_at` et `resume_ocr_sha`. En mode `--auto` :

```php
// src/Command/ProcessFfbbResumesOcrCommand.php, getRencontresToProcess()
if ($r->getResumeOcrAt() === null) {
    $aTraiter[] = $r;          // jamais lu
    continue;
}
$sha = sha1_file($path) ?: null;
if ($sha !== null && $sha !== $r->getResumeOcrSha()) {
    $aTraiter[] = $r;          // le coach a remplacé le PDF
}

// ... après un traitement réussi, dans execute() :
$rencontre->setResumeOcrAt(new \DateTimeImmutable());
$rencontre->setResumeOcrSha(sha1_file($pdfAbsolutePath) ?: null);
$this->em->flush();
```

Le mécanisme : un PDF déjà lu et inchangé est **ignoré**, sans appel à Google Vision (qui est facturé). Le marqueur n'est posé **qu'après un succès** : si l'appel échoue (exception attrapée par le `catch (\Throwable $e)`), la rencontre reste « à lire » et le passage suivant réessaie. Et si le coach dépose un nouveau PDF, l'empreinte change, la rencontre est relue.

**Deuxième réponse : ne jamais écraser un humain.** Dans `src/Service/Ffbb/FfbbResumeOcrParser.php` :

```php
} elseif ($eval->getSource() === EvaluationMatch::SOURCE_MANUEL) {
    // Une évaluation SAISIE OU CORRIGÉE PAR UN HUMAIN n'est jamais réécrite par l'OCR.
    $result['evals_conservees'] = ($result['evals_conservees'] ?? 0) + 1;
    continue;
}
```

Chaque statistique porte sa **source** (manuel, live, ffbb, easystats). Si la ligne vient d'une saisie manuelle, l'OCR passe à la joueuse suivante sans rien toucher. Les présences suivent la même règle (`Presence::SOURCE_MANUEL` respectée). Avant ce commit, un second passage remplaçait la correction du coach par la lecture, parfois fausse, du PDF.

Enfin, le cron OVH ne sait pas passer d'arguments à un script. `bin/cron-ffbb-ocr.php` fixe donc la commande et lance `php bin/console app:process-ffbb-resumes --auto --no-interaction --env=prod` dans un sous-processus (puis la même chose pour les positions de tirs). Le bouton « Lire le PDF maintenant » de la fiche rencontre lance la même commande en mémoire : une logique, deux portes d'entrée.

Sans tout ça : chaque passage relirait toute la saison (coût Google Vision multiplié par 2 par jour), et effacerait les corrections du coach deux fois par jour. Le coach arrêterait de corriger, puis arrêterait de faire confiance aux stats.

## Comment je l'explique au jury

« La lecture des PDF FFBB tourne seule, deux fois par jour, donc elle doit pouvoir se relancer sans danger. Chaque rencontre garde la date du dernier passage et l'empreinte sha1 du PDF : un fichier déjà lu et inchangé n'est plus envoyé à Google Vision, un fichier remplacé est relu. Le marqueur n'est posé qu'après un succès, donc un échec est retenté au passage suivant. Et chaque stat garde sa source : si un coach l'a saisie ou corrigée à la main, l'OCR ne la touche jamais. Le principe, c'est que l'automatique complète, mais que l'humain a le dernier mot. »

## La question vicieuse du jury

**« Comment savez-vous que ce cron tourne vraiment en production ? »**

Je ne le sais pas, et je ne le prétends pas. Le script `bin/cron-ffbb-ocr.php` existe et est documenté, mais dans le document maître du projet, « crons OVH créés sur MABB et Velito (... OCR 8h/18h) » figure encore dans la liste des choses à faire avant les stores. Tant que je n'ai pas vu la tâche dans l'interface OVH et une trace dans les logs, le cron n'est pas prouvé posé.

Et même posé, je verrais mal un échec. La commande renvoie `Command::SUCCESS` même quand des rencontres ont échoué (le compteur `totalErreurs` n'est qu'affiché), donc le code de sortie du cron reste à 0. Le bouton web compense en cherchant aussi le mot « Échec » dans le texte capturé, ce qui est fragile (il suffit de reformuler le message). Le cron enchaîne aussi `app:process-positions-tirs`, qui selon le document maître dépend de Python et Tesseract, indisponibles sur l'hébergement mutualisé. Autre limite : un PDF qui échoue à chaque fois est retenté à chaque passage, sans compteur ni abandon.

Sur la protection humaine, une nuance : seule la source `manuel` est protégée en entier. Une stat issue de Stats Live garde sa source, mais l'OCR réécrit quand même ses minutes, tirs réussis et fautes, car le PDF fédéral fait foi sur ces chiffres. C'est un choix défendable, mais c'est un écrasement. Ce que je ferais : renvoyer `Command::FAILURE` dès qu'une rencontre échoue, compter les échecs par rencontre pour arrêter après trois, et vérifier la présence du cron par une ligne de log datée que je peux consulter.
