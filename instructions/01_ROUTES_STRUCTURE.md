# 01 — Structure des routes par application

## VEA (vea.velito.com) — Priorite 1
```
/                    -> Accueil (hero, presentation, derniers evenements)
/evenements          -> Liste des evenements
/evenements/[slug]   -> Detail d'un evenement
/equipe              -> Presentation de l'equipe/bureau
/partenaires         -> Logos et liens partenaires
/mediatheque         -> Photos et videos des evenements
/contact             -> Formulaire de contact
/mentions-legales    -> Mentions legales obligatoires
```

## Hub (velito.com) — Priorite 2
```
/                    -> Landing page ecosysteme Velito
/vea                 -> Redirect vers vea.velito.com
/vena                -> Redirect vers vena.velito.com
/arena               -> Redirect vers arena.velito.com
/interactive         -> Redirect vers interactive.velito.com
/a-propos            -> Presentation de Velito et Clavel
/contact             -> Contact general
```

## VENA (vena.velito.com) — Priorite 3
```
/                    -> Page vitrine agence
/services            -> Liste des services proposes
/realisations        -> Portfolio des projets
/contact             -> Formulaire de contact / devis
/mentions-legales    -> Mentions legales
```

## ARENA (arena.velito.com) — Priorite 4
```
/                    -> Accueil plateforme tournois
/tournois            -> Liste des tournois
/tournois/[slug]     -> Detail + inscription
/classement          -> Classements et stats
```

## Interactive (interactive.velito.com) — Priorite 5
```
/                    -> Page de presentation de l'offre
/solutions           -> Solutions pour bars et MJC
/demo                -> Demande de demo
/contact             -> Contact
```

## Notes
- Toutes les apps utilisent l'App Router de Next.js
- Chaque route = un dossier dans `app/` avec un `page.tsx`
- Les layouts sont imbriques : layout global > layout par section
