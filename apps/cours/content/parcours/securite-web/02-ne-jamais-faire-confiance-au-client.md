---
titre: "Ne jamais faire confiance au client : tout ce qui arrive est hostile jusqu'à preuve du contraire"
parcours: "securite-web"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Le navigateur est chez l'utilisateur. Il peut faire tout ce qu'il veut avec : modifier le HTML, désactiver le JavaScript, changer une valeur cachée, rejouer une requête, en forger une nouvelle avec `curl`. Ton formulaire, ta validation en React, ton `disabled` sur un bouton — tout ça est du **confort**, pas de la **sécurité**. La règle est absolue : **le serveur ne fait confiance à rien de ce qui vient du client.**

**Ce que le client peut envoyer, et ce que ça implique.**

- **N'importe quelle valeur dans n'importe quel champ.** Un `<select>` avec trois options ? Le serveur recevra peut-être une quatrième. `estStatutTournoi(valeur)` dans ARENA existe pour ça : le statut vient d'un `FormData`, donc on vérifie qu'il est dans la liste **avant** de l'utiliser. TypeScript ne protège de rien ici — il a disparu à la compilation.
- **N'importe quel identifiant.** Un formulaire de convocation envoie une liste d'ids de joueuses. Un client bricolé y ajoute l'id d'une joueuse d'un autre club. `ConvocationManager` ne convoque **jamais** depuis la liste reçue : il part de l'effectif réel de l'équipe et ne garde que les ids qui en font partie. **On ne valide pas ce que le client envoie ; on part de ce que le serveur sait et on intersecte.**
- **Une requête sans passer par le formulaire.** La Server Action `seConnecterAction` de cours valide l'email et la longueur du mot de passe même si le `<input required minLength={6}>` le fait déjà. Le commentaire le dit : « ne jamais faire confiance au client, même si le formulaire valide déjà côté navigateur ».
- **Une requête rejouée.** Le même POST envoyé deux fois. C'est le problème d'idempotence de la file hors-ligne Venaball (parcours API, leçon 8) — et c'est aussi un vecteur d'attaque : rejouer un « +2 au score » vingt fois.
- **Un fichier qui n'est pas ce qu'il prétend.** `photo.jpg` qui contient du PHP. Leçon 8.
- **Des en-têtes forgés.** `Host`, `Referer`, `X-Forwarded-For` — tous modifiables. `MarqueResolver` vérifie le host avec `str_ends_with` et pas `str_contains` parce qu'un host est une entrée comme une autre.

**La validation côté client sert quand même.** Elle évite un aller-retour inutile, elle donne un retour immédiat, elle guide l'utilisateur honnête — qui est 99,9 % des cas. Garde-la. Mais sache qu'elle **n'existe pas** du point de vue de la sécurité, et refais tout côté serveur.

**Valider, c'est quoi exactement.** Trois niveaux, du plus simple au plus fort :

1. **Le type et la forme** : c'est un entier, entre 0 et 300, une chaîne de moins de 40 caractères, un email avec un `@`. `max(0, min(300, (int) $data['scoreAdverse']))` sur Venaball fait les trois en une ligne.
2. **La liste fermée** : la valeur est dans un ensemble connu. Statut, rôle, type de consentement. `CHECK (statut IN (…))` en base double le contrôle applicatif.
3. **La cohérence avec ce que le serveur sait** : cet id de joueuse est bien dans cette équipe ; ce tournoi appartient bien à l'organisation de l'utilisateur ; ce `redirect_uri` est bien dans la liste blanche du client OAuth. C'est le niveau qui protège des IDOR et des open redirects.

**Le message d'erreur est aussi une sortie à surveiller.** « Cet email n'existe pas » vs « Identifiants invalides » : le premier permet d'énumérer les comptes. Une trace de pile Symfony en `APP_ENV=dev` sur un serveur public : un plan de l'application. Le serveur log le détail ; l'utilisateur reçoit le neutre.

**Le principe qui résume tout : la frontière de confiance.** Dessine une ligne autour de ton serveur et de ta base. Tout ce qui **traverse** cette ligne vers l'intérieur — formulaire, URL, en-tête, cookie, fichier, réponse d'API externe — est une entrée non fiable. Elle est validée à l'entrée, puis on lui fait confiance à l'intérieur. Une validation au mauvais endroit (après usage, ou seulement dans l'UI) est une frontière percée.

## À retenir

- Le navigateur est chez l'utilisateur : HTML, JS, valeurs, fichiers, en-têtes — tout est modifiable.
- Validation client = confort. Validation serveur = sécurité. Les deux, toujours.
- Type/forme → liste fermée → cohérence avec ce que le serveur sait. Le troisième niveau bloque IDOR et open redirect.
- Ne pas valider une liste d'ids reçue : partir de la liste serveur et intersecter.
- Messages d'erreur neutres. Le détail dans les logs.

## Mise en pratique

Objectif : contourner tes propres formulaires, et vérifier que le serveur tient.

1. Sur `cours.velito.fr/login` (ou en local), ouvre F12 → Elements. Trouve l'`<input type="password">`, supprime l'attribut `minLength` et `required`. Soumets avec un mot de passe de 2 caractères. Le serveur répond « Email valide et mot de passe (6 caractères minimum) requis » : la validation serveur a tenu.
2. F12 → Network, soumets normalement, clic droit sur la requête de l'action → Copy as fetch. Colle dans la console, modifie le body (mot de passe vide, email sans `@`), exécute. Lis chaque réponse. Tout doit être refusé proprement, sans 500.
3. ARENA (staff, local) : sur un formulaire de changement de statut de tournoi, modifie le `<select>` dans le DOM pour ajouter une option `value="PIRATE"`. Soumets. `estStatutTournoi` refuse. Puis regarde en base : `statut` a-t-il bougé ? Non.
4. Venaball : lis `ApiClubSaisieController` autour de `scoreAdverse`. Trouve la ligne `max(0, min(300, (int) …))`. Envoie via l'API (ou en test fonctionnel) `scoreAdverse: -50` puis `"abc"` puis `9999`. Résultats attendus : 0, 0, 300.
5. Chasse aux entrées non validées : dans `apps/arena/lib/arena/actions.ts`, pour chaque `formData.get(…)`, trouve la ligne qui valide (type, liste, cohérence). S'il n'y en a pas, ajoute-la. Même exercice sur un contrôleur Venaball avec `$request->request->get(…)`.
6. Vérifie les messages d'erreur : fais échouer une connexion sur chaque app. Aucun message ne doit dire si l'email existe. Vérifie que `APP_ENV=prod` sur les instances Venaball (une page d'erreur doit être sobre, sans trace).

Résultat attendu : tu as contourné tes formulaires et vu le serveur tenir — ou trouvé un endroit où il ne tenait pas, et tu l'as corrigé.
