---
titre: "PHP, les bases : variables, tableaux, foreach"
parcours: "php-symfony"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

PHP est le langage qui fait tourner tout Venaball côté serveur. Contrairement au JavaScript qui s'exécute dans le navigateur de la joueuse, PHP s'exécute sur TON serveur : il reçoit une requête, calcule, et renvoie une réponse. Une fois la réponse envoyée, tout est oublié — comme un serveur de restaurant qui prend une commande, l'apporte, puis passe à la table suivante sans se souvenir de rien.

**Les variables** commencent toujours par `$`. C'est LA différence visuelle avec JS : pas de `let` ni de `const`, le dollar suffit.

```php
$saison = '2026-2027';   // une chaîne de caractères
$xp = 150;               // un entier
$estActive = true;       // un booléen
```

Pour coller deux chaînes, PHP utilise le point `.` (et non le `+` de JS) :

```php
$prenom = 'Naomi';
echo 'Bonjour ' . $prenom; // affiche : Bonjour Naomi
```

**Les tableaux** sont la structure reine de PHP. Il en existe deux saveurs. Le tableau *indexé* ressemble à un array JS :

```php
$saisons = ['2026-2027', '2025-2026']; // indices 0, 1
echo $saisons[0]; // 2026-2027
```

Le tableau *associatif* joue le rôle de l'objet littéral `{}` de JS : chaque valeur a une clé nommée. Tu en as partout dans ton projet, par exemple les stats de `XpCalculator` :

```php
$stats = [
    'xp_total' => 0,          // clé => valeur (la flèche, pas les deux-points de JS)
    'streak_actuel' => 3,
];
echo $stats['streak_actuel']; // 3
```

**foreach** est la boucle que tu croiseras dix fois par fichier dans Venaball. Elle parcourt un tableau élément par élément :

```php
$roles = ['COACH', 'JOUEUR', 'PARENT'];
foreach ($roles as $role) {       // à chaque tour, $role prend la valeur suivante
    echo $role . "\n";
}
// Version associative : on récupère aussi la clé
foreach ($stats as $cle => $valeur) {
    echo $cle . ' = ' . $valeur;
}
```

Trois fonctions de tableau à connaître absolument, parce que ton propre code les utilise dans `User.php` :

```php
in_array('COACH', $roles);            // true si la valeur existe dans le tableau
array_filter($roles, fn($r) => $r !== 'PARENT'); // garde ce qui passe le test
array_unique($roles);                 // supprime les doublons
```

Dernier point crucial : les **comparaisons**. `==` compare en convertissant les types (`'5' == 5` est vrai !), `===` compare valeur ET type. Comme en JS, la règle d'or est d'utiliser `===` presque toujours — c'est ce que fait ton code, par exemple `$ucr->getRole() === $metaRole` dans `ClubVoter`. Même logique pour `in_array($role, $roles, true)` : le troisième argument `true` force la comparaison stricte.

Analogie pour retenir : un tableau associatif est un vestiaire de club — chaque casier a une étiquette (la clé) et un contenu (la valeur). `foreach` c'est le coach qui ouvre chaque casier l'un après l'autre.

## À retenir

- PHP s'exécute côté serveur, à chaque requête, puis oublie tout (contrairement au JS du navigateur qui reste vivant dans la page).
- Une variable PHP commence par `$` ; la concaténation se fait avec `.` et non `+`.
- Le tableau associatif `['cle' => 'valeur']` est l'équivalent de l'objet `{}` de JS ; `foreach ($tab as $cle => $valeur)` le parcourt.
- Toujours comparer avec `===` (strict) plutôt que `==` ; dans `in_array`, ajouter `true` en 3e argument pour la même raison.

## Mise en pratique

1. Ouvre `src/Service/SaisonService.php` dans ton projet Venaball.
2. Lis la méthode `getSaisonsDisponibles()` : repère la variable `$saisons = []`, la boucle `for`, et la concaténation `$a . '-' . ($a + 1)`.
3. Sur papier, exécute la boucle à la main en supposant que la saison courante est `2026-2027` : écris chaque valeur ajoutée au tableau, tour par tour.
4. Ouvre ensuite `src/Entity/Core/User.php`, méthode `setRolesMembre()` : explique à voix haute ce que font `in_array('employe', $roles, true)`, `array_filter` et `array_unique`, comme si tu le racontais au jury.

Résultat attendu : tu obtiens `['2026-2027', '2025-2026', '2024-2025', '2023-2024']` à l'étape 3, et tu sais expliquer pourquoi le `true` de `in_array` est là (comparaison stricte).
