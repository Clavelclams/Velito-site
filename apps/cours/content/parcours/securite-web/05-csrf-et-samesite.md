---
titre: "CSRF : faire agir la victime à son insu, et les trois parades"
parcours: "securite-web"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Tu es connecté sur `manager.mabb.fr`. Tu ouvres un autre onglet, un site quelconque. Ce site contient, caché :

```html
<form action="https://manager.mabb.fr/joueuse/42/supprimer" method="POST" id="f"></form>
<script>document.getElementById("f").submit()</script>
```

Ton navigateur envoie le POST — **avec tes cookies de session**, parce que c'est ce que fait un navigateur : il joint les cookies du domaine cible à chaque requête vers ce domaine. Le serveur voit une requête authentifiée, légitime en apparence, et supprime la joueuse. Tu n'as rien cliqué. C'est le *Cross-Site Request Forgery*.

**Ce qui le rend possible.** Le serveur ne sait pas distinguer une requête que **tu** as voulue d'une requête qu'un site tiers a déclenchée **depuis ton navigateur**. Les deux portent le même cookie. La parade consiste à ajouter quelque chose que le site tiers **ne peut pas** fournir.

**Parade 1 : le jeton CSRF (Symfony).** Chaque formulaire Venaball contient un champ caché `_token` avec une valeur aléatoire, liée à ta session, générée par le serveur. À la soumission, le serveur vérifie que le jeton correspond. Le site tiers ne connaît pas ce jeton (il ne peut pas lire ta page — c'est la *same-origin policy* du navigateur), donc son formulaire forgé est refusé. Symfony le fait automatiquement pour les formulaires construits avec le composant Form, et fournit `csrf_token('nom')` pour les formulaires manuels. `ConvocationManager` a été extrait d'un contrôleur qui mêlait « le jeton CSRF » à la logique métier — le jeton reste dans le contrôleur, la logique est partie dans le service.

**Parade 2 : `SameSite` sur le cookie.** Un attribut qui dit au navigateur **quand** envoyer le cookie :

- `SameSite=Strict` : jamais sur une requête venant d'un autre site. Le formulaire caché part sans cookie → non authentifié → refusé. Mais aussi : cliquer un lien vers ton site depuis un mail te fait arriver déconnecté. Trop strict pour la plupart des usages.
- `SameSite=Lax` (le défaut moderne) : le cookie est envoyé sur une **navigation de haut niveau** (cliquer un lien, taper l'URL) mais **pas** sur un POST, une image, un iframe, un fetch déclenchés par un autre site. Le formulaire caché en POST part sans cookie. Le lien depuis un mail marche.
- `SameSite=None` : toujours envoyé (exige `Secure`). Nécessaire pour un cookie qui doit traverser des sites — rare, et à justifier.

Supabase Auth pose ses cookies en `Lax`. C'est ce qui permet au logout centralisé du hub de fonctionner : le POST vers `hub.velito.fr/logout` depuis `interactive.velito.fr` est **same-site** (même domaine parent `.velito.fr`), donc le cookie part. Un POST depuis `evil.com` ne l'emporterait pas.

**Parade 3 : ne jamais muter sur un GET.** Un `<img src="https://hub.velito.fr/logout">` caché dans une page déclenche un GET avec cookies — `SameSite=Lax` **l'autorise** (c'est une « navigation » du point de vue du navigateur ? non, une image n'est pas une navigation de haut niveau, mais certains cas GET passent). Le point sûr : une action qui **modifie** un état est un **POST**, jamais un GET. Le logout du hub est POST-only pour cette raison exacte. Un GET ne doit que lire.

**Et les Server Actions Next ?** Next protège les Server Actions contre le CSRF par défaut : il vérifie que l'en-tête `Origin` de la requête correspond à l'hôte (`Host`). Un POST forgé depuis `evil.com` porte `Origin: https://evil.com` — refusé. Tu n'as rien à faire, mais sache que c'est là, et que ça ne couvre que les actions — une `route.ts` en POST avec cookies doit se protéger elle-même (vérifier `Origin`, ou exiger un jeton).

**L'API mobile n'a pas ce problème.** L'app Venaball envoie un jeton dans un en-tête `Authorization: Bearer …`, pas un cookie. Un site tiers ne peut pas ajouter cet en-tête à une requête forgée (le navigateur ne le fait pas automatiquement). Le CSRF est **un problème de cookies** : sans cookie automatique, pas de CSRF. C'est l'un des arguments pour les jetons dans les API.

**Les trois ensemble.** `SameSite=Lax` bloque la plupart des cas gratuitement. Le jeton CSRF couvre les cas restants et les navigateurs anciens. POST-only pour les mutations empêche l'attaque par image/lien. Une app bien faite a les trois ; la tienne les a, par ses outils — reste à ne pas les contourner.

## À retenir

- CSRF = un site tiers fait envoyer à ton navigateur une requête authentifiée par tes cookies.
- Jeton CSRF : une valeur que le site tiers ne peut pas connaître. Symfony le fait par défaut.
- `SameSite=Lax` : le cookie ne part pas sur un POST cross-site. Défaut moderne, et celui de Supabase.
- Toute mutation en POST. Un GET ne modifie rien. Le logout du hub est POST-only pour ça.
- Next vérifie `Origin` sur les Server Actions. Une `route.ts` doit se protéger seule.
- Pas de cookie automatique (Bearer) = pas de CSRF.

## Mise en pratique

Objectif : forger une requête CSRF contre tes apps, et la voir échouer pour trois raisons différentes.

1. Crée un fichier `csrf-test.html` sur ton bureau avec un `<form method="POST" action="http://localhost:3000/logout">` (le hub en local) et un `<script>` qui le soumet au chargement. Connecte-toi sur le hub en local, ouvre le fichier `file://…` dans le même navigateur. Résultat attendu : tu **restes connecté**. Ouvre F12 → Network sur la requête : les cookies `sb-…` ne sont pas envoyés (`SameSite=Lax`, origine `file://`).
2. Même test avec un `<img src="http://localhost:3000/logout">`. Le hub répond 405 ou 404 : la route n'accepte pas GET. POST-only a tenu.
3. Venaball local : forge un POST vers une route de suppression sans le champ `_token`. Réponse : « Invalid CSRF token » (ou 400/419). Le jeton a tenu. Puis regarde un formulaire réel dans le DOM : trouve le `<input type="hidden" name="_token">`.
4. Server Action Next : depuis la console F12 d'un **autre** site (n'importe lequel), lance un `fetch("http://localhost:3007/…", { method: "POST", credentials: "include", … })` vers une action de cours. Refusé (`Origin` ne correspond pas). Depuis la console de cours lui-même : accepté. C'est la vérification d'origine de Next.
5. Audit : `findstr /s "export async function GET" apps\*\app\api` — pour chaque route GET, vérifie qu'elle **ne modifie rien**. `findstr /s "export async function POST"` — pour chaque POST avec cookies, quelle protection CSRF ? (Origin ? Jeton ? Ou est-ce une route pour l'API mobile avec Bearer ?)
6. Vérifie l'attribut `SameSite` de tes cookies : F12 → Application → Cookies → colonne `SameSite`. Tout doit être `Lax` ou `Strict`, jamais vide sur un cookie de session.

Résultat attendu : trois attaques CSRF échouées pour trois raisons distinctes, et un audit de tes routes POST.
