---
titre: "C'est quoi un terminal ? (et pourquoi les devs l'adorent)"
parcours: "terminal"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

Tu tapes `npm run dev --workspace apps/cours` tous les jours. Mais où est-ce que tu le tapes, exactement ? Dans un **terminal**. Cette leçon démonte la boîte noire.

Imagine ton ordinateur comme un restaurant. D'habitude, tu utilises l'interface graphique (fenêtres, icônes, souris) : c'est comme commander en pointant les photos du menu. Le terminal, c'est parler directement au cuisinier : tu dis exactement ce que tu veux, avec des mots précis, et il exécute. C'est plus austère, mais infiniment plus puissant et plus rapide une fois qu'on connaît le vocabulaire.

Trois mots à distinguer, parce que le jury peut te le demander :

- **Le terminal** : la fenêtre noire elle-même. C'est juste un écran qui affiche du texte et récupère ce que tu tapes. Chez toi, c'est le panneau intégré de VS Code.
- **Le shell** : le programme qui tourne *dans* le terminal, qui lit tes commandes, les comprend et les exécute. Sur ton Windows, c'est **PowerShell**. Sur tes serveurs OVH ou Vercel (Linux), c'est **bash**. Même idée, dialectes différents — comme le français et l'espagnol.
- **Le prompt** : la ligne qui t'invite à taper, par exemple `PS C:\Users\Velito Adventure>`. Le `PS` te dit que c'est PowerShell, et le chemin te dit *où* tu es. Le prompt, c'est le shell qui te dit « je t'écoute ».

Pourquoi les devs utilisent le terminal alors que la souris existe ? Trois raisons. D'abord, **tous les outils de dev sont des programmes en ligne de commande** : `npm`, `composer`, `git`, `php` n'ont pas de bouton, ils n'existent qu'en texte. Ensuite, c'est **reproductible** : une commande peut se copier, se documenter, s'automatiser (c'est exactement ce que fait Vercel quand il lance `npm run build` à ta place). Enfin, c'est **universel** : les mêmes commandes marchent sur ta machine et sur un serveur à l'autre bout du monde.

Ouvrir le terminal dans VS Code : menu `Terminal > Nouveau terminal`, ou le raccourci `Ctrl+ù` (sur clavier AZERTY). Une fois ouvert, teste :

```powershell
# Affiche du texte à l'écran (le "Hello world" du terminal)
echo "Bonjour Clavel"

# Demande au shell qui il est et sa version
$PSVersionTable.PSVersion

# Vérifie que tes outils sont bien installés (ils répondent leur version)
node --version
npm --version
git --version
php --version
```

Sur Linux/mac (bash), `echo` existe aussi, mais la version du shell se lit avec `bash --version`.

Quand tu tapes `npm --version`, il se passe quoi ? Le shell prend le premier mot (`npm`), cherche un programme qui porte ce nom sur ton disque, le lance, et lui transmet le reste (`--version`) comme **argument**. Le programme fait son travail, affiche son résultat, et rend la main : le prompt réapparaît. C'est ça, le cycle de vie de chaque commande que tu tapes depuis des mois. Rien de magique : un mot = un programme, le reste = des instructions pour ce programme.

Dernier réflexe à prendre dès aujourd'hui : si une commande affiche une erreur, **lis le message**. Il dit presque toujours quoi faire.

## À retenir

- Le **terminal** est la fenêtre, le **shell** est le programme qui interprète les commandes, le **prompt** est la ligne d'invite qui indique où tu es.
- Sur Windows j'utilise **PowerShell**, sur mes serveurs Linux (OVH, Vercel) c'est **bash** : mêmes concepts, syntaxe parfois différente.
- Une commande = un nom de programme + des arguments ; le shell trouve le programme, le lance et affiche son résultat.
- Les devs utilisent le terminal parce que les outils (npm, git, composer) n'existent qu'en ligne de commande, et que le texte est reproductible et automatisable.

## Mise en pratique

Objectif : ouvrir un terminal dans ton vrai projet et identifier chaque élément. Aucun risque : on ne fait que lire.

1. Ouvre VS Code, puis `Fichier > Ouvrir le dossier` et choisis `C:\Users\Velito Adventure\Documents\Velito-site\`.
2. Ouvre le terminal intégré avec `Ctrl+ù` (ou menu `Terminal > Nouveau terminal`).
3. Observe le prompt : tu dois voir `PS C:\Users\Velito Adventure\Documents\Velito-site>`. Note ce que signifie chaque partie (PS = PowerShell, le chemin = ta position).
4. Tape `echo "Je comprends enfin ce que je tape"` et valide avec Entrée.
5. Tape `node --version`, puis `npm --version`, puis `git --version`. Note les trois numéros de version quelque part.
6. Tape `nimporte-quoi` (littéralement) et lis calmement le message d'erreur : PowerShell te dit qu'il ne *reconnaît pas ce terme comme nom d'applet de commande*. C'est le shell qui n'a pas trouvé de programme portant ce nom.

Résultat attendu : trois numéros de version affichés (par exemple `v20.x.x` pour Node), et une erreur volontaire que tu sais maintenant expliquer avec tes mots : « le shell a cherché un programme nommé comme ça, il n'existe pas ».
