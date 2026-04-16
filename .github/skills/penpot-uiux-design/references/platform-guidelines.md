# Platform Guidelines & Screen Sizes

Breakpoints, safe areas, and platform-specific design specs.

## Screen Sizes

### Mobile Devices

| Device | Size | Scale | Points |
| ------ | ---- | ----- | ------ |
| iPhone SE | 375×667 | 2x | Small phone |
| iPhone 14 | 390×844 | 3x | Standard phone |
| iPhone 14 Pro Max | 430×932 | 3x | Large phone |
| Android small | 360×640 | - | Budget devices |
| Android standard | 360×800 | - | Common Android |
| Android large | 412×915 | - | Flagship Android |

**Design at 375×812** for standard mobile (covers most phones).

### Tablets

| Device | Size | Orientation |
| ------ | ---- | ----------- |
| iPad Mini | 744×1133 | Portrait |
| iPad Air/Pro 11" | 820×1180 | Portrait |
| iPad Pro 12.9" | 1024×1366 | Portrait |
| Android tablet | 800×1280 | Portrait |

**Design at 768×1024** for standard tablet.

### Desktop

| Breakpoint | Width | Usage |
| ---------- | ----- | ----- |
| Small laptop | 1280px | Minimum desktop target |
| Standard | 1440px | Most common design width |
| Wide | 1920px | Full HD monitors |

**Design at 1440×900** for standard desktop.

## Responsive Breakpoints

| Name | Width | Target |
| ---- | ----- | ------ |
| Mobile | < 640px | Phones |
| Tablet | 640–1024px | Tablets, small laptops |
| Desktop | 1024–1440px | Laptops, monitors |
| Wide | > 1440px | Large monitors |

## iOS Guidelines (Apple HIG)

### Safe Areas

| Area | Size |
| ---- | ---- |
| Status bar | 44-59px (Dynamic Island: 59px) |
| Navigation bar | 44px |
| Tab bar | 49px |
| Home indicator | 34px |
| Total bottom safe | 83px (tab bar + home indicator) |

### Key Specs

- Touch target: 44×44pt minimum
- Default font: SF Pro (system)
- Body text: 17pt
- Navigation title: 17pt semibold
- Large title: 34pt bold
- Corner radius: 10-14pt for cards, continuous corners
- Standard spacing: 16pt margins, 8pt element spacing
- Tab bar max items: 5

### iOS Patterns

- Pull to refresh for lists
- Swipe actions on list items
- Modal sheets from bottom
- Alert dialogs centered
- Back navigation: left arrow + label

## Android / Material Design 3

### Key Specs

- Touch target: 48×48dp minimum
- Default font: Roboto (system)
- Body text: 14-16sp
- Headline: 24-32sp
- Corner radius: 12-16dp (Material 3 uses rounded corners)
- Standard spacing: 16dp margins, 8dp element spacing
- Navigation bar height: 56dp (64dp with subtitle)
- Bottom nav height: 80dp
- FAB size: 56×56dp (standard), 96×96dp (large)

### Android Patterns

- FAB for primary action
- Bottom sheet for options
- Snackbar for brief messages (bottom, auto-dismiss)
- Top app bar scrolls with content or stays fixed
- Navigation drawer for 5+ destinations

## Web-Specific

### Content Width

- Max content width: 1200-1440px
- Then center with margin auto
- Sidebar: 240-320px
- Main content: remaining space

### Scroll Behavior

- Fixed header: always visible
- Sticky sidebar: stays in viewport while scrolling main content
- Infinite scroll or pagination for long lists

### Common Web Patterns

| Pattern | Usage |
| ------- | ----- |
| Breadcrumbs | Deep hierarchical navigation |
| Tabs | Switch between related views |
| Accordion | Collapsible sections |
| Data table | Structured data display |
| Dashboard grid | Metric cards + charts |
| Wizard/Stepper | Multi-step processes |

## Grid Systems

### 8px Grid

All spacing, sizing, and positioning should align to an 8px grid:

| Multiple | Value | Usage |
| -------- | ----- | ----- |
| 0.5× | 4px | Tight spacing, icon padding |
| 1× | 8px | Minimum gap |
| 2× | 16px | Standard padding |
| 3× | 24px | Section gap |
| 4× | 32px | Large gap |
| 6× | 48px | Page padding |
| 8× | 64px | Header height |

### Column Grid (Desktop)

| Grid | Columns | Gutter | Margin |
| ---- | ------- | ------ | ------ |
| 12-column | 12 | 24px | 32-80px |
| Content centered | 12 | 24px | auto (max-width) |

### Column Grid (Mobile)

| Grid | Columns | Gutter | Margin |
| ---- | ------- | ------ | ------ |
| 4-column | 4 | 16px | 16px |

## Design File Organization

### Naming Convention

- Pages: `01 - Login`, `02 - Dashboard`, `03 - Settings`
- Frames: `Desktop/Login`, `Mobile/Login`
- Components: `Button/Primary/Default`, `Input/Text/Focus`
- Use `/` as separator for variant hierarchy

### Board Organization

Arrange boards in user flow order:

```
[Login] → [Dashboard] → [Detail] → [Settings]
  375       1440          1440        1440
```

Group related screens vertically:
```
Desktop: [Login] [Dashboard] [Profile]
Mobile:  [Login] [Dashboard] [Profile]   (below, aligned)
```
