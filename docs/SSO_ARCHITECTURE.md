# SSO Velito — Architecture & déploiement

> Doc technique du **compte unique cross-subdomain** de l'écosystème Velito.
> Cible : Clavel (alternance CDA, jury avril 2027) — défense projet + checklist déploiement.
> Dernière maj : 29/05/2026.

---

## 1. Pourquoi un SSO ?

L'écosystème Velito = un domaine racine (`velito.fr`) + plusieurs sous-domaines :

| Sous-domaine | App | Statut |
|---|---|---|
| `velito.fr` | VENA (agence SASU) | Live |
| `hub.velito.fr` | Hub (login central + galaxy) | Live |
| `vea.velito.fr` | VEA (association esport) | Live |
| `interactive.velito.fr` | Interactive (jeux bars/MJC) | En dev |
| `arena.velito.fr` | Arena (tournois esport) | Placeholder |
| `prevention.velito.fr` | Prévention numérique | Placeholder |

Sans SSO, chaque app demanderait à l'utilisateur de se logger séparément — sale UX
et complexité côté code. Avec SSO, l'utilisateur se connecte **une fois** sur le hub,
et sa session est reconnue par toutes les apps.

---

## 2. Architecture choisie

### 2.1 Compte central
Toutes les apps partagent **un seul projet Supabase**. L'identité est dans
`auth.users` + le schéma transverse `shared` (cf. `apps/hub/sql/shared-identity-v1.sql`).

### 2.2 Login centralisé sur le hub
- Le hub (`hub.velito.fr`) est la seule app qui héberge `/login` et `/account`.
- Les autres apps n'ont pas de page de login — elles affichent un bouton
  `<ContinueWithVena />` (package `@repo/ui`) qui redirige vers
  `hub.velito.fr/login?return=<URL_origine>`.
- Au retour, le hub redirige vers `?return=...` (whitelist anti-open-redirect
  dans `apps/hub/src/app/login/actions.ts → safeReturnTo()`).

### 2.3 Cookie de session partagé
Quand l'utilisateur se logge sur le hub, Supabase Auth pose un cookie
`sb-<project>-auth-token`. Par défaut ce cookie reste sur `hub.velito.fr`.
**On le force à être posé avec `Domain=.velito.fr`** → il devient visible
sur `hub.velito.fr`, `interactive.velito.fr`, `vea.velito.fr`, etc.

C'est cette pièce qui rend tout le SSO possible. **Sans le `.` initial du domain,
le cookie reste sur le domaine exact**.

Sécurité : on conserve les flags `HttpOnly + Secure + SameSite=Lax` hérités
de `@supabase/ssr`. Le SSO étend le scope du cookie, pas ses garanties.

### 2.4 Schéma cohérent

```
                ┌─────────────────────────────────────────┐
                │           Projet Supabase unique        │
                │  auth.users  /  shared.users  /  ...    │
                └────────────────┬────────────────────────┘
                                 │ même cookie Domain=.velito.fr
        ┌────────────┬───────────┴──────────┬─────────────┐
        ▼            ▼                      ▼             ▼
   hub.velito.fr  interactive.velito.fr  vea.velito.fr  arena.velito.fr
   ┌─────────┐   ┌─────────┐              ┌─────────┐   ┌─────────┐
   │ /login  │   │/dashboard│              │ pages   │   │  ...    │
   │ /account│   │  …      │              │ pro     │   │         │
   └─────────┘   └─────────┘              └─────────┘   └─────────┘
        ↑              ↑
        │              │  ContinueWithVena → hub.velito.fr/login?return=...
        │              │
       login           propose la connexion si user absent
```

---

## 3. Code (où ça se passe)

### 3.1 Hub
- `apps/hub/src/lib/supabase/server.ts` — Server Component client, injecte `cookieDomain` depuis env
- `apps/hub/src/lib/supabase/client.ts` — Browser client
- `apps/hub/src/middleware.ts` — Refresh la session à chaque request, set Domain
- `apps/hub/src/app/login/actions.ts` — `signInAction` + `signOutAction`
- `apps/hub/src/app/login/page.tsx` — Page de login
- `apps/hub/src/app/account/page.tsx` — Page compte (RLS shared.app_memberships)

### 3.2 Apps consommatrices (ex. Interactive)
- `apps/interactive/lib/supabase/server.ts` — Identique au hub (même injection cookie)
- `apps/interactive/middleware.ts` — Identique au hub
- `apps/interactive/app/dashboard/page.tsx` — Server Component qui check `getUser()`
- `apps/interactive/app/dashboard/DashboardLoggedOut.tsx` — Affiche `<ContinueWithVena />`

### 3.3 Composant partagé
- `packages/ui/src/continue-with-vena.tsx` — Bouton réutilisable, prend `hubUrl` + `returnTo`

---

## 4. Variables d'environnement

### 4.1 Communes à toutes les apps

| Variable | Sensibilité | Dev local | Prod (Vercel) |
|---|---|---|---|
| `SUPABASE_URL` | Non-Sensitive | `https://mmpvpqutidplnvmscgds.supabase.co` | idem |
| `SUPABASE_ANON_KEY` | Non-Sensitive | clé anon publique | idem |
| `COOKIE_DOMAIN` | Non-Sensitive | **vide** (cookie sur localhost) | **`.velito.fr`** |
| `NEXT_PUBLIC_HUB_URL` | Non-Sensitive | `http://localhost:3000` | `https://hub.velito.fr` |

> ⚠️ **Ne JAMAIS marquer `NEXT_PUBLIC_*` en "Sensitive" sur Vercel**.
> Les valeurs gel au build → arrivent vides au runtime → cassent les server clients.
> Leçon du bug VENA, 28/05/2026.

### 4.2 Note sur `COOKIE_DOMAIN`
- Vide en dev = cookie reste sur `localhost:3000`. Le SSO cross-subdomain n'est
  **PAS testable en local** tel quel — il faudrait mapper `*.velito.local` dans
  `C:\Windows\System32\drivers\etc\hosts` et configurer chaque app pour écouter
  sur son port respectif derrière `*.velito.local`. Plus simple : on teste en
  preview Vercel directement.
- `.velito.fr` en prod = cookie partagé sur tous les sous-domaines.

---

## 5. Pattern : ajouter une nouvelle app au SSO

Quand on scaffolde une nouvelle app (ex: `arena`) qui veut consommer la session :

1. **Copier `lib/supabase/server.ts`** depuis Interactive (identique).
2. **Copier `middleware.ts`** depuis Interactive (identique).
3. **Ajouter les env vars** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `COOKIE_DOMAIN`,
   `NEXT_PUBLIC_HUB_URL` sur le projet Vercel de l'app.
4. **Sur les pages protégées** : Server Component qui appelle
   `supabase.auth.getUser()` et redirige (ou affiche `<ContinueWithVena />`) si absent.
5. **(Optionnel) Enregistrer l'app dans `shared.app_memberships`** au 1er passage,
   via la fonction SECURITY DEFINER `shared.register_app_membership(p_app, p_role)`.

---

## 6. Test prod (procédure)

Une fois déployé sur Vercel avec les bonnes env vars :

1. **Login** : aller sur `https://hub.velito.fr/login`
2. Se connecter avec un compte test (ex: `contact@velito.fr`)
3. **Vérifier le cookie** : ouvrir DevTools → Application → Cookies →
   chercher `sb-<project>-auth-token` → la colonne **Domain** doit afficher
   `.velito.fr` (avec le point au début).
4. **Tester un sous-domaine** : aller sur `https://interactive.velito.fr/dashboard`
   sans se reconnecter → tu dois voir le dashboard staff (pas l'écran `Continue with VENA`).
5. **Se déconnecter** depuis le hub → vérifier que la session est aussi tuée sur
   Interactive (refresh la page interactive, tu dois retomber sur l'écran d'invitation).

---

## 7. Défense jury CDA

Points à mettre en avant en oral :

- **Compte unique cross-subdomain** = pattern industriel (Google, GitHub) recréé
  proprement à mon échelle, avec une seule pièce technique : `Domain=.velito.fr`
  sur le cookie de session.
- **Façade UX "Continuer avec VENA"** = on cache la complexité technique sous
  une marque que l'utilisateur reconnaît. Le hub reste discret derrière la SASU.
- **Anti open-redirect** : le `?return=...` est whitelisté par `safeReturnTo()`
  (chemins locaux uniquement OU sous-domaines `.velito.fr` connus). Pas moyen
  de me faire pointer vers `evil.com` après login.
- **Server Components + middleware** : le check d'auth se fait côté serveur,
  zéro flash anonyme/connecté, zéro JS pour décider qui voit quoi.
- **RLS Supabase** : les pages comme `/account` lisent `shared.app_memberships`
  SANS filtre `WHERE user_id = ?` — c'est Postgres qui filtre via la policy
  `auth.uid() = user_id`. La sécurité est dans la DB, pas dans l'app.

---

## 7 bis. ⚠️ Séparation VEA (asso) ↔ écosystème VENA (SASU)

### Décision archi
**VEA n'est PAS dans le SSO.** Le cookie `.velito.fr` est posé uniquement par
le Hub et lu uniquement par les apps de l'écosystème **VENA** :
- ✅ Hub Velito (l'IdP)
- ✅ VENA (velito.fr)
- ✅ Interactive (interactive.velito.fr)
- ✅ Arena (arena.velito.fr) — quand elle sera live
- ✅ Prévention (prevention.velito.fr) — quand elle sera live

**Pas VEA** (vea.velito.fr). VEA garde sa propre authentification 100% locale.

### Pourquoi cette séparation

| | VEA | VENA + apps |
|---|---|---|
| Forme juridique | Association loi 1901 | SASU (entreprise privée Clavel) |
| Membres | Adhérents asso, dirigeants élus AG | Clients / staff VENA |
| Surface de risque | Données mineurs QPV, RGPD strict | Données B2B classiques |
| Modèle économique | Subventions + cotisations | Prestations + SaaS |

Mélanger les sessions = mélanger les périmètres juridiques. Un user qui se logge
côté VENA Services pour acheter une prestation ne doit PAS se retrouver loggé
côté admin VEA. Et inversement, un adhérent VEA ne doit pas être identifié
implicitement comme prospect VENA.

### Implémentation

**Côté VEA** :
- ❌ N'ajoute PAS `COOKIE_DOMAIN=.velito.fr` dans les env Vercel
- ✅ Le cookie de session reste sur `vea.velito.fr` uniquement
- ✅ A ses propres pages `/login`, `/signup`, `/auth/forgot-password`, `/auth/reset-password`
- ✅ Pas de bouton "Continuer avec VENA" ni `<ContinueWithVena />`

**Côté écosystème VENA** :
- ✅ `COOKIE_DOMAIN=.velito.fr` sur Hub + Interactive + futures apps
- ✅ Reset password centralisé sur Hub (`hub.velito.fr/forgot-password`)
- ✅ Bouton `<ContinueWithVena />` (popup OAuth à terme)

### Liens cross-app (autorisés)
Navigation visuelle OK entre les deux périmètres :
- VEA peut linker vers Arena (tournois esport) parce que VEA fait de l'esport
- VEA peut linker vers Prévention (sensibilisation numérique) parce que c'est sa mission
- Hub peut linker vers VEA dans la galaxie des modules

**Mais** : ces liens sont des `<a href>` simples, pas des bridges d'auth. L'user
qui clique se retrouve **anonyme** côté destination s'il ne s'y est pas logué.

### Base de données partagée — précision importante
Note : VEA et VENA partagent **le même projet Supabase** (`velito-hub`).
Donc `auth.users` est commune. Un user existe une seule fois en DB. Le
cloisonnement se fait au niveau **applicatif** :
- Le cookie de session VEA ne sort jamais de `vea.velito.fr`
- Le cookie de session VENA est valable sur `.velito.fr`
- Donc même si l'user est dans `auth.users`, il n'est pas reconnu cross-app
  tant qu'il ne se relogue pas sur le périmètre cible

Si un jour on veut une isolation totale au niveau données : il faudra migrer
VEA vers son propre projet Supabase. Pas urgent.

---

## 8. Limites connues / dette technique

- **Pas de logout cross-subdomain "instantané"** : si tu te déconnectes sur le
  hub, les apps qui ont une session en cache pourraient mettre quelques secondes
  à se rendre compte que la session est morte (le temps que le cookie expire et
  que le middleware refresh). C'est OK pour un MVP, à creuser si gros volume.
- **Pas de SSO logout** type "déconnecte-moi de partout en 1 clic" — le `signOutAction`
  du hub tue le cookie Supabase (qui est partagé) donc en pratique ça marche, mais
  ce n'est pas formalisé dans le code.
- **Cookie Same-Site = Lax** = le navigateur n'envoie pas le cookie sur les
  requêtes cross-site (ex: POST depuis evil.com). C'est CSRF-safe pour les POST,
  mais ça veut aussi dire que les iframes externes ne pourront pas auth. À
  arbitrer si on a un cas d'usage iframe (eg embed du dashboard sur un site partenaire).
