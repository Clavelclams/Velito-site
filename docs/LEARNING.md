# Mon journal d'apprentissage — Velito

> Ce fichier m'explique ce que je fais et pourquoi.
> Objectif : valider mon CDA en comprenant vraiment le code.

---

## C'est quoi un Monorepo ?

Un monorepo = un seul depot Git qui contient plusieurs projets.

**Sans monorepo** (ce qu'on evite) :
```
repo-vea/        <- projet separe
repo-hub/        <- projet separe
repo-vena/       <- projet separe
```
Probleme : si tu veux partager un bouton entre VEA et le hub, tu le copies-colles.
Quand tu le modifies, tu dois le changer dans 3 endroits.

**Avec monorepo** (ce qu'on fait) :
```
velito-site/
├── apps/vea/
├── apps/hub/
└── packages/ui/   <- bouton ecrit UNE fois, utilise partout
```

**Turborepo** est l'outil qui gere ce monorepo. Il sait dans quel ordre
construire les projets et met en cache les builds pour aller plus vite.

---

## C'est quoi Next.js ?

React = une bibliotheque pour creer des interfaces.
Next.js = React + plein de fonctionnalites en plus.

Ce que Next.js ajoute a React :
- **SSR (Server Side Rendering)** : la page est generee cote serveur
  -> meilleur SEO (Google peut lire le contenu)
  -> chargement plus rapide
- **App Router** : systeme de routing base sur les dossiers
  -> `app/page.tsx` = la page `/`
  -> `app/evenements/page.tsx` = la page `/evenements`
- **API Routes** : tu peux creer des endpoints API dans le meme projet

---

## C'est quoi l'App Router de Next.js ?

Dans `apps/vea/app/` chaque dossier = une route URL.
```
app/
├── page.tsx           -> velito.com/
├── evenements/
│   └── page.tsx       -> velito.com/evenements
├── equipe/
│   └── page.tsx       -> velito.com/equipe
└── layout.tsx         -> structure commune (navbar, footer)
```

`layout.tsx` est special : c'est le "cadre" qui entoure toutes les pages.
La navbar et le footer sont dans le layout — comme ca ils apparaissent
sur toutes les pages sans les reecrire.

---

## C'est quoi Tailwind CSS ?

Tailwind = des classes CSS predefinies qu'on met directement dans le HTML.

**Sans Tailwind** :
```css
/* fichier style.css */
.bouton {
  background-color: blue;
  padding: 8px 16px;
  border-radius: 4px;
}
```
```html
<button class="bouton">Cliquer</button>
```

**Avec Tailwind** :
```html
<button class="bg-blue-500 px-4 py-2 rounded">Cliquer</button>
```

On ecrit directement les styles dans le HTML. Plus besoin de fichier CSS separe.

---

## C'est quoi TypeScript ?

TypeScript = JavaScript + types.

Un "type" dit a TypeScript quel genre de valeur une variable peut contenir.

**Sans TypeScript (JavaScript)** :
```js
function saluer(nom) {
  return "Bonjour " + nom
}
saluer(42) // JavaScript accepte — mais c'est une erreur logique
```

**Avec TypeScript** :
```ts
function saluer(nom: string) {
  return "Bonjour " + nom
}
saluer(42) // Erreur detectee AVANT d'executer le code
```

TypeScript detecte les erreurs pendant que tu codes, pas quand ca plante
en production.

---

## Avancement du projet

| Date | Ce qu'on a fait | Ce que j'ai appris |
|------|----------------|-------------------|
| 19/03/2026 | Creation du monorepo Turborepo | Monorepo, Turborepo, Node.js, npm |
| 19/03/2026 | Push sur GitHub | git init, git add, git commit, git push |
| 19/03/2026 | Creation apps hub, vena, arena, interactive | cp de template, package.json name unique par workspace |
| 19/03/2026 | Docs CONTEXT.md + LEARNING.md + instructions/ | Documentation projet, gouvernance |
