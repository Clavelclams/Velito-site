---
titre: "Les notifications push : un service externe qui ne doit jamais casser le métier"
projet: "venaball"
bloc: 1
themes: ["integration-api", "resilience"]
source: "src/Service/ExpoPushService.php"
date: 2026-07-25
---

## Le concept

Quand un coach convoque une joueuse, le serveur envoie une notification push sur son téléphone. Venaball passe par l'**API d'Expo** plutôt que de parler directement à Apple (APNs) et Google (FCM) : deux protocoles, deux systèmes de certificats, deux fois les bugs — Expo fait le pont, et si un jour on veut s'en passer, **seul ce fichier change** (`src/Service/ExpoPushService.php`).

Le service encode trois règles de production, écrites en tête de classe comme non négociables :

```php
// 1. UN PUSH NE DOIT JAMAIS FAIRE ÉCHOUER L'ACTION MÉTIER.
} catch (\Throwable $e) {
    // RÈGLE 1 : on ne fait JAMAIS échouer l'action métier pour un push.
    $this->logger->error('Push : échec de l\'appel à Expo', [...]);
}

// 2. ON NETTOIE LES APPAREILS MORTS.
if ($motif === 'DeviceNotRegistered' && $jeton !== null) {
    $this->tokenRepo->supprimerToken($jeton);   // app désinstallée → jeton supprimé
}

// 3. ON ENVOIE PAR PAQUETS (TAILLE_LOT = 100).
foreach (array_chunk($jetons, self::TAILLE_LOT) as $lot) { ... }
```

En clair : si Expo est en panne, la convocation est quand même enregistrée (une notification ratée est un désagrément, une convocation perdue est un bug) ; quand Expo répond « DeviceNotRegistered », le jeton est purgé pour ne pas envoyer dans le vide indéfiniment ; et convoquer 12 joueuses fait 1 appel réseau, pas 12. Un `timeout` de 8 secondes protège en plus la requête du coach sur l'hébergement mutualisé OVH.

## Comment je l'explique au jury

Mon service de push illustre comment j'intègre une API externe sans mettre le métier en danger. Premier principe : la hiérarchie des criticités. L'enregistrement de la convocation est critique, la notification est un confort — donc tout l'appel à Expo est dans un try/catch qui logge et continue, jamais une panne d'Expo ne fera perdre une convocation. Deuxième principe : l'hygiène des données. Quand une joueuse désinstalle l'app, Expo me répond « DeviceNotRegistered » et je supprime son jeton immédiatement, sinon ma table grossit à l'infini et j'envoie dans le vide à chaque convocation. Troisième principe : l'efficacité réseau — l'API accepte 100 messages par requête, donc j'envoie par lots avec `array_chunk`, et j'ai posé un timeout de 8 secondes parce que je suis sur un mutualisé OVH et que c'est la requête HTTP du coach qui porte cet appel. Enfin, tout Expo est confiné dans cette seule classe : si je migre un jour vers FCM direct, le reste du code ne bouge pas.

## La question vicieuse du jury

**« Si le push échoue et que vous vous contentez de logger, la joueuse rate sa convocation et personne ne le sait. C'est acceptable ? »**

Oui, parce que le push n'est pas mon canal unique, c'est ma couche la plus rapide au-dessus de canaux durables. La convocation existe en base et reste visible dans l'espace web de la joueuse et dans l'app, avec les notifications in-app ; le mail de convocation (`ConvocationMailerService`) part en parallèle. Le push est un accélérateur, pas la source de vérité — c'est exactement pour ça qu'il a le droit d'échouer silencieusement côté utilisateur, mais pas silencieusement côté exploitation : chaque échec est loggé avec son motif, et je distingue trois cas dans le code — l'absence d'appareil enregistré (info, pas une erreur), le refus ciblé d'Expo (warning avec motif), et la panne complète (error). L'alternative — bloquer ou faire échouer la convocation tant que le push ne part pas — reviendrait à coupler la disponibilité de mon métier à celle d'un service tiers gratuit, ce qui serait une vraie faute d'architecture.
