---
titre: "React Native vs web : View, Text, Pressable et StyleSheet"
parcours: "typescript-react-native"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Tu connais React côté web : ton site de cours affiche des `<div>`, des `<button>`, stylés avec des classes Tailwind. Pirb, c'est le même React — composants, props, état — mais le résultat n'est pas une page HTML : c'est une app **native**. React Native traduit tes composants en vrais éléments d'interface iOS et Android. Il n'y a ni navigateur, ni DOM, ni CSS sur le téléphone.

Conséquence directe : les balises HTML n'existent pas. React Native fournit ses propres briques, importées depuis `'react-native'` :

| Web (ton site) | React Native (Pirb) | Rôle |
|---|---|---|
| `<div>` | `<View>` | conteneur de mise en page |
| `<p>`, `<span>` | `<Text>` | TOUT texte, obligatoirement |
| `<button>` | `<Pressable>` | zone tactile |
| `<img>` | `<Image>` | image |
| scroll natif de la page | `<ScrollView>` / `<FlatList>` | défilement explicite |

Deux pièges classiques : du texte nu hors d'un `<Text>` fait planter l'app (sur le web, un texte dans une `<div>` passe) ; et rien ne défile par défaut — le scroll se demande explicitement.

Compare deux boutons réels de tes deux projets. Sur ton site, `apps/cours/app/components/BoutonLeconFaite.tsx` :

```tsx
<button onClick={valider} className="rounded-xl bg-cours-accent px-6 py-3 ...">
  J'ai fait la mise en pratique
</button>
```

Dans Pirb, `src/components/EcranCrash.tsx` :

```tsx
<Pressable
  style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
  onPress={() => { retry().catch(() => {}); }}
  accessibilityRole="button"
>
  <Ionicons name="refresh" size={18} color={colors.background} />
  <Text style={styles.ctaTexte}>Réessayer</Text>
</Pressable>
```

Trois différences à savoir commenter. `onClick` devient `onPress` : un doigt, pas une souris. Le texte du bouton vit dans un `<Text>` imbriqué. Et `style` peut recevoir une **fonction** : `({ pressed }) => [...]` — l'équivalent du `:hover`/`:active` CSS, en JavaScript, puisqu'il n'y a pas de CSS.

Côté styles justement : pas de Tailwind ici. React Native utilise `StyleSheet.create`, des objets JavaScript aux propriétés inspirées du CSS mais en camelCase et sans unités (des nombres = des points logiques, indépendants de la densité d'écran) :

```ts
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  contenu: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
});
```

Bonne nouvelle : tout est **flexbox par défaut** — tes acquis CSS servent directement. Nuances : `flexDirection` vaut `column` par défaut (le web dit `row`), et `flex: 1` signifie « occupe tout l'espace disponible ». Remarque aussi que Pirb ne code jamais les couleurs en dur : `colors`, `spacing`, `fonts` viennent de `src/theme/tokens.ts` — le même rôle que ta config Tailwind sur le site : un seul endroit pour la cohérence visuelle.

Et TypeScript dans tout ça ? Il type aussi l'interface. Dans `src/components/EcranCrash.tsx`, les props sont déclarées comme n'importe quel objet :

```tsx
export function EcranCrash({ error, retry }: { error: Error; retry: () => Promise<void> }) {
```

Impossible d'utiliser `<EcranCrash />` sans lui passer une erreur et une fonction de retry : le composant documente et verrouille son usage. Retiens la synthèse pour le jury : **la logique React est identique web/mobile ; ce qui change, c'est la cible de rendu** — DOM + CSS d'un côté, composants natifs + StyleSheet de l'autre.

## À retenir

- React Native = le même React (composants, props, état), mais rendu en composants natifs iOS/Android : pas de DOM, pas de HTML, pas de CSS.
- Correspondances : `div → View`, texte → `Text` (obligatoire, sinon crash), `button → Pressable` avec `onPress`, scroll explicite via `ScrollView`.
- Les styles sont des objets JS (`StyleSheet.create`), camelCase, sans unités, flexbox par défaut avec `flexDirection: 'column'`.
- Pas de `:hover` : `Pressable` fournit l'état `pressed` à une fonction de style — l'interaction se gère en JavaScript.
- Web et mobile centralisent leur charte pareil : config Tailwind côté site, `src/theme/tokens.ts` côté Pirb — jamais de couleur en dur.

## Mise en pratique

1. Ouvre côte à côte `src/components/EcranCrash.tsx` (Pirb) et `apps/cours/app/components/BoutonLeconFaite.tsx` (ton site). Liste à voix haute 4 différences concrètes : balises, gestion du clic/tap, où vivent les styles, comment le texte est affiché.
2. Dans `EcranCrash.tsx`, lis le `StyleSheet.create` du bas de fichier et traduis 3 propriétés en CSS web (ex. `paddingHorizontal` → `padding-left` + `padding-right` ; `gap: spacing.md` → `gap`). Note celles qui n'existent pas telles quelles en CSS.
3. Prédis : dans le `Pressable` de `EcranCrash.tsx`, que se passe-t-il visuellement pendant que le doigt appuie sur « Réessayer » ? Vérifie en relisant `({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]`.
4. Ouvre `src/components/EcranHorsLigne.tsx` et repère `...StyleSheet.absoluteFillObject` dans le style `overlay`. Explique avec tes mots ce que ça produit (un plein écran positionné en absolu — l'équivalent de `position: absolute; inset: 0` en CSS).
5. Modification sans risque : dans `EcranHorsLigne.tsx`, change `opacity: 0.9` d'un `pressed` en `opacity: 0.5`, lance l'app (`npm start`), coupe le réseau (mode avion) et appuie sur le bouton JOUER. Résultat attendu : le bouton devient nettement plus transparent à l'appui. Remets `0.9` ensuite.
