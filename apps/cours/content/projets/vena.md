---
titre: "VENA — Velito Expertise Numérique Amiens"
avancement: 60
statut: "en prod"
maj: 2026-10-10
---

## C'est quoi

VENA est le site de la SASU : présentation de l'agence, contact, mentions légales, plus deux modules transverses à tout l'écosystème — la gestion des **demandes de contact** et le module de **signalement** (bug report) utilisé par toutes les applications Velito.

C'est le plus petit projet du monorepo, et son intérêt technique est concentré dans ces deux modules partagés.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase, Resend pour l'envoi d'emails. Déployé sur Vercel, sur `velito.fr`.

Les tables de signalement vivent dans le schéma **`shared`**, pas dans un schéma `vena.` : le signalement est commun à toutes les apps, et chaque ligne porte un tag `app` pour savoir d'où il vient. Les pièces jointes vont dans un bucket Supabase privé, rangées sous un préfixe `user_id`.

## Les décisions techniques et POURQUOI

- **Table de signalement dans `shared`, pas dupliquée par app** : un seul back-office pour traiter tous les retours, un seul schéma à faire évoluer.
- **Bouton visible par tous, envoi réservé aux comptes connectés** : la policy `INSERT` est limitée à `authenticated`. C'est l'anti-spam le plus simple, et il ne coûte rien à qui est déjà dans l'écosystème.
- **Validation des pièces jointes côté Server Action, avant upload** : type MIME réel lu dans les octets, extension et taille. Une validation navigateur est du confort d'interface, elle ne protège de rien.
- **Bucket privé et préfixe par utilisateur** : rien n'est atteignable par une URL devinée, l'accès passe par une URL signée à durée limitée — l'inverse exact de l'erreur commise sur Venaball avec `public/uploads/`.
- **Fonction `shared.is_velito_admin()`** en `security definer` avec `search_path` figé, réutilisée par les policies.
- **2026-10-10 : Maquette « Table de marque » UNSS livrée en site statique** (`Documents/maquette/emarque-unss/`) : PWA en JavaScript vanilla, hors ligne, sans build, pour montrer à l'UNSS une feuille de match numérique avant d'investir dans un serveur. Fiche projet à part : `table-de-marque`.
- **2026-10-10 : Page « Étouvie a 70 ans » pour le centre social d'Étouvie** (`Documents/maquette/etouvie70/index.html`) : une seule page HTML + Tailwind CDN, contenus repris du compte-rendu de réunion. Accessibilité travaillée dès la maquette (texte `alt` sur les photos, `role="img"` et `aria-label` sur les emplacements photo vides, `aria-labelledby` sur chaque section, menu d'ancres), images réduites avec Pillow, crédit « Photo de la compagnie » sous les visuels, `noindex` tant que les contenus ne sont pas validés. Le droit à l'image des enfants a été signalé au client avant toute photo du quartier.
- **2026-10-10 : Les maquettes clients hébergées en multisite OVH sur velito.fr** (`tabledemarque.velito.fr`, `etouvie70.velito.fr`) : un sous-domaine par maquette, envoi par `scp`, https obligatoire (le service worker de la table de marque ne s'enregistre pas sans).

## État d'avancement honnête

Le site est en ligne, le formulaire de contact fonctionne, le module de signalement est opérationnel et branché sur les autres apps.

Limites :
- **Aucun test.**
- Les PDF sont acceptés en pièce jointe sans analyse de contenu : le fichier n'est jamais exécuté côté serveur, mais le risque est déporté sur le poste de l'admin qui l'ouvre.
- Le contenu éditorial du site est mince par rapport à ce que l'activité commerciale demanderait.
- Les deux maquettes du 10/10 (table de marque, Étouvie) sont hors du monorepo, sans git ni tests : si le dossier `Documents/maquette/` est perdu, seule la copie sur le serveur OVH reste. Toutes deux chargent Tailwind par le CDN de développement.

## Prochaines étapes

1. Servir les pièces jointes avec `Content-Disposition: attachment` et `X-Content-Type-Options: nosniff`.
2. Étoffer le contenu commercial (références, offres, cas clients).
3. Brancher une alerte sur les nouveaux signalements plutôt que d'attendre une consultation du back-office.
