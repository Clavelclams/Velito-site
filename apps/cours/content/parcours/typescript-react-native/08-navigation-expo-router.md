---
titre: "Navigation expo-router : des fichiers qui deviennent des écrans"
parcours: "typescript-react-native"
ordre: 8
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Comment passe-t-on d'un écran à l'autre dans Pirb ? Réponse : **expo-router**, et son idée centrale que tu connais déjà du web — ton site de cours utilise Next.js, où `app/fiches/[slug]/page.tsx` devient l'URL `/fiches/...`. expo-router applique exactement le même principe au mobile : **le système de fichiers EST la navigation**. Un fichier dans `app/` = un écran ; pas de tableau de routes à maintenir à la main.

Regarde la structure de ton dossier `app/` :

```
app/
  _layout.tsx          ← layout RACINE : enveloppe toute l'app
  (tabs)/
    _layout.tsx        ← layout de la barre d'onglets
    index.tsx          ← onglet Accueil (route "/")
    stats.tsx          ← onglet Stats
    ...
```

Trois conventions à connaître. Un `_layout.tsx` n'est pas un écran : c'est l'**enveloppe** des écrans de son dossier (l'équivalent du `layout.tsx` de Next). Un `index.tsx` est l'écran par défaut du dossier. Et les parenthèses de `(tabs)` créent un **groupe** : le dossier organise les fichiers sans apparaître dans l'URL — l'accueil est `/`, pas `/(tabs)/`.

Le layout racine, `app/_layout.tsx`, tu l'as déjà lu en leçon 7. Côté navigation, il déclare une pile :

```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
  <Stack.Screen name="(tabs)" />
</Stack>
```

Un `Stack`, c'est la navigation « empilée » du mobile : chaque nouvel écran se pose sur le précédent, et le geste retour dépile. Ici il ne contient qu'une entrée, le groupe d'onglets, et masque l'en-tête système (`headerShown: false`) — Pirb dessine ses propres en-têtes. C'est aussi dans ce fichier que vivent les gardes : si la session est déconnectée en mode API, le layout retourne `<LoginScreen />` au lieu du `Stack` — tant que tu n'es pas connectée, la navigation n'existe même pas.

Deuxième étage : `app/(tabs)/_layout.tsx`, la barre d'onglets :

```tsx
<Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, ... }}>
  <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home') }} />
  <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('stats-chart') }} />
  <Tabs.Screen name="recherche" options={{ title: 'Recherche', tabBarIcon: icon('search') }} />
  <Tabs.Screen name="practice" options={{ title: 'Playground', tabBarIcon: icon('basketball') }} />
  <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person') }} />
</Tabs>
```

Chaque `Tabs.Screen` relie un FICHIER (`name="stats"` → `app/(tabs)/stats.tsx`) à un onglet (titre, icône). Remarque le découplage nom de fichier / libellé : le fichier `practice.tsx` s'affiche « Playground ». Note aussi la petite fonction `icon()` du même fichier : elle est typée `IoniconName = keyof typeof Ionicons.glyphMap` — traduction : « uniquement un nom d'icône qui existe vraiment ». Une faute de frappe dans `icon('homme')` serait une erreur de compilation, pas une icône vide en production. TypeScript jusque dans la navigation.

Enfin, naviguer par le code : `router.push('/chemin')`. Exemple réel dans `src/components/EcranHorsLigne.tsx` :

```tsx
onPress={() => router.push('/arcade')}
```

Le bouton JOUER de l'écran hors-ligne empile l'écran du jeu caché. Push = « pose par-dessus », le retour ramène en arrière.

Dernier pouvoir d'expo-router, vu en leçon 7 : exporter un composant nommé `ErrorBoundary` depuis un fichier de route ou de layout suffit pour qu'il attrape les erreurs de rendu de tout ce qui est en dessous. Exporté depuis la racine, il couvre l'app entière. La navigation par fichiers n'est donc pas qu'une commodité : c'est aussi le squelette de la résilience de l'app.

## À retenir

- expo-router = navigation par fichiers : un fichier dans `app/` est un écran, comme les routes de Next.js sur mon site — même principe, web et mobile.
- `_layout.tsx` enveloppe les écrans de son dossier ; `index.tsx` est l'écran par défaut ; `(tabs)` est un groupe invisible dans l'URL.
- Deux navigateurs imbriqués chez Pirb : un `Stack` racine (écrans empilés, geste retour) qui contient un `Tabs` (les 5 onglets).
- `router.push('/arcade')` navigue par le code ; la garde de session dans le layout racine remplace toute la navigation par l'écran de connexion.
- Exporter `ErrorBoundary` depuis un layout suffit à expo-router pour attraper les erreurs de rendu en dessous — à la racine, ça couvre toute l'app.

## Mise en pratique

Dans ton projet Pirb :

1. Liste le contenu du dossier `app/(tabs)/` et, pour chaque fichier, dis quel onglet il devient dans `app/(tabs)/_layout.tsx` (nom de fichier → titre affiché → icône). Vérifie le cas piège : quel fichier porte l'onglet « Playground » ?
2. Dans `app/_layout.tsx`, retrouve les trois « sorties » possibles du composant `RootLayout` (le `return` de boot, celui du `LoginScreen`, celui du `Stack`). Explique à voix haute dans quel ordre les conditions sont testées et pourquoi la garde de connexion passe AVANT la navigation.
3. Prédis : si tu crées un fichier `app/(tabs)/essai.tsx` exportant un composant, que se passera-t-il dans la barre d'onglets ? (Réponse attendue : un nouvel onglet apparaît automatiquement — la route naît du fichier ; sans entrée `Tabs.Screen`, il prend un titre par défaut.)
4. Dans `app/(tabs)/_layout.tsx`, explique la ligne `type IoniconName = keyof typeof Ionicons.glyphMap;` avec tes mots, puis teste-la : remplace `icon('home')` par `icon('hoome')` et lance `npm run typecheck`. Résultat attendu : erreur de compilation — le nom d'icône n'existe pas. Remets `'home'`.
5. Modification sans risque : change `title: 'Recherche'` en `title: 'Chercher'` dans `app/(tabs)/_layout.tsx`, lance l'app et observe la barre d'onglets. Résultat attendu : seul le libellé change, la route et l'écran restent identiques — preuve du découplage fichier/affichage. Remets `'Recherche'`.
