---
titre: "Formulaires : la porte d'entrée des données"
parcours: "html-css"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-25
---

## Le cours

Tout ce que tes utilisateurs t'envoient — un email de connexion, un score dans Venaball, une recherche — passe par un **formulaire**. C'est le guichet de la page : l'utilisateur remplit, valide, et les données partent vers le serveur.

Le trio de base :

```html
<form action="/contact" method="post">   <!-- le guichet : où et comment envoyer -->
  <label for="email">Ton email</label>   <!-- l'étiquette du champ -->
  <input type="email" id="email" name="email" required>
  <button type="submit">Envoyer</button> <!-- déclenche l'envoi -->
</form>
```

Détaillons, car chaque attribut a un métier :

- `<form>` délimite le guichet. `action` dit **où** envoyer (une URL), `method` dit **comment** : `get` colle les données dans l'URL (bien pour une recherche, partageable), `post` les met dans le corps de la requête (obligatoire pour un mot de passe ou une création de données).
- `<input>` est le champ. Son attribut `type` change tout : `text`, `email`, `password` (masqué), `number`, `date`, `checkbox`… Sur mobile, `type="email"` affiche même un clavier avec `@`. 
- `name` est **le nom de la donnée côté serveur**. Sans `name`, le champ est muet : il ne part pas dans la requête. C'est l'erreur classique du champ « qui n'arrive jamais ».
- `<label>` est l'étiquette **liée** au champ : son `for` pointe vers l'`id` de l'input (ou alors le label enveloppe l'input, sans `for`). Lié correctement, cliquer le texte met le focus dans le champ, et un lecteur d'écran annonce « Ton email, champ de saisie ». Un simple `<p>` au-dessus ne fait rien de tout ça.
- `required`, `minlength`, `type="email"`… : la **validation côté navigateur**. Gratuite, immédiate, mais jamais suffisante — n'importe qui peut envoyer une requête sans passer par ton formulaire, donc le serveur doit **toujours** revalider. Navigateur = confort, serveur = sécurité. Phrase à retenir pour le jury.

Quand l'utilisateur clique sur `<button type="submit">`, le navigateur fabrique une requête HTTP (comme à la leçon 1) avec les paires `name=valeur`, l'envoie à `action`, et affiche la réponse. C'est le cycle complet d'un formulaire « classique », celui de tes pages Twig dans Venaball.

Et dans ton site Next.js ? Ouvre `/root/work/Velito-site/apps/cours/app/login/LoginForm.tsx` : tu y retrouves tout — un `<form>`, deux `<label>` qui **enveloppent** leurs `<input>` (l'autre façon valide de lier), `type="email"` et `type="password"`, `required`, `minLength={6}`. La différence : `onSubmit` intercepte l'envoi pour le faire en JavaScript au lieu de laisser le navigateur recharger la page. Le HTML du formulaire reste le même ; seul le mode d'envoi change. Note aussi `autoComplete="current-password"` : c'est ce qui permet au gestionnaire de mots de passe de proposer le remplissage.

## À retenir

- Un formulaire envoie des paires `name=valeur` au serveur ; sans attribut `name`, une donnée ne part pas.
- `method="get"` = données dans l'URL (recherche) ; `method="post"` = données dans le corps (mot de passe, création).
- Un `<label>` doit être lié à son champ (`for`/`id`, ou en l'enveloppant) : clic + lecteurs d'écran en dépendent.
- La validation navigateur (`required`, `type="email"`…) est du confort ; la validation serveur est la sécurité — les deux, toujours.
- Un formulaire React (comme `LoginForm.tsx`) garde le même HTML : seul l'envoi est intercepté en JavaScript.

## Mise en pratique

Objectif : disséquer ton vrai formulaire de connexion, puis en construire un à la main.

1. Ouvre `/root/work/Velito-site/apps/cours/app/login/LoginForm.tsx` dans VS Code. Pour chaque `<input>`, note : son `type`, ses règles de validation, et comment le `<label>` est lié (indice : il n'y a pas de `for`… pourquoi est-ce valide quand même ?).
2. Lance le site, va sur `/login`, et clique sur le **texte** « Email » : le curseur doit sauter dans le champ. C'est la preuve visible du lien label/champ.
3. Toujours sur `/login`, essaie d'envoyer un email invalide (`abc`) puis un mot de passe de 3 caractères : observe les messages du navigateur. C'est la validation native que React n'a pas eu besoin de coder.
4. Reprends ton `test.html` de la leçon 2 et ajoute un formulaire de contact complet : nom (`text`, `required`), email (`email`, `required`), sujet (`select` avec 3 `option`), message (`textarea`), et un bouton d'envoi. Mets `action="https://exemple.fr"` et `method="get"`.
5. Ouvre `test.html` dans le navigateur, remplis, envoie, et **regarde l'URL** de la page d'arrivée : tes paires `name=valeur` y sont visibles. Supprime le `name` d'un champ, recommence : la donnée a disparu de l'URL. Tu viens de voir pourquoi `name` est vital.

**Résultat attendu** : ton formulaire de contact valide les champs tout seul et tu peux lire tes données dans l'URL ; tu sais expliquer les deux façons de lier un label et la phrase « navigateur = confort, serveur = sécurité ».
