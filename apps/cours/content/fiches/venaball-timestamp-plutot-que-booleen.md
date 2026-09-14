---
titre: "valide_at plutôt que is_valide : un booléen oublie, une date se souvient"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "modelisation"]
source: "src/Entity/Core/Club.php, migration 20260909120000"
date: 2026-09-09
---

## Le concept

Un club qui s'inscrit sur Venaball doit être validé par un super-admin avant d'apparaître dans la liste publique. Le réflexe est un booléen : `is_valide TINYINT(1)`. La migration du 9 septembre fait autre chose :

```php
private ?\DateTimeImmutable $valideAt = null;
private ?User $validePar = null;

public function isValide(): bool { return $this->valideAt !== null; }
```

Deux colonnes nullables, et le booléen est **dérivé** : un club est valide si `valide_at` n'est pas `NULL`.

Ce qu'on gagne, pour zéro complexité supplémentaire :

**Le quand.** Un booléen répond à « est-ce validé ? ». Une date répond aussi à « depuis quand ? ». Pour un support (« mon club n'apparaît pas »), un reporting (« combien de clubs validés ce mois »), ou une règle métier future (« les clubs validés depuis plus de 30 jours »), l'information est déjà là. Un booléen l'a jetée au moment de l'écriture.

**Le qui.** `valide_par_id` pointe vers l'utilisateur qui a cliqué. Le jour où un club « n'aurait pas dû » être validé, on sait qui, et quand. C'est de l'audit sans table d'audit.

**L'idempotence gratuite.** La méthode :

```php
public function valider(?User $par): static
{
    if ($this->valideAt === null) {
        $this->valideAt = new \DateTimeImmutable();
        $this->validePar = $par;
    }
    return $this;
}
```

Revalider un club déjà validé ne change rien — ni la date d'origine, ni l'auteur. Un double clic, un script relancé, une commande rejouée : même résultat. Avec un booléen, on n'aurait rien perdu non plus, mais on n'aurait rien eu à préserver ; ici, l'idempotence protège une information qui a de la valeur.

Le commentaire de l'entité pose aussi la frontière avec l'autre drapeau : *« `isActive` coupe l'accès, `valideAt` ne fait que retarder l'exposition. »* Deux concepts, deux colonnes. Un club non validé peut être utilisé par son créateur (il configure, il ajoute ses équipes), il n'est juste pas encore listé. Un club désactivé, lui, est fermé. Fusionner les deux dans un seul état aurait obligé à choisir entre les deux comportements.

## Comment je l'explique au jury

« Pour la validation d'un club, j'ai mis une date et un auteur nullables plutôt qu'un booléen. `isValide()` dérive du fait que la date est renseignée. Ça me donne gratuitement le quand et le qui — utile pour le support, le reporting et l'audit — là où un booléen aurait jeté cette information au moment de l'écriture. La méthode `valider()` est idempotente : revalider ne touche pas à la date d'origine. Et je distingue validation et activation : `isActive` coupe l'accès, `valideAt` retarde seulement l'exposition publique. Ce sont deux états orthogonaux, je ne les ai pas fusionnés. »

## La question vicieuse du jury

**« Et l'invalidation ? Si vous remettez `valide_at` à NULL, vous perdez le qui et le quand que vous vantez. »**

Exact, et c'est la limite du motif : un timestamp nullable enregistre **un** événement, pas un historique. Il est parfait pour une transition à sens unique — validé une fois, validé pour toujours — et c'est le cas ici : un club qui pose problème est **désactivé** (`isActive = false`), il n'est pas « dévalidé ». Si un jour le métier exige de retirer une validation en gardant la trace, ce motif ne suffit plus, et il faut une table d'événements : `club_validation(club_id, action, par, at)` en append-only, comme les consentements RGPD sur ARENA. Le choix entre les deux dépend d'une question simple : combien de fois cet état peut-il changer ? Une fois → date nullable. Plusieurs fois, avec besoin d'historique → journal. J'ai pris le plus simple qui couvre le besoin réel, en sachant lequel le remplacerait.
