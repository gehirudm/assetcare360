# Component Patterns

Specifications and code snippets for common UI components in Penpot.

## Buttons

### Sizes

| Size | Height | Padding (H) | Font Size | Border Radius |
| ---- | ------ | ------------ | --------- | ------------- |
| Small | 32px | 12px | 14px | 6px |
| Medium | 40px | 16px | 16px | 8px |
| Large | 48px | 20px | 16px | 8px |

### Variants

| Variant | Fill | Text Color | Border |
| ------- | ---- | ---------- | ------ |
| Primary | Brand color | White | None |
| Secondary | Transparent | Brand color | 1px brand |
| Ghost | Transparent | Brand color | None |
| Destructive | #EF4444 | White | None |
| Disabled | #E5E7EB | #9CA3AF | None |

### States

- **Default**: Base appearance
- **Hover**: Slightly darker fill (10% darker) or subtle background for ghost/secondary
- **Active/Pressed**: Even darker (20% darker)
- **Focused**: 2px ring offset (keyboard navigation)
- **Disabled**: Reduced opacity (0.5) or gray fill, no pointer events
- **Loading**: Spinner replaces or sits beside label

### Penpot Code Example

```javascript
// Create a primary button
const btn = penpot.createBoard();
btn.name = "Button/Primary/Medium";
btn.resize(120, 40);
btn.borderRadius = 8;
btn.fills = [{ fillColor: "#2563EB", fillOpacity: 1 }];

const label = penpot.createText("Submit");
label.fontSize = 16;
label.fontWeight = "semibold";
label.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
btn.appendChild(label);

const flex = btn.addFlexLayout();
flex.dir = "row";
flex.alignItems = "center";
flex.justifyContent = "center";
flex.horizontalPadding = 16;
flex.verticalPadding = 10;
```

## Form Inputs

### Text Input

| Property | Value |
| -------- | ----- |
| Height | 40-44px |
| Padding | 12px horizontal, 10px vertical |
| Border | 1px solid #D1D5DB |
| Border radius | 6-8px |
| Font size | 16px (prevents iOS zoom) |
| Placeholder color | #9CA3AF |
| Focus border | 2px solid brand color |
| Error border | 2px solid #EF4444 |

### Form Layout

- Label above input (not inside)
- 4px gap between label and input
- 8px gap between label+input groups
- Error text below input in red, 14px
- Helper text below input in gray, 14px
- Required indicator: red asterisk after label

## Cards

| Property | Value |
| -------- | ----- |
| Background | #FFFFFF |
| Border | 1px solid #E5E7EB or none with shadow |
| Border radius | 8-12px |
| Shadow | 0 1px 3px rgba(0,0,0,0.1) |
| Padding | 16-24px |
| Gap between cards | 16-24px |

### Card Anatomy

```
┌─────────────────────────┐
│ [Image/Visual] (optional)│
├─────────────────────────┤
│ Title (H3)              │
│ Description (Body)      │
│ Metadata (Caption/Gray) │
├─────────────────────────┤
│ Actions (Buttons/Links) │
└─────────────────────────┘
```

## Navigation

### Top Nav Bar (Desktop)

| Property | Value |
| -------- | ----- |
| Height | 56-64px |
| Background | White or brand color |
| Shadow | 0 1px 2px rgba(0,0,0,0.05) |
| Logo area | Left, max height 32px |
| Nav items | Center or right, 16px gap |
| Active indicator | Bottom border 2px or filled background |

### Sidebar (Desktop)

| Property | Value |
| -------- | ----- |
| Width | 240-280px |
| Background | #F9FAFB or brand dark |
| Item height | 40-44px |
| Item padding | 12px horizontal |
| Active item | Brand color background/text |
| Icon size | 20px, 12px gap to label |

### Bottom Tab Bar (Mobile)

| Property | Value |
| -------- | ----- |
| Height | 56px + safe area (84px total on iPhone) |
| Max items | 5 |
| Icon size | 24px |
| Label size | 10-12px |
| Active | Brand color icon + label |
| Inactive | Gray (#9CA3AF) icon + label |

## Tables

| Property | Value |
| -------- | ----- |
| Header background | #F9FAFB |
| Header font weight | Semibold |
| Row height | 48-56px |
| Cell padding | 12-16px horizontal |
| Border | 1px solid #E5E7EB between rows |
| Hover row | #F3F4F6 background |
| Selected row | Light brand color background |

## Badges / Tags

| Property | Value |
| -------- | ----- |
| Height | 20-24px |
| Padding | 6-8px horizontal |
| Font size | 12px |
| Border radius | Full (pill) or 4px |
| Font weight | Medium |

### Status Colors

| Status | Background | Text |
| ------ | ---------- | ---- |
| Success | #DCFCE7 | #166534 |
| Warning | #FEF3C7 | #92400E |
| Error | #FEE2E2 | #991B1B |
| Info | #DBEAFE | #1E40AF |
| Neutral | #F3F4F6 | #374151 |

## Modals / Dialogs

| Property | Value |
| -------- | ----- |
| Width | 400-560px (desktop), 90% (mobile) |
| Border radius | 12px |
| Padding | 24px |
| Overlay | rgba(0,0,0,0.5) |
| Shadow | 0 20px 60px rgba(0,0,0,0.15) |
| Title | H3, 20-24px bold |
| Close button | Top-right, 24px icon |
| Actions | Right-aligned, primary right |
