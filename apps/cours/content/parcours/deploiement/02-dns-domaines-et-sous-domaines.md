---
titre: "DNS : comment cours.velito.fr trouve Vercel, et pourquoi ça prend « quelques minutes »"
parcours: "deploiement"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Le 14 août, tu as ajouté une ligne chez OVH et `cours.velito.fr` a commencé à répondre. Cette ligne est un enregistrement DNS, et le DNS est l'annuaire d'internet : il traduit un nom (`cours.velito.fr`) en une adresse où envoyer la requête.

**Les acteurs.** Tu as acheté `velito.fr` chez OVH : OVH est ton **registrar** (il tient le nom pour toi) et, par défaut, ton **hébergeur DNS** (il répond aux questions « où est velito.fr ? »). Ce sont deux rôles, souvent chez le même fournisseur, séparables. La **zone DNS** est le fichier de tous les enregistrements de `velito.fr` et de ses sous-domaines.

**Les types d'enregistrements que tu utilises.**

- **A** : nom → adresse IPv4. `mabb.fr A 51.x.x.x` : le serveur OVH mutualisé.
- **AAAA** : nom → adresse IPv6. Même chose.
- **CNAME** : nom → **autre nom**. `cours CNAME cname.vercel-dns.com.` : « pour `cours.velito.fr`, demande à `cname.vercel-dns.com` ». Vercel gère ensuite lui-même vers quelle IP router. L'avantage : si Vercel change ses IP, tu n'as rien à faire. La contrainte : un CNAME ne peut pas coexister avec d'autres enregistrements sur le même nom, et le domaine racine (`velito.fr` sans sous-domaine) ne peut pas être un CNAME — d'où les enregistrements A que Vercel demande pour un apex.
- **MX** : où arrivent les mails de `@velito.fr`. Ne pas y toucher en ajoutant un sous-domaine.
- **TXT** : du texte libre. Sert à prouver que tu contrôles le domaine (vérification Vercel, Google), et pour SPF/DKIM/DMARC — l'authentification des mails sortants. C'est ce qui manque à Brevo sur Venaball (« domaine non authentifié ») : sans SPF/DKIM, tes convocations partent en spam.

**Le point final.** `cname.vercel-dns.com.` avec un point à la fin : c'est un nom **absolu**. Sans le point, certains serveurs DNS le lisent comme relatif à la zone → `cname.vercel-dns.com.velito.fr`, qui n'existe pas. Le point est petit et important.

**La propagation.** Quand tu modifies la zone, la nouvelle réponse n'est pas visible partout instantanément. Chaque résolveur DNS (celui de ton FAI, de Google, de ton entreprise) garde la réponse précédente en cache pendant le **TTL** (*Time To Live*, en secondes) de l'enregistrement. TTL de 3600 = jusqu'à une heure avant que tout le monde voie le changement. Sur `cours.velito.fr`, personne n'avait jamais demandé ce nom, donc aucun cache : visible en quelques minutes. Pour **changer** un enregistrement existant : baisse le TTL à 300 la veille, fais le changement, remonte le TTL après.

**Comment Vercel sait que c'est toi.** Ajouter `cours.velito.fr` dans Vercel ne suffit pas — n'importe qui pourrait ajouter ton domaine à son projet. Vercel vérifie que le CNAME pointe bien vers lui (ou demande un TXT). Le domaine reste « Invalid Configuration » tant que le DNS ne répond pas comme attendu. C'est la vérification de propriété.

**HTTPS suit tout seul.** Une fois le DNS validé, Vercel demande un certificat Let's Encrypt pour `cours.velito.fr`, le renouvelle tous les 90 jours, et sert en HTTPS. OVH mutualisé fait pareil (certificat SSL gratuit dans le manager). Tu n'as jamais à manipuler un certificat — mais tu dois savoir que c'est le DNS validé qui le déclenche.

**Les outils.** `nslookup cours.velito.fr` (Windows) ou `dig cours.velito.fr` : ce que répond le DNS maintenant, depuis ton résolveur. `dig @8.8.8.8 cours.velito.fr` : depuis Google, pour comparer. `dnschecker.org` : depuis des dizaines de résolveurs dans le monde — c'est là qu'on voit la propagation.

**Le multisite OVH.** Sur un hébergement mutualisé, un seul serveur sert plusieurs domaines (`mabb.fr`, `manager.mabb.fr`, `club.venaball.fr`…). Le « multisite » dans le manager OVH associe chaque nom à un **dossier** : `manager.mabb.fr → www/`, `club.venaball.fr → www/` aussi (même code, `MarqueResolver` fait le reste). Apache lit le `Host` de la requête et sert le bon dossier. Un sous-domaine non déclaré dans le multisite → page OVH par défaut, même si le DNS est bon. `app.venaball.fr` est dans ce cas : blocage n°2 de ta liste.

## À retenir

- Registrar tient le nom, hébergeur DNS répond aux questions. OVH fait les deux pour toi.
- A → IP. CNAME → autre nom (Vercel). TXT → preuve de propriété, SPF/DKIM. MX → mails, ne pas toucher.
- Point final = nom absolu. Sans lui, le CNAME est relatif à la zone et casse.
- Propagation = TTL des caches. Nouveau nom : minutes. Changement : jusqu'au TTL. Baisse-le avant.
- DNS validé → certificat automatique. OVH multisite : DNS + dossier, les deux.

## Mise en pratique

Objectif : lire ta zone DNS, diagnostiquer un sous-domaine, et créer `app.venaball.fr`.

1. Manager OVH → Domaines → `velito.fr` → Zone DNS. Liste chaque enregistrement : type, nom, cible, TTL. Pour chaque sous-domaine, dis vers quoi il pointe (Vercel ? OVH ?) et pourquoi c'est un CNAME ou un A.
2. `nslookup cours.velito.fr` puis `nslookup -type=CNAME cours.velito.fr`. Tu vois la chaîne : `cours.velito.fr` → `cname.vercel-dns.com` → une IP. Puis `nslookup velito.fr` : un A, pas un CNAME (apex).
3. `nslookup -type=MX velito.fr` : où arrivent tes mails. `nslookup -type=TXT velito.fr` : SPF présent ? S'il n'y a pas de `v=spf1`, tes mails sortants sont sans preuve d'origine.
4. Diagnostic : `nslookup app.venaball.fr`. Résultat : n'existe pas (NXDOMAIN) ou pointe vers OVH sans multisite. C'est le lien mort de ta landing.
5. Crée-le : zone DNS `venaball.fr` → ajoute `app` en A (même IP que `club.venaball.fr`) ou CNAME vers `club.venaball.fr`. Puis Hébergement → Multisite → ajouter `app.venaball.fr` → dossier `www` → SSL coché. Attends la propagation (dnschecker.org). Puis dans `.env.local` de l'instance Venaball : `APP_SUB_PIRB=app`, et `app` dans le requirement de `config/routes/pirb.yaml`. `cache:clear`. Teste.
6. Brevo : dans Brevo → Senders & Domains → `venaball.fr` → « Authenticate ». Il te donne deux ou trois enregistrements TXT/CNAME (DKIM, SPF). Ajoute-les dans la zone DNS. Reviens dans Brevo → Verify. C'est ce qui sort tes convocations du spam, et c'est un blocage listé depuis juillet.

Résultat attendu : tu lis ta zone DNS, `app.venaball.fr` répond, et Brevo est authentifié — deux blocages de moins.
