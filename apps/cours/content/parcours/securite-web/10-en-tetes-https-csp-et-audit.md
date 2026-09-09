---
titre: "En-têtes de sécurité, HTTPS, CSP : la couche que le navigateur applique pour toi"
parcours: "securite-web"
ordre: 10
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Tout ce que tu as vu jusqu'ici est dans ton code. Il existe une dernière couche, gratuite, que tu configures en quelques lignes et que le **navigateur** applique : les en-têtes HTTP de sécurité. Ils ne remplacent rien, ils rattrapent ce qui a échappé.

**HTTPS partout, et `Strict-Transport-Security`.** Vercel et OVH te donnent HTTPS. Mais un utilisateur qui tape `hub.velito.fr` sans `https://` part en HTTP, et sa première requête peut être interceptée avant la redirection. `Strict-Transport-Security: max-age=31536000; includeSubDomains` dit au navigateur : « pendant un an, ne me parle qu'en HTTPS, même si on te dit le contraire ». Après la première visite, plus jamais de HTTP. `includeSubDomains` couvre tout `.velito.fr` — cohérent avec le cookie SSO.

**`Content-Security-Policy` : d'où le code peut venir.** La parade de fond contre le XSS. `script-src 'self'` : seuls les scripts servis par ton propre domaine s'exécutent. Un `<script>` injecté inline, ou chargé depuis `evil.com`, est bloqué par le navigateur même s'il est dans la page. Le site vitrine Venaball a reçu `script-src 'self'` le 9 septembre.

Sur Next.js, c'est plus délicat : Next injecte des scripts inline pour l'hydratation. Il faut soit un *nonce* (une valeur aléatoire par requête, posée sur chaque script légitime et déclarée dans la CSP — Next le supporte via le middleware), soit `'unsafe-inline'` (qui annule l'intérêt principal). La CSP sur une app Next est un chantier en soi ; commence par `Content-Security-Policy-Report-Only` pour voir ce qui serait bloqué sans rien casser.

**Les en-têtes simples, à poser sans réfléchir.**

- `X-Content-Type-Options: nosniff` — le navigateur ne « devine » pas un type MIME différent de celui déclaré. Empêche qu'un fichier texte soit exécuté comme du script parce que son contenu y ressemble.
- `X-Frame-Options: DENY` (ou CSP `frame-ancestors 'none'`) — ta page ne peut pas être mise dans une `<iframe>` d'un autre site. Empêche le *clickjacking* : une page invisible par-dessus un bouton « Supprimer », la victime croit cliquer ailleurs.
- `Referrer-Policy: strict-origin-when-cross-origin` — quand un utilisateur clique un lien sortant, l'autre site ne reçoit que ton domaine, pas l'URL complète (qui peut contenir un token dans le chemin — comme `/t/[qr_token]` sur ARENA).
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — désactive les API que tu n'utilises pas. (Le playground Venaball utilise la caméra : pour lui, `camera=(self)`.)

Sur Next, ces en-têtes se posent dans `next.config.js` (`headers()`) ou dans le middleware. Sur Apache, dans `.htaccess` (`Header set …`). Sur Vercel, `vercel.json`.

**Les cookies, une dernière fois.** `Secure` (HTTPS seulement), `HttpOnly` (invisible au JS), `SameSite=Lax`. Supabase les pose. Si tu poses un cookie toi-même, les trois.

**Auditer.** Deux outils gratuits, à lancer sur chacun de tes domaines :

- **securityheaders.com** : note de A+ à F sur les en-têtes. Vise A. Chaque en-tête manquant est expliqué.
- **Mozilla Observatory** : plus complet, inclut TLS et cookies.

Puis l'audit **interne** : Supabase → Database → Advisors (Security Advisor) liste les fonctions sans `search_path`, les tables sans RLS, les vues sans `security_invoker`. C'est un scan de ta base par ton hébergeur ; il est souvent ignoré, il ne devrait pas.

**Ce qu'un audit ne voit pas.** Les IDOR (il ne connaît pas ta logique), les fuites par les chemins secondaires (listeners, commandes), les mauvaises décisions d'autorisation. Les outils vérifient la couche ; toi, tu vérifies le sens. Les deux audits de Venaball (13/07, 26/07, 06/09) sont ce que fait un développeur sérieux : une relecture de son propre code avec la grille de ce parcours, datée, avec un registre des constats et de leur statut. Le fichier `instruction/34_AUDIT_SECURITE_2026-07-13.md` en est un ; sa deuxième passe a corrigé trois conclusions de la première. **Un audit n'est jamais fini ; il est daté.**

**Pour le jury, la phrase qui résume.** « Ma sécurité a quatre couches : la base garantit les invariants (RLS, triggers, contraintes), le serveur vérifie chaque entrée et chaque droit (validation, Voters, actions), les outils empêchent les injections par défaut (Doctrine, Supabase, React, Twig), et les en-têtes rattrapent ce qui échappe (CSP, HSTS, cookies). Aucune couche ne suffit seule ; j'ai un registre daté de ce qui manque. »

## À retenir

- HSTS : HTTPS pour toujours après la première visite. `includeSubDomains`.
- CSP `script-src 'self'` : le navigateur refuse le code qui ne vient pas de toi. Sur Next, nonce ou `Report-Only` d'abord.
- `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` : à poser partout, sans réfléchir.
- securityheaders.com et Supabase Security Advisor : deux audits gratuits, à lancer maintenant.
- Les outils vérifient la couche ; toi, le sens. Un audit est daté, avec un registre.

## Mise en pratique

Objectif : passer chacun de tes domaines à A sur securityheaders.com, et lancer le Security Advisor.

1. Va sur securityheaders.com, teste `hub.velito.fr`, `arena.velito.fr`, `cours.velito.fr`, `venaball.fr`, `manager.mabb.fr`. Note chaque grade et les en-têtes manquants.
2. Next : dans `apps/hub/next.config.js`, ajoute `async headers()` retournant, pour `/(.*)`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Déploie (branche + PR), reteste : le grade monte.
3. CSP en observation : ajoute `Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; …`. Ouvre la console F12 sur le site : lis les violations rapportées (sans rien bloquer). C'est ta liste de ce qu'une vraie CSP devrait autoriser.
4. Apache (Venaball) : dans `public/.htaccess`, `Header always set X-Content-Type-Options "nosniff"` etc. (module `headers` requis — vérifie qu'OVH l'a). Reteste `manager.mabb.fr`.
5. Supabase → Database → Advisors. Lis chaque alerte de sécurité. Corrige les « search_path mutable » (parcours Supabase, leçon 4) et les « RLS disabled » s'il y en a. Refais tourner jusqu'à zéro alerte de sécurité.
6. Crée `instruction/44_AUDIT_SECURITE_2026-09.md` sur Venaball : date, grille (ce parcours, 10 leçons), un constat par ligne avec statut (ouvert / corrigé / accepté avec justification). Commence par ce que tu as trouvé dans les mises en pratique de ce parcours. C'est ton registre pour le jury.

Résultat attendu : tous tes domaines à A, zéro alerte Security Advisor, et un audit daté que tu peux poser sur la table.
