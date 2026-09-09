---
titre: "HTTPS et certificats : ce que Let's Encrypt fait pour toi, et le tour d'horizon final"
parcours: "deploiement"
ordre: 8
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Tu n'as jamais manipulé un certificat, et pourtant tous tes sites sont en HTTPS. Cette leçon explique ce qui se passe, ce qui peut casser, et fait le tour de tes onze domaines pour vérifier que tout tient.

**Ce que HTTPS garantit.** Trois choses : **confidentialité** (personne entre le navigateur et le serveur ne lit le contenu — pas le wifi du gymnase, pas le FAI), **intégrité** (personne ne modifie le contenu en route — pas d'injection de script par un routeur compromis), **authenticité** (le navigateur a la preuve qu'il parle bien à `cours.velito.fr` et pas à un imposteur). C'est le certificat qui apporte la troisième.

**Le certificat.** Un fichier signé par une **autorité de certification** (CA) qui dit « la clé publique X appartient à `cours.velito.fr` ». Le navigateur fait confiance à une liste de CA (installée avec le système), la CA a vérifié que tu contrôles le domaine, donc le navigateur te fait confiance. Let's Encrypt est une CA gratuite et automatisée : elle vérifie le contrôle du domaine par un défi (un fichier à servir sur `/.well-known/acme-challenge/`, ou un enregistrement DNS TXT), émet un certificat valable **90 jours**, et le renouvellement est automatique.

**Vercel** : dès que le DNS d'un domaine est validé, Vercel obtient et renouvelle le certificat. Tu ne vois rien. **OVH mutualisé** : Manager → Hébergement → Multisite → colonne SSL → « Let's Encrypt » coché par domaine. OVH renouvelle. Si un sous-domaine est ajouté au multisite **sans** cocher SSL, il répond en HTTP seulement, et le navigateur affiche « Non sécurisé ».

**Ce qui casse, et comment le voir.**

- **Certificat expiré** : renouvellement automatique raté (DNS changé, défi bloqué par un `.htaccess` trop strict sur `.well-known`). Symptôme : « Votre connexion n'est pas privée » du jour au lendemain. `curl -vI https://…` montre la date d'expiration ; ssllabs.com/ssltest donne un rapport complet.
- **Nom qui ne correspond pas** : le certificat couvre `mabb.fr` mais tu appelles `app.mabb.fr`. Chaque sous-domaine a besoin d'être couvert (Let's Encrypt émet par nom, ou un wildcard `*.mabb.fr` via défi DNS).
- **Contenu mixte** : la page est en HTTPS mais charge une image ou un script en `http://`. Le navigateur bloque le script (et affiche un avertissement pour l'image). Cherche `http://` dans tes templates et CSS.
- **Redirection HTTP → HTTPS absente** : `http://manager.mabb.fr` doit répondre 301 vers `https://`. Sur OVH, une case « Forcer HTTPS » dans le multisite ; sur Vercel, automatique.
- **HSTS** (parcours Sécurité, leçon 10) : une fois posé, le navigateur refuse HTTP pendant un an. À poser **après** avoir vérifié que tout marche en HTTPS — sinon on s'enferme dehors.

**Les cookies et HTTPS.** Un cookie de session sans l'attribut `Secure` part aussi en HTTP — donc en clair sur le réseau. Supabase pose `Secure`. Symfony, en prod, doit avoir `cookie_secure: auto` (ou `true`) dans `framework.yaml` → session. Vérifie.

**Le tour de tes domaines.** Onze noms en production, sur trois hébergements :

| Domaine | Hébergement | Chaîne | Point de vigilance |
|---|---|---|---|
| hub.velito.fr | Vercel | push → build | JWKS, SSO : critique |
| arena / vea / interactive / compta / cours .velito.fr | Vercel | push → build | env vars, turbo-ignore |
| velito.fr | Vercel | push → build | apex (A, pas CNAME) |
| mabb.fr / manager.mabb.fr / pirb.mabb.fr | OVH cluster102 | SSH + pull | `.htaccess`, cron, backup |
| venaball.fr | OVH (SFTP) | upload manuel | pas de Git |
| club.venaball.fr / api.venaball.fr | OVH cluster100 | SSH + pull | MySQL 8.4, `.env.local` |
| app.venaball.fr | OVH cluster100 | à créer | DNS + multisite + SSL |

Ce tableau est ta carte. Quand quelque chose ne répond pas, la première question est « quelle ligne ? » — et la ligne dit où chercher.

## À retenir

- HTTPS = confidentialité + intégrité + authenticité. Le certificat porte la troisième.
- Let's Encrypt : 90 jours, renouvellement automatique par Vercel et OVH. Case SSL par sous-domaine chez OVH.
- Casse : expiration, nom non couvert, contenu mixte, redirection absente. `curl -vI` et ssllabs pour voir.
- Cookies `Secure`, HSTS après vérification.
- Onze domaines, trois hébergements, trois chaînes. Le tableau est ta carte.

## Mise en pratique

Objectif : vérifier chaque domaine, poser HSTS, et compléter la carte.

1. Pour chaque domaine du tableau : `curl -sI https://<domaine> | findstr /i "HTTP strict"` — code de réponse et présence de HSTS. Puis `curl -sI http://<domaine>` → 301 vers HTTPS ? Note dans un tableau.
2. ssllabs.com/ssltest sur `manager.mabb.fr` et `hub.velito.fr`. Grade ? Date d'expiration du certificat ? Protocoles anciens (TLS 1.0/1.1) encore actifs ? Note.
3. Contenu mixte : ouvre chaque site, F12 → Console. Une ligne « Mixed Content » = une ressource en `http://`. `findstr /s "http://" mabb-site\templates mabb-site\assets` : corrige en `https://` ou en chemin relatif.
4. Symfony : `config/packages/framework.yaml` → `session.cookie_secure: auto` et `cookie_samesite: lax`. Si absent, ajoute, déploie.
5. HSTS : sur Vercel (`next.config.js` headers) et Apache (`.htaccess`), `Strict-Transport-Security: max-age=31536000; includeSubDomains` — **seulement** sur les domaines dont tu as vérifié à l'étape 1 que HTTP redirige et que HTTPS marche partout. Déploie, revérifie avec `curl`.
6. Complète la carte : crée `instruction/46_CARTE_DOMAINES.md` sur Venaball (ou à la racine du monorepo) avec le tableau ci-dessus enrichi de : IP/CNAME, date de vérification, grade SSL, HSTS oui/non, responsable du renouvellement. C'est le document que tu ouvres quand un domaine ne répond pas.

Résultat attendu : onze domaines vérifiés, HSTS posé où c'est sûr, et une carte à jour de ton infrastructure.
