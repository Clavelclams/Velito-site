---
titre: "La 4G du gymnase : rendre une écriture idempotente"
projet: "venaball"
bloc: 3
themes: ["api", "mobile", "base-de-donnees"]
source: "ApiClubSaisieController.php, ActionMatch.php, migration 20260909180000"
date: 2026-09-09
---

## Le concept

L'app Venaball Club saisit les stats au bord du terrain. Le réseau d'un gymnase est ce qu'il est : le téléphone envoie une action, le serveur l'enregistre, **la réponse se perd**. L'app ne sait pas si c'est passé, sa file hors-ligne renvoie. Le serveur reçoit une seconde requête identique, crée une seconde action. Un panier compté deux fois, et des stats fausses que personne ne remarque.

Ce n'est pas un bug d'implémentation, c'est une propriété des réseaux : **une requête peut être reçue sans que sa réponse arrive**. Un client ne peut pas distinguer « le serveur n'a rien reçu » de « le serveur a tout fait mais je n'ai pas eu la confirmation ». La seule stratégie sûre côté client est de renvoyer. Donc le serveur doit savoir reconnaître un renvoi.

**La clé d'idempotence.** L'app génère un identifiant court *avant* l'envoi, et l'attache à l'action :

```php
#[ORM\Column(length: 40, nullable: true, unique: true)]
private ?string $clientUid = null;
```

Côté contrôleur, avant toute création :

```php
$existante = $this->actionMatchRepository->findOneBy(['clientUid' => $clientUid]);
if ($existante !== null) {
    return new JsonResponse([
        'actionId' => $existante->getId(),
        /* … */
        'deja'     => true,
    ]);
}
```

Le renvoi reçoit **la même réponse que l'original** aurait eue — avec un drapeau `deja` pour que l'app sache que c'était un doublon. Rien n'est créé. Envoyer une fois ou dix fois produit le même état : c'est la définition de l'idempotence.

Deux détails de schéma. La colonne est **nullable** : l'interface web n'envoie pas de clé, seul le mobile en a besoin. Et l'index est **UNIQUE** — MySQL comme MariaDB acceptent plusieurs `NULL` dans un index unique, donc les lignes web ne se gênent pas. L'unicité est la ceinture de sécurité : si le code oublie la vérification, la base refuse le doublon au lieu de l'accepter.

**La seconde idée est plus subtile : les valeurs absolues.** Le score adverse pouvait s'envoyer sous forme de *delta* (« +2 »). Un delta renvoyé deux fois compte double, et une clé d'idempotence ne règle rien ici, parce que deux « +2 » successifs sont deux actions légitimes. La solution est de changer ce qu'on envoie : le score adverse **absolu** (« 34 »). Renvoyé deux fois, il donne le même résultat. **Une valeur absolue est idempotente par nature ; un delta ne l'est jamais.**

## Comment je l'explique au jury

« La saisie de stats se fait au bord du terrain, en 4G de gymnase. Quand la réponse du serveur se perd, l'app renvoie, et le serveur créait un doublon. J'ai ajouté une clé d'idempotence : l'app génère un identifiant avant l'envoi, le serveur le stocke avec un index unique, et un renvoi reçoit la réponse de l'original sans rien créer. L'index unique est la garantie de dernier recours : même si le code rate la vérification, la base refuse. Pour le score adverse, la clé ne suffisait pas parce qu'un delta renvoyé est indiscernable d'un vrai second delta. J'ai donc changé la forme de la donnée : l'app envoie le score absolu, qui est idempotent par construction. »

## La question vicieuse du jury

**« Votre `findOneBy` puis `persist`, ce n'est pas atomique. Deux renvois qui arrivent en même temps passent tous les deux la vérification. »**

Exact — et c'est pour ça que l'index unique n'est pas optionnel. Si deux requêtes portant le même `client_uid` arrivent dans la même fenêtre, toutes deux voient « rien en base », toutes deux tentent d'insérer, et la **seconde échoue** sur la contrainte d'unicité. Ce que je n'ai pas encore fait, et qu'il faudrait : attraper cette `UniqueConstraintViolationException` et la traiter comme le cas « déjà là » — relire l'action existante et renvoyer la réponse normale — au lieu de laisser remonter un 500. Aujourd'hui, ce cas produit une erreur côté app, qui renverra une troisième fois, et cette fois trouvera l'action. Le résultat final est juste, mais le chemin est laid. La version propre serait un `INSERT … ON DUPLICATE KEY` ou une transaction avec relecture sur échec ; j'ai choisi la vérification applicative parce qu'elle couvre 99 % des cas — le renvoi arrive typiquement plusieurs secondes après l'original — et que la contrainte garantit le 1 % restant. C'est le même raisonnement qu'ailleurs dans mes projets : le code fait le cas normal, la base garantit l'invariant.
