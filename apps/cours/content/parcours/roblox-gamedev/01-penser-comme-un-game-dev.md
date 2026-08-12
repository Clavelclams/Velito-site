---
titre: "Penser comme un game dev : périmètre, phases jouables, fini vaut mieux que parfait"
parcours: "roblox-gamedev"
ordre: 1
niveau: "intermediaire"
duree: 25
date: 2026-08-11
---

## Le cours

Tu sais déjà coder en Luau. Ce parcours t'apprend autre chose : **finir un jeu**. Et ça, c'est un problème de méthode avant d'être un problème de code.

### Pourquoi 95 % des jeux Roblox ne sortent jamais

Le schéma classique : quelqu'un ouvre Studio, passe trois week-ends à construire une map magnifique, ajoute un système d'inventaire, commence une boutique... et abandonne. Le projet n'est jamais jouable, donc jamais motivant, donc mort. Le problème n'est pas le talent, c'est l'absence de **périmètre**.

Ta roadmap Prop Hunt commence par un **contrat de périmètre** : un tableau de ce que la v1 contient, une liste de ce qu'elle ne contient PAS, et une définition de « fini » (« trois personnes jouent deux manches, comprennent sans explication, rigolent au moins une fois »). Ce contrat, tu le connais déjà sous un autre nom : c'est un **cahier des charges avec un MVP**. En CDA, tu appelles ça « concevoir une application en réponse à un besoin » — savoir dire « ça, c'est hors périmètre v1 » est exactement la compétence qu'un jury attend d'un concepteur. Un client qui demande « juste un petit ajout » en plein sprint, c'est le même phénomène que toi qui veux ajouter des skins en phase 2. La réponse est la même : **ça va dans le backlog** (ta liste « Idées v2 »), pas dans le code.

### La règle des phases jouables

Ta roadmap découpe le projet en phases avec une règle absolue : **chaque phase produit un truc jouable avant de passer à la suivante**. C'est du développement incrémental, comme des sprints qui livrent chacun un produit fonctionnel. Regarde comment la boucle de jeu de la phase 3 est écrite :

```lua
-- ÉTAT 2 : PLANQUE
_G.repartirEquipes()
-- TODO phase 4 : transformer les cachés en props
-- TODO phase 5 : bloquer les chercheurs
compteARebours(Config.DUREE_PLANQUE, "PLANQUE", "Cachez-vous !")
```

Ces `TODO` sont volontaires : la boucle tourne **à vide dès maintenant**, et chaque phase remplit un trou. À chaque étape tu peux tester, donc localiser un bug immédiatement. Compare avec l'alternative : tout écrire d'un coup, lancer, et chercher pourquoi rien ne marche parmi 400 lignes. C'est le même réflexe que commiter petit et souvent plutôt qu'un commit géant en fin de semaine.

### Fini vaut mieux que parfait

Le piège mortel est identifié noir sur blanc dans ta roadmap, phase 1 : « C'est LA phase où le projet meurt. » L'envie de rendre le gymnase beau — textures, lumières, gradins — est une fuite déguisée en travail. Un gymnase gris moche mais jouable te fait avancer ; un gymnase magnifique sans logique de jeu, c'est trois week-ends brûlés. D'où la limite dure : **2 sessions maximum sur la map**, l'esthétique attend la phase 9.

Un prop hunt basique **publié** t'apprend dix fois plus qu'un chef-d'œuvre à 40 % : tu traverses la publication, les retours de vrais joueurs, les correctifs. C'est le cycle complet d'un produit. Aucun tutoriel ne remplace ça.

### Ton outillage anti-abandon

Trois outils, tous dans la roadmap :

1. **Le post-it « Idées v2 »** : toute nouvelle idée y va, sans exception. Tu ne discutes pas avec toi-même, tu notes et tu retournes à la phase en cours.
2. **Le journal de bord** : date, phase, fait, bloqué sur, prochaine étape. Quand tu reviens après deux semaines, tu sais exactement où reprendre. C'est ta documentation projet — encore une habitude CDA.
3. **Le test de validation** de chaque phase : un critère binaire, observable, qui dit « c'est bon, passe à la suite ». L'équivalent d'un critère d'acceptation.

La roadmap complète est sur ton site : [/projets/prop-hunt](/projets/prop-hunt). Lis-la en entier une fois avant de commencer — pas pour tout retenir, mais pour voir où tu vas.

## À retenir

- Un contrat de périmètre = un cahier des charges MVP : ce que la v1 contient, ce qu'elle ne contient pas, et une définition binaire de « fini ».
- Chaque phase doit produire quelque chose de **jouable** — les `TODO` dans le code sont des trous volontaires qu'on remplit phase par phase, en testant à chaque fois.
- Toute idée en cours de route va dans « Idées v2 », jamais dans le code. C'est ton backlog.
- La map moche est une décision, pas un défaut : 2 sessions max, l'esthétique arrive en phase 9.
- Fini vaut mieux que parfait : un jeu basique publié t'apprend plus qu'un chef-d'œuvre inachevé.

## Mise en pratique

**Fais la phase 0 de ta roadmap Prop Hunt** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 0 — Préparation) :

1. Studio → template **Baseplate** → `File` → `Save to File As` → `PropHunt.rbxl`.
2. `View` → active **Explorer**, **Properties**, **Output** (les trois, toujours ouverts). `Game Settings` → `Security` → active **Enable Studio Access to API Services**.
3. Crée l'arborescence de la roadmap : `ServerScriptService/Serveur` (Folder), `ReplicatedStorage/Remotes`, `Modules`, `Props` (Folders), `StarterPlayer/StarterPlayerScripts/Client` (Folder).
4. Refais ton script piège (plateforme rouge qui inflige des dégâts avec debounce), puis **casse-le exprès** : change les dégâts, enlève le debounce, mets `Anchored = false`. Observe chaque casse dans l'Output.
5. Relis le contrat de périmètre de la roadmap et recopie la liste « La v1 NE contient PAS » sur un vrai post-it, collé sur ton écran.

**Résultat attendu** : projet structuré, post-it en place, et tu sais provoquer et lire une erreur dans l'Output.

**Test de validation (celui de la roadmap)** : tu ouvres Studio, tu appuies sur Play, tu marches sur ta plateforme rouge, tu perds de la vie. L'Output affiche tes `print`. Et rappel du piège : ne construis **jamais** en mode Play — tout est effacé au Stop.
