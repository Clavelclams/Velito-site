---
titre: "Naviguer dans les dossiers : pwd, cd, ls et la tab-complétion"
parcours: "terminal"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Un terminal, c'est comme un explorateur de fichiers sans images : à tout moment, tu es **quelque part** dans l'arborescence de ton disque. Cette position s'appelle le **répertoire courant** (ou « dossier de travail »). Quand tu lances `npm run dev` et que ça échoue avec « no package.json found », c'est presque toujours parce que tu n'étais pas au bon endroit. Savoir naviguer, c'est la moitié des bugs de terminal résolus.

Trois commandes forment le GPS du terminal :

```powershell
# "Print Working Directory" : où suis-je ?
pwd
# En PowerShell, pwd est un alias de Get-Location. Sur bash (Linux/mac), pwd existe tel quel.

# "Change Directory" : je me déplace
cd "C:\Users\Velito Adventure\Documents\Velito-site"
# Les guillemets sont OBLIGATOIRES ici car "Velito Adventure" contient un espace.
# Sans guillemets, le shell croirait que "Adventure\..." est un 2e argument.

# Lister le contenu du dossier courant
ls
# En PowerShell, ls est un alias de Get-ChildItem (comme dir). Sur bash, ls est la vraie commande.
```

Maintenant, la notion clé : **chemin absolu vs chemin relatif**. Un chemin absolu, c'est une adresse postale complète : `C:\Users\Velito Adventure\Documents\mabb-site\` fonctionne d'où que tu sois, comme « 12 rue des Jacobins, Amiens ». Un chemin relatif, c'est une indication depuis ta position : « la deuxième porte à gauche ». Si tu es dans `Velito-site`, alors `apps\cours` désigne le sous-dossier `apps\cours` *depuis là*. C'est exactement ce qui se passe dans `npm run dev --workspace apps/cours` : `apps/cours` est un chemin relatif à la racine du monorepo — d'où l'importance de lancer la commande depuis la racine.

Deux raccourcis de chemin relatif à connaître par cœur : `.` désigne le dossier courant (tu le retrouveras dans `git add .` et `code .`), et `..` désigne le dossier parent. Donc `cd ..` remonte d'un cran, `cd ..\..` remonte de deux. Sur Windows, le séparateur est `\`, sur Linux c'est `/` — mais bonne nouvelle, PowerShell accepte aussi `/`, ce qui explique pourquoi `apps/cours` marche chez toi.

Le superpouvoir qui va changer ta vie : la **tab-complétion**. Tape le début d'un nom puis appuie sur `Tab` : le shell complète tout seul. Tape `cd Doc` puis `Tab` → `cd .\Documents\`. Appuie encore sur `Tab` pour faire défiler les autres possibilités. Avantages : zéro faute de frappe, guillemets ajoutés automatiquement autour de « Velito Adventure », et vitesse de pro. À partir d'aujourd'hui, interdiction de taper un chemin en entier à la main.

Enfin, quelques options utiles de `ls` :

```powershell
# Lister un autre dossier sans s'y déplacer
ls "C:\Users\Velito Adventure\Documents"

# Voir aussi les fichiers cachés (comme le dossier .git !)
ls -Force
# Équivalent bash : ls -a
```

Le dossier `.git` que tu verras apparaître avec `-Force`, c'est là que Git range tout son historique. On y reviendra à la leçon 8.

## À retenir

- Le terminal a toujours une position : le **répertoire courant**, affiché par `pwd` et visible dans le prompt.
- **Chemin absolu** = adresse complète depuis `C:\` (marche partout) ; **chemin relatif** = depuis ma position (`.` = ici, `..` = parent).
- `ls` et `pwd` sont des alias PowerShell de `Get-ChildItem` et `Get-Location` ; sur mes serveurs Linux, ce sont les vraies commandes bash.
- Un chemin qui contient un espace (comme `Velito Adventure`) doit être entouré de guillemets.
- La touche `Tab` complète les noms de fichiers et dossiers : plus rapide et zéro faute de frappe.

## Mise en pratique

Objectif : naviguer entre tes trois projets uniquement au clavier. Aucun risque : on ne fait que se déplacer et lire.

1. Ouvre un terminal VS Code (`Ctrl+ù`) et tape `cd ~` pour aller dans ton dossier personnel (`C:\Users\Velito Adventure`). Vérifie avec `pwd`.
2. Tape `cd Doc` puis appuie sur `Tab` : le shell complète en `.\Documents\`. Valide avec Entrée.
3. Tape `ls` et repère tes trois projets : `Velito-site`, `mabb-site` et `Pirb store`.
4. Tape `cd Vel` puis `Tab`, valide. Confirme avec `pwd` que tu es dans `C:\Users\Velito Adventure\Documents\Velito-site`.
5. Tape `ls` et repère le dossier `apps`, puis `ls apps` pour voir le contenu (dont `cours`) **sans te déplacer** : tu viens d'utiliser un chemin relatif.
6. Va dans `apps\cours` avec `cd apps\cours` (utilise Tab !), vérifie avec `pwd`, puis remonte à la racine du monorepo avec `cd ..\..`.
7. Depuis là, saute directement au projet Symfony avec un chemin absolu : `cd "C:\Users\Velito Adventure\Documents\mabb-site"` (guillemets obligatoires — laisse Tab les mettre pour toi).
8. Bonus : tape `cd "C:\Users\Velito Adventure\Documents\Pirb store"` en tapant seulement `cd ..\Pir` + `Tab`.

Résultat attendu : tu as visité tes trois projets sans cliquer une seule fois, `pwd` a confirmé chaque position, et tu sais expliquer pourquoi l'étape 5 utilisait un chemin relatif et l'étape 7 un chemin absolu.
