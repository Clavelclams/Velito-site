---
titre: "Server actions : le pont client → serveur sans route API à écrire"
projet: "cours"
bloc: 1
themes: ["securite", "auth", "next"]
source: "apps/cours/app/login/actions.ts"
date: 2026-07-24
---

## Le concept

Une server action est une fonction marquée `"use server"` qui s'exécute
UNIQUEMENT côté serveur, mais qu'un composant client peut appeler comme une
fonction normale — Next.js fabrique l'appel HTTP tout seul. C'est
l'équivalent moderne d'une route API dédiée, sans le boilerplate.

Dans Velito Cours, `app/login/actions.ts` expose `seConnecterAction` et
`seDeconnecterAction`. Quand j'ai ajouté le bouton Déconnexion dans le
header (`EnTete.tsx`, composant client), je n'ai RIEN réécrit : j'importe
`seDeconnecterAction` et je l'appelle dans un `useTransition` pour afficher
« Déconnexion… » pendant l'exécution. Un seul flux d'auth, deux points
d'entrée UI.

L'intérêt sécurité est concret : la logique d'authentification et les
messages d'erreur détaillés restent sur le serveur, hors du bundle
navigateur. Le client ne reçoit que des réponses neutres (« Identifiants
invalides » — jamais « cet email n'existe pas », qui permettrait d'énumérer
les comptes). Autre subtilité héritée du hub : le cas 429 (rate limit) est
traité à part, sinon l'utilisateur retape son mot de passe en boucle et
entretient son propre blocage.

Piège technique mémorisé : `redirect()` fonctionne en LANÇANT une exception
spéciale que Next.js intercepte. Le mettre dans un `try/catch` la ferait
avaler par le `catch` — il doit rester hors du bloc.

## Comment je l'explique au jury

« Mon authentification passe par des server actions : des fonctions
exécutées exclusivement côté serveur, appelables depuis mes composants
clients. La validation, les appels Supabase et la gestion d'erreurs ne
partent jamais dans le navigateur. Mes messages d'erreur sont volontairement
génériques pour empêcher l'énumération de comptes, et j'ai centralisé le
flux : le formulaire de connexion et le bouton de déconnexion du header
consomment les mêmes actions — un seul endroit à maintenir et à auditer. »

## La question vicieuse du jury

**« Une server action est appelable en HTTP : qu'est-ce qui empêche
quelqu'un de l'appeler directement, hors de votre interface ? »** Réponse :
rien, et c'est prévu — toute fonction exposée au client doit se défendre
seule. C'est pourquoi la validation est refaite côté serveur dans l'action
(jamais confiance au formulaire), et pourquoi la déconnexion est inoffensive
hors contexte. Pour les données sensibles, la protection réelle est en amont
(middleware default-deny, liste blanche) et en aval (règles d'accès en
base). Le principe : chaque couche valide, aucune ne suppose que la
précédente l'a fait.
