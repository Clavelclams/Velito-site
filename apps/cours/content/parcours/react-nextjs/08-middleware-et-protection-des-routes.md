---
titre: "Middleware : le videur qui voit chaque requête avant la page"
parcours: "react-nextjs"
ordre: 8
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Comment `cours.velito.fr` sait-il qu'il doit te renvoyer vers `/login` quand tu n'es pas connecté — sur **toutes** les pages, sans que chaque page ait à vérifier ? Par le **middleware** : un fichier unique, `middleware.ts` à la racine de l'app, qui s'exécute **avant chaque requête**, avant même de savoir quelle page sera rendue.

**Ce qu'il peut faire.** Lire la requête (URL, cookies, headers), et décider : laisser passer (`NextResponse.next()`), rediriger (`NextResponse.redirect(url)`), réécrire vers une autre page sans changer l'URL (`NextResponse.rewrite`), ou répondre directement (un 403, par exemple). Il tourne sur le *Edge runtime* — un environnement léger, sans `node:fs`, pensé pour être rapide.

**Le middleware de cours, lu de haut en bas :**

```ts
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;                                    // ← on y revient
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, { cookies: { /* … */ } });
  const { data: { user } } = await supabase.auth.getUser();

  const estRoutePublique = ROUTES_PUBLIQUES.some((r) => request.nextUrl.pathname === r);

  const emailsAutorises = (process.env.COURS_EMAILS_AUTORISES ?? "").split(",").map(/* … */);
  if (user && emailsAutorises.length > 0 && !emailsAutorises.includes(user.email.toLowerCase())) {
    return new NextResponse("Accès restreint", { status: 403 });
  }
  if (!user && !estRoutePublique) {
    return NextResponse.redirect(urlLogin);
  }
  if (user && estRoutePublique) {
    return NextResponse.redirect(urlAccueil);
  }
  return response;
}
```

Quatre décisions, dans l'ordre : pas de config → laisser passer ; connecté mais pas dans la liste blanche → 403 ; pas connecté sur une page privée → login ; connecté sur `/login` → accueil. Chaque requête passe par là.

**Le `matcher` : sur quoi le middleware tourne.**

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|css|js)$).*)"],
};
```

Cette expression régulière exclut les fichiers statiques (images, CSS, JS, `_next/`). Sans elle, chaque image de la page déclencherait un appel à Supabase pour vérifier la session — lent, et inutile. Le matcher est la première optimisation d'un middleware.

**« Default deny » : le bon défaut.** Le middleware de cours refuse tout sauf `/login`. L'alternative — tout autoriser sauf une liste de pages privées — casse dès qu'on ajoute une page et qu'on oublie de la lister. Ici, une nouvelle page est protégée par défaut. Tu ne peux pas oublier de protéger.

**Authentifié n'est pas autorisé.** `auth.users` est partagé par tout Velito : n'importe qui avec un compte hub est « connecté » sur cours. La liste blanche `COURS_EMAILS_AUTORISES` transforme « authentifié » en « autorisé ». Deux notions, deux vérifications. Le hub fait la même distinction dans `NavBarSlot` pour n'afficher le lien qu'aux bonnes personnes.

**La faille dans ce middleware — à voir, à comprendre, à corriger.** Relis le premier `if` : si les variables Supabase manquent, `return response` — **la requête passe**. C'est un *fail-open* : en cas de mauvaise configuration, la protection disparaît et tout le site devient public. Le 14 août tu as vu qu'un déploiement pouvait partir sans une variable d'environnement. Ce jour-là, sur cours, ça aurait publié toutes tes fiches. La version correcte est un *fail-closed* :

```ts
if (!supabaseUrl || !supabaseAnonKey) {
  return new NextResponse("Configuration manquante", { status: 503 });
}
```

Un 503 plutôt qu'un site ouvert. **Une protection qui se désactive silencieusement quand elle est mal configurée n'est pas une protection.** C'est la mise en pratique de cette leçon.

**Ce que le middleware ne remplace pas.** Il protège l'accès aux **pages**. Il ne protège pas les données : une Server Action ou une route API appelée directement ne passe pas forcément par les mêmes règles (le matcher peut les exclure, et surtout un middleware ne vérifie pas les droits *sur une ressource précise*). Les vérifications fines — « ce tournoi appartient-il à cette orga ? » — restent dans l'action ou dans la RLS. Middleware = porte d'entrée. Pas la seule serrure.

## À retenir

- `middleware.ts` tourne avant chaque requête : rediriger, refuser, laisser passer.
- Le `matcher` exclut les assets — sinon chaque image coûte un appel serveur.
- Default deny : tout est privé sauf liste explicite. On ne peut pas oublier de protéger.
- Authentifié ≠ autorisé : session + liste blanche.
- Fail-closed : si la config manque, refuser (503), pas laisser passer.
- Le middleware garde la porte ; les droits fins sont dans les actions et la base.

## Mise en pratique

Objectif : corriger la faille fail-open du middleware de cours, la tester, et la déployer.

1. Ouvre `apps/cours/middleware.ts`. Remplace le `return response;` du bloc `if (!supabaseUrl || !supabaseAnonKey)` par `return new NextResponse("Configuration Supabase manquante — accès refusé.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });`. Ajoute un commentaire de trois lignes : ce que ça protège, pourquoi 503 et pas 200.
2. Teste le fail-closed : dans `apps/cours/.env.local`, commente temporairement `NEXT_PUBLIC_SUPABASE_URL`. Lance le dev server, ouvre `localhost:3007` : 503. Décommente : le site revient. Tu viens de vérifier que la config manquante ferme au lieu d'ouvrir.
3. Teste la liste blanche : ajoute un email bidon à `COURS_EMAILS_AUTORISES` dans `.env.local`, retire le tien. Recharge : 403. Remets.
4. Teste le matcher : ajoute `console.log("[mw]", request.nextUrl.pathname)` en début de middleware. Charge une page, regarde le terminal : seule la page apparaît, pas les `.css` ni les images. Retire le `console.log`.
5. Ouvre `apps/hub/src/middleware.ts` et `apps/compta/middleware.ts`. Le même `if` fail-open est-il présent ? Si oui, applique la même correction — c'est un motif copié, la faille l'a été aussi.
6. Commit et push sur une branche, PR, merge (parcours Git leçon 7). Sur Vercel, vérifie que cours et hub redéploient et que tu peux toujours te connecter.

Résultat attendu : ton middleware ferme quand il est mal configuré, tu as prouvé chaque branche de décision, et tu as généralisé la correction aux autres apps.
