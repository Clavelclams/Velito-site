---
titre: "Un fichier n'est pas ce que son extension prétend"
projet: "vena"
bloc: 3
themes: ["securite-applicative", "http"]
source: "apps/vena/sql/shared-signalements-v1.sql + server action d'upload"
date: 2026-09-04
---

## Le concept

Le module de signalement est transverse à tout l'écosystème : un bouton « Signaler » présent sur VENA, VEA, le hub, ARENA, avec une table unique dans le schéma `shared` et un tag `app` pour savoir d'où vient le retour. Chaque signalement peut porter **une pièce jointe** — image ou PDF, 5 Mo maximum.

Une pièce jointe, c'est un fichier arbitraire envoyé par un utilisateur, écrit sur mon infrastructure. Trois protections, à trois endroits différents.

**La validation du contenu, pas du nom.** Le contrôle porte sur le **type MIME réel** — lu dans les octets du fichier — en plus de l'extension et de la taille. L'extension est une chaîne de caractères choisie par l'expéditeur : un fichier nommé `photo.jpg` peut contenir n'importe quoi. Seule la lecture des premiers octets dit ce que c'est vraiment.

**La validation côté serveur.** Elle est faite dans la Server Action, **avant** l'upload. Une validation dans le navigateur est du confort d'interface : elle évite à l'utilisateur d'attendre un envoi voué à l'échec, mais elle ne protège de rien — le client peut être contourné, on parle directement à l'API. La règle constante : **une validation qui n'a pas lieu sur le serveur n'existe pas.**

**Le stockage isolé et privé.** Bucket Supabase privé, avec un rangement par préfixe `user_id`. Le préfixe donne l'isolation par utilisateur, et le bucket privé fait que rien n'est accessible par une URL devinée — l'accès passe par une URL signée, à durée limitée. C'est exactement l'inverse de l'erreur que j'avais faite sur Venaball, où les fichiers déposés atterrissaient dans le dossier servi par le serveur web et étaient récupérables par URL directe, sans authentification.

Le contrôle d'accès complète le tout, côté base : `INSERT` réservé à `authenticated` — le bouton est visible par tous, mais envoyer exige un compte, ce qui est l'anti-spam le plus simple. L'auteur relit ses propres signalements, les admins voient tout, et seuls les admins changent le statut.

## Comment je l'explique au jury

« Le module de signalement accepte une pièce jointe, donc un fichier arbitraire envoyé par un utilisateur. Je valide le type MIME réel, lu dans les octets, pas seulement l'extension : l'extension est une chaîne choisie par l'expéditeur, un fichier nommé `.jpg` peut contenir tout autre chose. La validation est faite dans la Server Action avant l'upload — une validation côté navigateur est du confort d'interface, elle ne protège de rien puisqu'on peut appeler l'API directement. Le stockage est un bucket privé, rangé par identifiant d'utilisateur, accessible uniquement par URL signée. C'est la correction du schéma que j'avais mal fait ailleurs, où les fichiers déposés étaient servis directement par le serveur web. »

## La question vicieuse du jury

**« Vous acceptez des PDF. Un PDF peut contenir du JavaScript et des exploits de lecteur. Votre validation MIME ne voit rien. »**

Exact — valider le type MIME dit « c'est bien un PDF », pas « ce PDF est inoffensif ». Le format autorise du JavaScript embarqué, des actions au chargement, et il a un historique fourni de failles dans les lecteurs. Ce que mon dispositif garantit, c'est que ce fichier ne sera jamais **exécuté sur mon serveur** : il est stocké dans un bucket, jamais dans un dossier servi, jamais interprété — c'est la différence avec un `.php` déposé dans un dossier web, qui est la vraie catastrophe. Le risque résiduel est déporté sur le poste de l'administrateur qui l'ouvrira. Ce que je pourrais ajouter, par ordre de coût : servir la pièce jointe avec `Content-Disposition: attachment` et `X-Content-Type-Options: nosniff` pour qu'elle ne s'ouvre jamais dans le contexte de mon domaine ; passer un antivirus à l'upload ; ou, plus radical, n'accepter que des images et laisser les PDF de côté. Pour un module de signalement de bug où les auteurs sont des utilisateurs connectés de mon propre écosystème, j'ai jugé le risque acceptable — mais c'est un jugement sur la population d'utilisateurs, pas sur la sûreté du format, et il ne tiendrait pas sur un formulaire public.
