---
titre: "La base comme dernier rempart : un index unique qui préfère une erreur 500 à des données fausses"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "modelisation"]
source: "src/Repository/Sport/JoueurEquipeRepository.php"
date: 2026-10-04
---

## Le concept

Dans Venaball, une joueuse peut jouer dans plusieurs équipes la même saison : son équipe **principale**, et éventuellement un **surclassement** (Léa, U15, joue aussi en U18). Ce lien est une table à part, `joueur_equipe`, décrite par l'entité `src/Entity/Sport/JoueurEquipe.php` : une ligne = une joueuse, une équipe, une saison, un type (principale, surclassement, doublage, réserve) et un drapeau `actif`.

Une règle évidente s'applique : on ne peut pas être **deux fois** dans la même équipe la même saison. Cette règle est écrite à deux niveaux. Dans l'entité :

```php
#[ORM\UniqueConstraint(
    name: 'uniq_joueur_equipe_saison',
    columns: ['joueur_id', 'equipe_id', 'saison']
)]
```

Et dans la migration qui a créé la table (`migrations/Version20260615234500.php`) : `UNIQUE INDEX uniq_joueur_equipe_saison (joueur_id, equipe_id, saison)`. Un **index unique** est une règle que MySQL vérifie lui-même à chaque écriture : si une deuxième ligne avec le même trio arrive, la base **refuse** l'insertion, quel que soit le code qui l'a envoyée.

**Le bug du 03/10/2026 (commit `a3aa33e`).** Pour changer l'équipe principale d'une joueuse, le composeur d'effectif et la fiche joueuse « déplaçaient » la ligne principale en changeant son équipe. Mais une ligne (Léa, U15 B, 2026-2027) pouvait déjà exister, désactivée lors d'une recomposition, ou en surclassement. Déplacer la principale vers U15 B créait donc un doublon du trio : MySQL refusait, et l'utilisateur voyait une erreur 500 sur « Enregistrer l'effectif ». La correction ajoute une méthode dans `src/Repository/Sport/JoueurEquipeRepository.php` :

```php
public function rattacherPrincipale(Joueur $joueur, Equipe $equipe, string $saison): JoueurEquipe
{
    $em = $this->getEntityManager();
    $cible = null;
    foreach ($this->findBy(['joueur' => $joueur, 'saison' => $saison]) as $je) {
        if ($je->getEquipe()?->getId() === $equipe->getId()) {
            $cible = $je;
        } elseif ($je->getType() === JoueurEquipe::TYPE_PRINCIPALE && $je->isActif()) {
            $je->setActif(false); // une seule principale active par saison
        }
    }
    if ($cible === null) {
        $cible = (new JoueurEquipe())->setJoueur($joueur)->setEquipe($equipe)->setSaison($saison);
        $em->persist($cible);
    }
    $cible->setType(JoueurEquipe::TYPE_PRINCIPALE)->setActif(true);
    return $cible;
}
```

Le mécanisme : on parcourt toutes les lignes de la joueuse pour la saison. S'il existe déjà une ligne pour l'équipe visée, on la **réutilise** au lieu d'en créer une. Toute autre principale active est désactivée. On ne crée une ligne neuve que si rien n'existe. Résultat : le trio ne peut plus être dupliqué par ce chemin, et les deux contrôleurs appellent maintenant cette seule méthode.

**Pourquoi l'index unique est précieux, même s'il a « causé » le 500.** Sans lui, le code fautif aurait inséré le doublon en silence. Léa aurait pu apparaître deux fois dans l'effectif de U15 B, toute requête qui joint `joueur_equipe` risquait de la compter deux fois, et personne n'aurait vu d'erreur. La base a transformé une **corruption silencieuse** en **erreur bruyante**. Une erreur bruyante se corrige le jour même ; une donnée fausse se découvre des mois plus tard.

**La même nuit, une autre leçon (commit `2fa7cbc`).** Un champ `codeEmarque` (avec `getCodeEmarque()`) avait été ajouté à `Rencontre`, alors que `codeEMarque` et `getCodeEMarque()` existaient déjà depuis l'import FFBB. En PHP, les **noms de propriétés** distinguent majuscules et minuscules, mais les **noms de méthodes ne les distinguent pas** : `getCodeEmarque` et `getCodeEMarque` sont la même méthode déclarée deux fois. PHP refuse de charger la classe, et comme `Rencontre` est utilisée presque partout, tout le site tombait en 500. La correction a supprimé le doublon (et sa migration) pour réutiliser le champ existant. La règle qui en est sortie est écrite dans le `CLAUDE.md` du projet : avant d'ajouter un champ, une méthode ou une route, chercher le nom sans tenir compte de la casse (`grep -ri`) dans `src/`, `templates/` et `migrations/`.

## Comment je l'explique au jury

« La table `joueur_equipe` a un index unique sur joueuse, équipe et saison, déclaré dans l'entité et créé par la migration. Le 3 octobre, le composeur d'effectif déplaçait l'affectation principale vers une équipe où la joueuse avait déjà une ligne, et MySQL a refusé le doublon. J'ai écrit `rattacherPrincipale()` dans le repository : elle réutilise la ligne existante au lieu d'en créer une, et désactive l'ancienne principale. Je considère que l'index a fait son travail : sans lui, j'aurais eu des joueuses en double dans les effectifs, sans aucune alerte. La même nuit, j'ai appris que PHP ne distingue pas la casse des noms de méthodes, et depuis je cherche toujours un nom avec `grep -ri` avant de l'ajouter. »

## La question vicieuse du jury

**« Votre règle métier, c'est "exactement une principale active par saison". Est-ce que la base la garantit ? »**

Non. L'index unique garantit seulement « pas deux fois le même trio joueuse, équipe, saison ». La règle « une seule principale active » n'est garantie que par le code, dans `rattacherPrincipale()`. Si un autre chemin écrit directement dans la table, rien ne l'empêche d'avoir deux principales actives dans deux équipes différentes. MySQL ne propose pas d'index unique partiel (« unique seulement quand type = principale et actif = 1 ») ; la façon de faire serait une **colonne générée** qui vaut `joueur_id + saison` quand la ligne est une principale active et `NULL` sinon, avec un index unique dessus (plusieurs `NULL` sont autorisés dans un index unique). Je ne l'ai pas fait, c'est une migration à écrire et à tester sur les deux instances.

Deux effets de bord à connaître aussi. Si la ligne réutilisée était un surclassement, `setType(TYPE_PRINCIPALE)` la transforme en principale : le surclassement disparaît sans message. Et le composeur, qui avant refusait de « transférer en silence » une joueuse déjà principale ailleurs, la transfère maintenant (l'ancienne principale est désactivée). C'est probablement ce que veut le club, mais c'est un changement de comportement que je n'ai pas annoncé. Enfin, le doublon refusé par la base remonte encore en 500 : idéalement, j'attraperais `UniqueConstraintViolationException` pour afficher un message clair au lieu d'une page d'erreur.
