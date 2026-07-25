---
titre: "Mes routes, c'est mon arborescence : la navigation par fichiers avec expo-router"
projet: "pirb"
bloc: 1
themes: ["navigation mobile", "convention plutot que configuration"]
source: "app/(tabs)/_layout.tsx"
date: 2026-07-25
---

## Le concept

Avec expo-router, il n'y a pas de fichier central qui déclare les routes : **chaque fichier du dossier `app/` EST un écran**, et son chemin est son URL. C'est le principe « convention plutôt que configuration » (comme Next.js sur le web). Dans Pirb :

- `app/_layout.tsx` : le layout racine — une `<Stack>` qui enveloppe toute l'app. C'est là que vivent les préoccupations globales : chargement des fonts, intro animée, garde de connexion (pas de session en mode API = `<LoginScreen />`, l'app « n'existe pas » tant qu'on n'est pas connectée), export de l'`ErrorBoundary` global, enregistrement du push.
- `app/(tabs)/_layout.tsx` : les 5 onglets. Les parenthèses de `(tabs)` créent un **groupe** : le dossier organise les fichiers mais n'apparaît pas dans l'URL (`/stats`, pas `/(tabs)/stats`).

```tsx
<Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home') }} />
<Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('stats-chart') }} />
<Tabs.Screen name="recherche" options={{ title: 'Recherche', tabBarIcon: icon('search') }} />
<Tabs.Screen name="practice" options={{ title: 'Playground', tabBarIcon: icon('basketball') }} />
<Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person') }} />
```

Les écrans hors onglets (arcade, convocations, notifications...) sont des fichiers à la racine de `app/`, poussés dans la Stack : `router.push('/arcade')` dans `EcranHorsLigne.tsx`, `router.push('/convocations')` au tap d'une notification dans `src/services/push.ts`. La décision D-02 d'`instruction/01_ARCHITECTURE_APP.md` documente le choix contre React Navigation « manuel » : moins de code d'assemblage, convention lisible, standard actuel d'Expo.

## Comment je l'explique au jury

J'ai choisi expo-router plutôt que React Navigation configuré à la main : c'est de la navigation par fichiers, chaque fichier de mon dossier app est un écran, et son chemin est sa route. Mes routes, c'est mon arborescence — pour comprendre la navigation de l'app, il suffit d'ouvrir le dossier. Les layouts s'emboîtent : la racine porte tout ce qui est global — les polices, la garde de connexion, l'error boundary — et le groupe (tabs), dont les parenthèses signifient que le dossier n'apparaît pas dans l'URL, porte ma barre de 5 onglets. Ce choix me donne aussi des bénéfices gratuits : le deep linking est natif, ce qui me sert pour ouvrir l'écran des convocations directement depuis une notification push, et l'error boundary global est un simple export nommé dans le layout racine, détecté automatiquement par le routeur. Moins de code d'assemblage, c'est moins de code à maintenir et moins de bugs possibles.

## La question vicieuse du jury

**« Avec la navigation par fichiers, comment protégez-vous vos écrans ? N'importe qui peut taper une URL et arriver sur un écran privé, non ? »**

La garde n'est pas posée route par route, elle est posée au niveau du layout racine, donc au-dessus de TOUTES les routes : dans `app/_layout.tsx`, si le mode API est actif et qu'aucune session n'est ouverte, le composant retourne l'écran de connexion au lieu de la Stack — la navigation n'est même pas montée, il n'existe littéralement aucun écran à atteindre. C'est plus sûr qu'une vérification par écran, qu'on peut oublier sur un nouvel écran. Et surtout, la vraie protection n'est pas dans l'UI : chaque requête de la couche données part avec le jeton Bearer, et c'est le serveur Symfony qui autorise ou refuse — un 401 invalide la session et fait retomber l'app sur la connexion. La navigation cache, le serveur protège : la sécurité côté client n'est jamais qu'un confort.
