# 05 — Objectifs techniques

## Objectifs globaux
1. **Performance** : Lighthouse score > 90 sur toutes les apps
2. **Accessibilite** : WCAG 2.1 niveau AA minimum
3. **SEO** : Toutes les pages indexables par Google avec meta correctes
4. **Responsive** : Mobile-first, fonctionne sur tous les ecrans
5. **Maintenabilite** : Code lisible, documente, facile a reprendre

## Objectifs par app

### VEA
- Temps de chargement < 2s sur 4G
- Score SEO Lighthouse > 95
- Formulaire de contact fonctionnel avec validation
- Mediatheque avec lazy loading des images
- Accessible aux lecteurs d'ecran

### Hub
- Page ultra-legere (< 500KB total)
- Navigation claire vers toutes les sous-entites
- Animations subtiles (pas de surcharge)

### VENA
- Portfolio avec filtres par categorie
- Formulaire de demande de devis
- Integration future avec le CRM Notion

### ARENA
- Temps reel pour les scores (WebSocket a terme)
- Inscription en ligne aux tournois
- Classements dynamiques

### Interactive
- Demo interactive des solutions
- Formulaire de prise de contact rapide

## Metriques a surveiller
| Metrique | Cible | Outil |
|----------|-------|-------|
| Lighthouse Performance | > 90 | Chrome DevTools |
| Lighthouse SEO | > 95 | Chrome DevTools |
| Lighthouse Accessibility | > 90 | Chrome DevTools |
| Temps First Contentful Paint | < 1.5s | Web Vitals |
| Cumulative Layout Shift | < 0.1 | Web Vitals |
| Build time (turbo) | < 30s | Turborepo |
