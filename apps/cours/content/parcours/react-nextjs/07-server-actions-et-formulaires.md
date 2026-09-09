---
titre: "Server Actions : appeler le serveur comme une fonction"
parcours: "react-nextjs"
ordre: 7
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Avant Next.js 13, soumettre un formulaire voulait dire : créer une route d'API, écrire un `fetch` côté client, sérialiser en JSON, gérer les erreurs, déchiffrer la réponse. Une **Server Action** supprime tout ça : c'est **une fonction serveur que tu appelles depuis un composant comme une fonction normale**. Next.js s'occupe du transport HTTP.

**La forme.** Un fichier `actions.ts` avec `"use server"` en première ligne :

```ts
"use server";

export async function seConnecterAction(email: string, motDePasse: string) {
  if (!email?.includes("@") || !motDePasse || motDePasse.length < 6) {
    return { success: false, error: "Email valide et mot de passe requis." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) return { success: false, error: "Identifiants invalides." };
  redirect("/");
}
```

C'est `apps/cours/app/login/actions.ts`, condensé. Ce code **ne quitte jamais le serveur** : la logique d'auth, les messages d'erreur détaillés, l'appel Supabase avec les cookies — rien n'est dans le bundle navigateur. Le client ne reçoit qu'une référence opaque vers la fonction.

**L'appel depuis un Client Component :**

```tsx
"use client";
import { seConnecterAction } from "./actions";

const resultat = await seConnecterAction(email, motDePasse);
if (!resultat.success) setErreur(resultat.error);
```

Derrière, Next fait un `POST` avec les arguments sérialisés, exécute la fonction sur le serveur, renvoie la valeur de retour. Tu écris `await maFonction()`, il fait le réseau.

**Avec un `<form>`, c'est encore plus direct :**

```tsx
<form action={signOutAction}>
  <button type="submit">Se déconnecter</button>
</form>
```

C'est le logout du hub (`NavBar.tsx`). Pas de `onSubmit`, pas de `preventDefault`, pas de state : le formulaire appelle l'action, qui reçoit un `FormData`. Et ça **fonctionne sans JavaScript** — le formulaire est soumis en HTML classique si le JS n'est pas chargé. C'est de l'*amélioration progressive* gratuite.

**Les trois règles de sécurité d'une action**, à ne jamais oublier :

1. **Une action est un endpoint public.** N'importe qui peut l'appeler avec n'importe quels arguments — pas seulement ton formulaire. Donc **valider côté serveur**, toujours, même si le formulaire valide déjà. Le `if (!email?.includes("@"))` au début n'est pas redondant, il est obligatoire.
2. **Vérifier les droits dans l'action**, pas dans le composant qui l'appelle. Le composant peut être contourné. `requireStaff()` au début des actions ARENA est là pour ça.
3. **Ne pas révéler d'information par l'erreur.** « Identifiants invalides » et non « cet email n'existe pas » — sinon on énumère les comptes. Le vrai message va dans `console.error` serveur, l'utilisateur reçoit le neutre.

**Après l'action : `redirect` et `revalidatePath`.** Une action qui modifie des données doit dire à Next que les pages concernées sont périmées :

```ts
import { revalidatePath } from "next/cache";
revalidatePath("/admin/tournois");   // la prochaine visite régénère
```

Sans ça, une page statique ou en cache continue de montrer l'ancien état. `redirect("/")` en fin d'action envoie l'utilisateur ailleurs — et lève une exception spéciale, donc rien ne s'exécute après lui (ne mets pas de `return` derrière, c'est du code mort).

**`useActionState` pour le feedback.** Pour afficher « en cours… » et l'erreur sans gérer le state à la main :

```tsx
const [etat, action, enCours] = useActionState(seConnecterAction, null);
<form action={action}>
  <button disabled={enCours}>{enCours ? "Connexion…" : "Se connecter"}</button>
  {etat?.error && <p>{etat.error}</p>}
</form>
```

L'action reçoit alors `(etatPrecedent, formData)` — adapte sa signature.

**Quand utiliser une `route.ts` à la place.** Une Server Action est faite pour **ton** front. Si un client externe doit appeler ton serveur — une app mobile, un autre site, un webhook, un export JSON public comme `arena/api/export/[token]` — il faut une vraie route HTTP avec une URL stable et un format documenté. Action = interne, route = API.

## À retenir

- `"use server"` + fonction exportée = appelable depuis le client, exécutée sur le serveur, transport géré par Next.
- `<form action={fn}>` marche sans JS et reçoit un `FormData`.
- Une action est publique : valider, vérifier les droits, ne rien révéler par les erreurs.
- `revalidatePath` après une écriture, `redirect` pour envoyer ailleurs (rien ne s'exécute après).
- Action pour ton front, `route.ts` pour un client externe.

## Mise en pratique

Objectif : écrire une action qui écrit un fichier, l'appeler de deux façons, et la casser pour voir la validation.

1. Crée `apps/cours/app/notes/actions.ts` avec `"use server"` et une fonction `ajouterNote(formData: FormData)` qui lit `formData.get("texte")`, valide (chaîne non vide, < 500 caractères, sinon `return { error }`), et l'ajoute en fin de `content/notes.md` avec `node:fs` (`appendFileSync`). Termine par `revalidatePath("/notes")`.
2. Crée `apps/cours/app/notes/page.tsx` (Server Component) qui lit `content/notes.md` et l'affiche, avec un `<form action={ajouterNote}>` contenant un `<textarea name="texte">` et un bouton. Teste : la note apparaît après soumission, sans rechargement complet.
3. Désactive JavaScript dans Chrome (F12 → ⋯ → Settings → Debugger → Disable JavaScript). Soumets : ça marche encore — amélioration progressive. Réactive.
4. Casse la validation : envoie 600 caractères. L'erreur est retournée mais pas affichée. Convertis le formulaire en Client Component avec `useActionState` pour afficher `etat.error` et désactiver le bouton pendant `enCours`.
5. Contourne le formulaire : dans la console F12, trouve la requête POST de l'action (onglet Network, après une soumission), copie-la en `fetch` (clic droit → Copy as fetch), modifie le texte pour 600 caractères, exécute. Le serveur refuse quand même. C'est pour ça que la validation est dans l'action.
6. Ouvre `apps/arena/lib/arena/actions.ts`. Repère `requireStaff` en début de chaque action d'écriture. Explique en commentaire dans ton `actions.ts` pourquoi une vérification dans le composant ne suffirait pas.
7. Garde `/notes` si ça t'est utile comme bloc-notes de révision ; sinon supprime le dossier et `content/notes.md`.

Résultat attendu : tu as écrit et appelé une Server Action, vu qu'elle marche sans JS, et prouvé que sa validation serveur est ce qui protège vraiment.
