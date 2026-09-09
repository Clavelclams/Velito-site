---
titre: "VENA — Velito Expertise Numérique Amiens"
avancement: 60
statut: "en prod"
maj: 2026-09-04
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

## État d'avancement honnête

Le site est en ligne, le formulaire de contact fonctionne, le module de signalement est opérationnel et branché sur les autres apps.

Limites :
- **Aucun test.**
- Les PDF sont acceptés en pièce jointe sans analyse de contenu : le fichier n'est jamais exécuté côté serveur, mais le risque est déporté sur le poste de l'admin qui l'ouvre.
- Le contenu éditorial du site est mince par rapport à ce que l'activité commerciale demanderait.

## Prochaines étapes

1. Servir les pièces jointes avec `Content-Disposition: attachment` et `X-Content-Type-Options: nosniff`.
2. Étoffer le contenu commercial (références, offres, cas clients).
3. Brancher une alerte sur les nouveaux signalements plutôt que d'attendre une consultation du back-office.
