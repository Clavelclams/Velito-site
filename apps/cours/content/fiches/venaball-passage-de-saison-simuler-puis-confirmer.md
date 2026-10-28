---
titre: "Le passage de saison : simuler d'abord, écrire ensuite, parce qu'on ne défait pas un été"
projet: "venaball"
bloc: 2
themes: ["metier", "base-de-donnees"]
source: "src/Controller/Manager/PassageSaisonController.php"
date: 2026-10-04
---

## Le concept

Chaque été, un club change de saison. Concrètement, dans Venaball, ça veut dire : recréer toutes les équipes pour 2026-2027, remettre chaque joueuse dans la bonne équipe (Léa, U13 l'an dernier, passe U15), reporter les surclassements, les coachs, les créneaux d'entraînement, les tarifs, puis archiver les équipes de l'an passé. Des centaines de lignes écrites d'un coup. C'est ce qu'on appelle une **opération massive** : beaucoup d'écritures, et surtout **difficile à défaire**, parce qu'il n'y a pas de bouton « annuler » sur 89 affectations.

La réponse du projet tient en une phrase, écrite dans `src/Command/PassageSaisonCommand.php` : « ELLE N'ÉCRIT RIEN SANS --apply. Le dry-run est le mode par défaut, et il doit le rester. » Un **dry-run** (« répétition à blanc ») exécute tout le raisonnement, produit le rapport complet, mais n'écrit rien en base. Dans le code, chaque écriture est gardée : `if ($apply) { $this->em->persist($nouvelle); }`. Sans l'option, on lit, on calcule, on affiche.

Le 30/09/2026 (commit `dccc05b`), cette commande est devenue une page web pour que la dirigeante n'ait plus besoin d'un développeur en SSH. Le point important est **comment** : la page ne réécrit pas la logique, elle **lance la même commande** en mémoire.

```php
// src/Controller/Manager/PassageSaisonController.php
$applique = $request->request->get('action') === 'appliquer'
    && $request->request->get('confirmation') === 'oui';

// Garde : seuls des ids de joueuses DE CE CLUB peuvent partir.
$idsClub = array_map(fn (Joueur $j) => $j->getId(), $joueuses);
$departs = array_values(array_intersect($departs, $idsClub));

$rapport = $this->lancerCommande($club, $from, $to, $departs, $applique);

// ... dans lancerCommande() :
$params = ['command' => 'app:passage-saison', '--to' => $to, '--from' => $from,
           '--club-id' => (string) $club->getId(), '--no-ansi' => true];
if ($apply) {
    $params['--apply'] = true;
}
$output = new BufferedOutput();
$application->run(new ArrayInput($params), $output);
return $output->fetch();
```

Le mécanisme, ligne par ligne :

- `BufferedOutput` capture le texte que la commande aurait affiché dans le terminal. Le rapport montré à l'écran est donc **mot pour mot** celui de la console : une seule logique, deux portes d'entrée.
- `--apply` n'est ajouté que si **deux** conditions sont vraies côté serveur : le bouton cliqué est « appliquer » **et** la case « J'ai lu la simulation, je confirme » est cochée. Le petit `onclick` JavaScript du template n'est qu'un confort : la vraie vérification est en PHP.
- `array_intersect` filtre les joueuses cochées « ne reprend pas » : un identifiant envoyé à la main qui n'appartient pas au club est simplement ignoré. C'est une protection contre l'**IDOR** (manipuler un identifiant pour agir sur les données d'un autre club).
- Avant tout cela, le contrôleur exige `ClubVoter::CLUB_ADMIN` (dirigeant uniquement) et vérifie un **jeton CSRF** (`isCsrfTokenValid('passage_saison', ...)`), qui prouve que le formulaire vient bien de la page et pas d'un site tiers.

Le parcours voulu est donc : cocher les départs, **Simuler**, lire le rapport (« à vérifier », « à traiter à la main »), puis cocher la confirmation et **Lancer**. La commande est aussi pensée pour être relancée sans doublons : équipes déjà créées retrouvées par leur nom, affectations vérifiées avant création, liens coach déjà présents ignorés, créneaux et tarifs non recopiés s'ils existent.

Sans ce principe : une erreur de règle (par exemple l'ancienne version qui envoyait toutes les joueuses dans l'équipe A) serait découverte **après** écriture, en septembre, par les coachs. Avec la simulation, elle se lit dans un rapport avant que quoi que ce soit ne bouge.

## Comment je l'explique au jury

« Le passage de saison réécrit des centaines de lignes et ne se défait pas facilement, donc la commande fonctionne en simulation par défaut et n'écrit qu'avec `--apply`. Pour que la dirigeante puisse le faire seule, j'ai créé une page qui lance cette même commande en mémoire et affiche son rapport tel quel : je n'ai pas dupliqué la logique, donc la page et la console ne peuvent pas diverger. L'écriture exige côté serveur le bouton "appliquer" et une case de confirmation, plus le rôle dirigeant et un jeton CSRF. Les joueuses cochées comme départs sont filtrées contre la liste du club, pour qu'on ne puisse pas désactiver la joueuse d'un autre club en trafiquant le formulaire. »

## La question vicieuse du jury

**« Et si le serveur plante au milieu du passage réel ? Vous avez une transaction ? »**

Non, et c'est la vraie limite de ce code. La commande fait cinq `flush()` successifs (équipes, joueuses, coachs, archivage, créneaux et tarifs) et je n'ai ni `beginTransaction()` ni `wrapInTransaction()` dans le fichier. Un **flush** envoie en base ce que Doctrine a préparé ; sans transaction englobante, chaque flush est définitif. Le scénario dangereux est précis : si ça casse après l'archivage des équipes sources mais avant la copie des créneaux, une relance trouve « Aucune équipe active en 2025-2026. Rien à reconduire. » et s'arrête. Les créneaux et les tarifs ne seront jamais recopiés automatiquement. La relance sans doublon me protège contre une partie des pannes, pas contre celle-là.

Deux autres points honnêtes. La page n'exige pas de sauvegarde avant l'écriture, alors que le projet a un script `bin/sauvegarde-bdd.sh`. Et le serveur ne vérifie pas qu'une simulation a vraiment été faite : la case « J'ai lu la simulation » est une déclaration, on peut la cocher et lancer directement. Enfin la simulation n'est pas parfaitement fidèle : en dry-run, la méthode `affecter()` sort tout de suite, donc la détection de doublons n'est jamais exercée (le bug du 19/08, une violation d'index unique au flush, n'aurait pas été visible en simulation).

Ce que je ferais : envelopper toute l'exécution dans `$em->wrapInTransaction(...)` (InnoDB sait annuler l'ensemble), déclencher la sauvegarde juste avant `--apply`, et lier la confirmation à la simulation en gardant en session une empreinte des paramètres simulés (saison, liste des départs) que le serveur compare au moment d'appliquer.
