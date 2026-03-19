# 08 — Design System Velito

## Philosophie
Un design system = un ensemble de regles visuelles partagees entre toutes les apps.
Ca garantit que VEA, VENA, Hub, ARENA et Interactive ont un air de famille
tout en ayant chacun leur identite.

## Couleurs

### Palette commune Velito
```
Noir principal   : #0A0A0A
Blanc            : #FAFAFA
Gris texte       : #6B7280
Gris bordure     : #E5E7EB
```

### Couleurs par entite (a confirmer avec la charte graphique)
| Entite | Couleur primaire | Utilisation |
|--------|-----------------|-------------|
| Velito (Hub) | #1E40AF (bleu profond) | Identite globale |
| VEA | A definir | Esport, dynamique |
| VENA | A definir | Pro, confiance |
| ARENA | A definir | Competition, energie |
| Interactive | A definir | Fun, accessible |

## Typographie
- **Titres** : font-bold, tailles responsives (text-2xl a text-5xl)
- **Corps** : text-base (16px), leading-relaxed
- **Police** : Inter (ou celle definie par la charte) — importee via `next/font`

## Espacements
Tailwind utilise un systeme base sur des multiples de 4px :
- `p-1` = 4px, `p-2` = 8px, `p-4` = 16px, `p-8` = 32px
- Regle : toujours utiliser les classes Tailwind, jamais de valeurs custom

## Composants partages (packages/ui)
Ces composants sont dans `packages/ui/` et utilisables par TOUTES les apps :

| Composant | Role | Fichier |
|-----------|------|---------|
| Button | Bouton avec variantes (primary, secondary, ghost) | `Button.tsx` |
| Container | Wrapper avec max-width et padding | `Container.tsx` |
| Heading | Titre avec niveaux (h1-h4) | `Heading.tsx` |
| Card | Carte generique (evenements, projets) | `Card.tsx` |
| Input | Champ de formulaire style | `Input.tsx` |
| Footer | Footer commun | `Footer.tsx` |

## Responsive breakpoints (Tailwind defaults)
| Prefix | Min-width | Cible |
|--------|-----------|-------|
| (none) | 0px | Mobile |
| `sm:` | 640px | Petit ecran |
| `md:` | 768px | Tablette |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Grand ecran |

## Regle d'or
Mobile first : on code d'abord pour mobile, puis on ajoute les styles pour les plus grands ecrans avec les prefixes `md:`, `lg:`, etc.
