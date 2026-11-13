---
titre: "GET ou POST : lire ou changer"
parcours: "dojo-debutant"
ordre: 3
niveau: "debutant"
duree: 10
date: 2026-11-13
---

## Le cours

Au gymnase, il y a deux gestes possibles devant la feuille de match. La **regarder** : tu peux le faire cent fois, rien ne bouge. **Écrire dessus** : là, tu changes quelque chose d'officiel.

```jeu
{ "type": "devine", "question": "Tu ouvres la page de l'appel, puis tu touches Enregistrer. Le navigateur envoie-t-il la même sorte de demande les deux fois ?", "indice": "La première fois tu regardes, la seconde tu écris.", "reponse": "Non. Ouvrir la page est une demande GET (montre-moi). Enregistrer est une demande POST (tiens, garde ça). Même adresse, deux intentions." }
```

### Deux mots pour deux intentions

**GET** veut dire « montre-moi ». **POST** veut dire « voici des données, enregistre-les ». Ce mot s'appelle la **méthode HTTP** : c'est le premier mot que le navigateur dit au serveur pour annoncer ce qu'il veut faire.

Pour l'appel, une seule adresse accepte les deux. C'est écrit dans `src/Controller/Manager/PresenceController.php` :

```php
#[Route('/seances/{id}/pointage', name: 'manager_presence_seance', methods: ['GET', 'POST'], requirements: ['id' => '\d+'])]
public function pointageSeance(Request $request, Seance $seance): Response
```

```jeu
{ "type": "choix", "question": "Supprimer une séance : GET ou POST ?", "choix": ["GET, parce qu'on clique sur un lien", "POST, parce que ça change quelque chose", "Peu importe"], "bonne": 1, "explication": "Dans SeanceController, la route de suppression n'accepte que POST. Tout ce qui modifie ou efface passe par POST." }
```

### Le contrôleur trie

Plus bas dans la même méthode, le contrôleur pose la question :

```php
if ($request->isMethod('POST')) {
    $token = (string) $request->request->get('_token', '');
    if (!$this->isCsrfTokenValid('pointage_seance_' . $seance->getId(), $token)) {
        $this->addFlash('error', 'Jeton de sécurité invalide.');
        return $this->redirectToRoute('manager_seance_show', ['id' => $seance->getId()]);
    }
```

Si c'est un POST, il enregistre l'appel puis te renvoie vers la fiche de la séance. Sinon, il affiche simplement la grille.

```jeu
{ "type": "trous", "consigne": "Complète la question que le contrôleur pose avant d'enregistrer l'appel.", "code": "if ($request->isMethod('___')) {", "choix": ["GET", "POST", "SAVE", "SEND"], "bonne": 1, "explication": "On n'enregistre que si la demande est un POST. Un simple GET ne doit jamais rien modifier." }
```

### Le tampon sur la feuille

Une feuille de match sans le tampon du club, l'arbitre la refuse : rien ne prouve qu'elle vient de chez nous. Le **jeton CSRF** est ce tampon. C'est un code que notre site glisse dans son propre formulaire, dans un champ caché (`hidden`). Regarde `templates/manager/presence/pointage.html.twig` :

```twig
<form method="post" id="form-pointage">
    <input type="hidden" name="_token" value="{{ csrf_token(csrf_id) }}">
```

Quand le formulaire revient, `isCsrfTokenValid` compare le tampon. Pas le bon ? Message « Jeton de sécurité invalide », et rien n'est enregistré. Sans ça, un autre site pourrait envoyer un faux appel à ta place pendant que tu es connecté.

```jeu
{ "type": "vraifaux", "affirmation": "Le jeton CSRF sert à vérifier ton mot de passe.", "vrai": false, "explication": "Il ne dit pas qui tu es. Il prouve que le formulaire a été fabriqué par notre site, et pas par un site pirate." }
```

```jeu
{ "type": "ordre", "consigne": "Remets l'appel de la coach dans l'ordre.", "etapes": ["Elle ouvre la page de l'appel (GET)", "Le site affiche la grille avec le jeton caché", "Elle coche les présentes et touche Enregistrer (POST)", "Le contrôleur vérifie le jeton", "Il enregistre les présences", "Il la renvoie vers la fiche de la séance"], "explication": "Le jeton part avec la page, revient avec le formulaire, et il est vérifié avant toute écriture." }
```

## À retenir

- **GET** = regarder. **POST** = modifier.
- Une même adresse peut accepter les deux : le contrôleur trie avec `isMethod('POST')`.
- Tout ce qui crée, change ou supprime passe par POST.
- Le **jeton CSRF** est le tampon qui prouve que le formulaire vient de notre site.
- Jeton invalide : on n'enregistre rien et on prévient.

## Mise en pratique

Connecte-toi, ouvre la page d'appel d'une séance, puis affiche le code source de la page (Ctrl+U). Cherche (Ctrl+F) le mot `_token`.

C'est réussi quand tu as trouvé la ligne `<form method="post"` et la ligne du champ caché `_token`, et que tu peux dire à voix haute : « j'ai ouvert cette page en GET, et ce formulaire partira en POST avec son tampon ».
