---
titre: "Authentifié n'est pas autorisé : les deux questions que chaque requête pose"
parcours: "securite-web"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-09-09
---

## Le cours

Toute la sécurité applicative tient dans deux questions, posées dans cet ordre, à chaque requête :

1. **Qui es-tu ?** — l'**authentification**. Prouver une identité : mot de passe, jeton, cookie de session.
2. **As-tu le droit de faire ça ?** — l'**autorisation**. Étant donné qui tu es, cette action sur cette ressource est-elle permise ?

Les confondre est la source de la majorité des failles que tu rencontreras. Un système qui répond à la première et oublie la seconde laisse tout utilisateur connecté faire tout.

**Ton écosystème l'illustre partout.**

- `cours.velito.fr` : n'importe qui avec un compte Velito est **authentifié** (la table `auth.users` est partagée). Seuls trois emails sont **autorisés** (`COURS_EMAILS_AUTORISES`). Le middleware fait les deux vérifications, séparément : pas de session → `/login` ; session mais pas dans la liste → 403.
- Venaball : un utilisateur connecté est authentifié. Peut-il voir la séance 42 ? Ça dépend de son club, de son rôle, et de l'équipe de la séance. C'est le `Voter` qui répond — et les tests anti-IDOR prouvent qu'il répond non quand il faut.
- ARENA : un visiteur anonyme (pas authentifié du tout) est autorisé à lire les tournois publiés. Un staff authentifié est autorisé à voir ses brouillons. La RLS porte l'autorisation.

**Les codes HTTP qui correspondent.** `401 Unauthorized` — mal nommé : il veut dire « pas authentifié, identifie-toi ». `403 Forbidden` — « authentifié, mais pas autorisé ». `404 Not Found` — parfois utilisé à la place du 403 pour ne pas révéler qu'une ressource existe (ARENA sur un tournoi brouillon). Choisir entre 403 et 404 est une décision : le 403 est plus honnête pour l'utilisateur légitime qui s'est trompé d'URL, le 404 ne donne aucune information à l'attaquant.

**Où se prend la décision d'autorisation.** La règle qui ne se négocie pas : **côté serveur, sur chaque requête, au plus près de la ressource**. Pas dans le bouton qu'on cache, pas dans le menu qu'on n'affiche pas, pas dans le composant qui vérifie avant d'appeler l'action. Tous ces endroits sont contournables — l'utilisateur peut appeler l'action directement, taper l'URL, modifier le JavaScript. Le lien « 🎓 Cours » caché aux non-autorisés sur le hub est de la **navigation**, pas de la sécurité ; la sécurité est dans le middleware de cours qui refuse quoi qu'il arrive.

**Les trois modèles d'autorisation que tu utilises.**

- **Liste blanche** (cours) : une liste explicite de qui a le droit. Simple, sûr, ne passe pas à l'échelle.
- **Rôles** (Venaball : `UserClubRole` avec COACH, PARENT, ADMIN par club) : un utilisateur a des rôles, chaque action exige un rôle. Le Voter Symfony traduit « ce rôle sur ce club permet-il cette action sur cette ressource ? ».
- **Propriété et périmètre** (ARENA, VEA : RLS sur `organisation_id`, `user_id = auth.uid()`) : on a le droit sur ce qui nous appartient ou sur le périmètre de son organisation. C'est le multi-tenant.

Les trois coexistent souvent : un rôle *dans* un périmètre.

**Le principe du moindre privilège.** Donner à chaque acteur le **minimum** de droits nécessaires. Le client anonyme d'ARENA n'a que le `SELECT`. L'app mobile Venaball a un jeton avec des scopes limités. La Viewer API Toornament plutôt que l'Organizer API. Chaque droit non donné est une attaque qui ne peut pas arriver.

**« Deny by default ».** L'état de départ est le refus ; on ouvre explicitement. `ENABLE ROW LEVEL SECURITY` ferme tout avant les policies. Le middleware de cours refuse tout sauf `/login`. Le `.htaccess` de Venaball fait `Require all denied` puis rouvre les images. Le contraire — tout ouvert, on ferme ce qu'on pense à fermer — casse à la première page oubliée.

## À retenir

- Authentification = qui. Autorisation = quoi sur quoi. Deux questions, deux vérifications.
- 401 = identifie-toi. 403 = tu n'as pas le droit. 404 = parfois un 403 discret.
- La décision se prend côté serveur, sur chaque requête, près de la ressource. Jamais dans l'UI.
- Liste blanche, rôles, périmètre : trois modèles, souvent combinés.
- Moindre privilège et deny by default : le refus est l'état de départ.

## Mise en pratique

Objectif : tracer les deux vérifications dans trois de tes apps, et trouver un endroit où l'une manque.

1. `apps/cours/middleware.ts` : surligne (mentalement ou dans un fichier de notes) la ligne qui **authentifie** (`getUser`) et celle qui **autorise** (la liste blanche). Note le code HTTP de chaque refus.
2. Venaball : ouvre `src/Security/Voter/` (ou équivalent). Choisis un Voter. Écris en français la règle qu'il applique : « un utilisateur avec le rôle X sur le club Y peut faire Z sur une ressource du club Y ». Trouve le contrôleur qui l'appelle (`denyAccessUnlessGranted` ou `#[IsGranted]`).
3. ARENA : `apps/arena/lib/arena/auth.ts` — lis `requireStaff`. Puis dans `actions.ts`, vérifie que **chaque** action d'écriture l'appelle. Si tu en trouves une qui ne le fait pas, c'est une action que tout utilisateur authentifié peut appeler. Corrige.
4. Le hub : `NavBarSlot.tsx` cache le lien Cours aux non-autorisés. Explique en 3 lignes pourquoi ce n'est **pas** une mesure de sécurité, et où est la vraie.
5. Chasse au « check côté client seulement » : dans `apps/*/app`, cherche des composants qui vérifient un rôle (`if (user.role === "admin")`) pour afficher un bouton. Pour chacun, trouve l'action ou la route derrière, et vérifie qu'elle refait la vérification. Si non : faille.
6. Écris pour le jury, en 5 lignes, avec un exemple de chaque : « Comment je distingue authentification et autorisation dans mes projets ».

Résultat attendu : tu vois les deux vérifications dans chaque app, tu sais où elles doivent vivre, et tu as cherché — et peut-être trouvé — une autorisation manquante.
