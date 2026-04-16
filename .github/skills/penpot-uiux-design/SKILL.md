---
name: penpot-uiux-design
description: 'Comprehensive guide for creating professional UI/UX designs in Penpot using MCP tools. Use when: creating new UI/UX designs for web/mobile/desktop, building design systems with components/tokens, designing dashboards/forms/navigation/landing pages, applying accessibility standards, following platform guidelines (iOS, Android, Material Design), reviewing or improving existing Penpot designs. Triggers: "design a UI", "create interface", "build layout", "design dashboard", "create form", "design landing page", "make it accessible", "design system", "component library".'
---

# Penpot UI/UX Design Guide

Create professional, user-centered designs in Penpot using the `penpot/penpot-mcp` MCP server and proven UI/UX principles.

## Available MCP Tools

| Tool | Purpose |
| ---- | ------- |
| `mcp__penpot__execute_code` | Run JavaScript in Penpot plugin context to create/modify designs |
| `mcp__penpot__export_shape` | Export shapes as PNG/SVG for visual inspection |
| `mcp__penpot__import_image` | Import images (icons, photos, logos) into designs |
| `mcp__penpot__penpot_api_info` | Retrieve Penpot API documentation |

## MCP Server Setup

The Penpot MCP tools require the `penpot/penpot-mcp` server running locally. For detailed installation and troubleshooting, see [setup-troubleshooting.md](./references/setup-troubleshooting.md).

### Before Setup: Check If Already Running

**Always check if the MCP server is already available before attempting setup:**

1. **Try calling a tool first**: Attempt `mcp__penpot__penpot_api_info` — if it succeeds, the server is running. No setup needed.
2. **If the tool fails**, ask the user:
   > "The Penpot MCP server doesn't appear to be connected. Is the server already installed and running?"
3. **Only proceed with setup instructions if the user confirms the server is not installed.**

### Quick Start (Only If Not Installed)

```bash
git clone https://github.com/penpot/penpot-mcp.git
cd penpot-mcp && npm install
npm run bootstrap
```

Then in Penpot: **Plugins** → **Load plugin from URL** → `http://localhost:4400/manifest.json` → Click **"Connect to MCP server"**

VS Code `settings.json`:
```json
{ "mcp": { "servers": { "penpot": { "url": "http://localhost:4401/sse" } } } }
```

## Quick Reference

| Task | Reference File |
| ---- | -------------- |
| MCP server installation & troubleshooting | [setup-troubleshooting.md](./references/setup-troubleshooting.md) |
| Component specs (buttons, forms, nav) | [component-patterns.md](./references/component-patterns.md) |
| Accessibility (contrast, touch targets) | [accessibility.md](./references/accessibility.md) |
| Screen sizes & platform specs | [platform-guidelines.md](./references/platform-guidelines.md) |

## Core Design Principles

1. **Clarity over cleverness**: Every element must have a purpose
2. **Consistency builds trust**: Reuse patterns, colors, and components
3. **User goals first**: Design for tasks, not features
4. **Accessibility is not optional**: Design for everyone
5. **Test with real users**: Validate assumptions early

### Visual Hierarchy (Priority Order)

Size → Color/Contrast → Position (top-left for LTR) → Whitespace → Typography weight

## Design Workflow

1. **Check for design system first**: Ask user if they have existing tokens/specs, or discover from current Penpot file
2. **Understand the page**: Call `mcp__penpot__execute_code` with `penpotUtils.shapeStructure()` to see hierarchy
3. **Find elements**: Use `penpotUtils.findShapes()` to locate elements by type or name
4. **Create/modify**: Use `penpot.createBoard()`, `penpot.createRectangle()`, `penpot.createText()` etc.
5. **Apply layout**: Use `addFlexLayout()` for responsive containers
6. **Validate**: Call `mcp__penpot__export_shape` to visually check your work

## Design System Handling

**Before creating designs, determine if the user has an existing design system.**

```javascript
// Discover existing design patterns in current file
const allShapes = penpotUtils.findShapes(() => true, penpot.root);
const colors = new Set();
allShapes.forEach(s => {
  if (s.fills) s.fills.forEach(f => colors.add(f.fillColor));
});
const textStyles = allShapes
  .filter(s => s.type === 'text')
  .map(s => ({ fontSize: s.fontSize, fontWeight: s.fontWeight }));
const components = penpot.library.local.components;
return { colors: [...colors], textStyles, componentCount: components.length };
```

- **If user HAS a design system**: Use their colors, spacing, typography, component patterns, naming conventions
- **If user has NO design system**: Use the default tokens below, offer to establish consistent patterns

## Key Penpot API Gotchas

- `width`/`height` are READ-ONLY → use `shape.resize(w, h)`
- `parentX`/`parentY` are READ-ONLY → use `penpotUtils.setParentXY(shape, x, y)`
- Use `insertChild(index, shape)` for z-ordering (not `appendChild`)
- Flex children array order is REVERSED for `dir="column"` or `dir="row"`
- After `text.resize()`, reset `growType` to `"auto-width"` or `"auto-height"`

## Positioning New Boards

**Always check existing boards before creating new ones** to avoid overlap:

```javascript
const boards = penpotUtils.findShapes(s => s.type === 'board', penpot.root);
let nextX = 0;
const gap = 100;
if (boards.length > 0) {
  boards.forEach(b => {
    const rightEdge = b.x + b.width;
    if (rightEdge + gap > nextX) nextX = rightEdge + gap;
  });
}
const newBoard = penpot.createBoard();
newBoard.x = nextX;
newBoard.y = 0;
newBoard.resize(375, 812);
```

**Spacing**: 100px gap between related screens, 200px+ between different flows. Align vertically, group horizontally in flow order.

## Default Design Tokens

**Use these defaults only when user has no design system.**

### Spacing Scale (8px base)

| Token | Value | Usage |
| ----- | ----- | ----- |
| `spacing-xs` | 4px | Tight inline elements |
| `spacing-sm` | 8px | Related elements |
| `spacing-md` | 16px | Default padding |
| `spacing-lg` | 24px | Section spacing |
| `spacing-xl` | 32px | Major sections |
| `spacing-2xl` | 48px | Page-level spacing |

### Typography Scale

| Level | Size | Weight | Usage |
| ----- | ---- | ------ | ----- |
| Display | 48-64px | Bold | Hero headlines |
| H1 | 32-40px | Bold | Page titles |
| H2 | 24-28px | Semibold | Section headers |
| H3 | 20-22px | Semibold | Subsections |
| Body | 16px | Regular | Main content |
| Small | 14px | Regular | Secondary text |
| Caption | 12px | Regular | Labels, hints |

### Color Usage

| Purpose | Recommendation |
| ------- | -------------- |
| Primary | Main brand color, CTAs |
| Secondary | Supporting actions |
| Success | #22C55E range |
| Warning | #F59E0B range |
| Error | #EF4444 range |
| Neutral | Gray scale for text/borders |

## Common Layouts

### Mobile Screen (375×812)

```
┌─────────────────────────────┐
│ Status Bar (44px)           │
├─────────────────────────────┤
│ Header/Nav (56px)           │
├─────────────────────────────┤
│ Content Area (Scrollable)   │
│ Padding: 16px horizontal    │
├─────────────────────────────┤
│ Bottom Nav/CTA (84px)       │
└─────────────────────────────┘
```

### Desktop Dashboard (1440×900)

```
┌──────┬──────────────────────────────────┐
│      │ Header (64px)                    │
│ Side │──────────────────────────────────│
│ bar  │ Page Title + Actions             │
│ 240px│──────────────────────────────────│
│      │ Content Grid (Cards)             │
└──────┴──────────────────────────────────┘
```

## Validating Designs

| Check | Method |
| ----- | ------ |
| Elements outside bounds | `penpotUtils.analyzeDescendants()` with `isContainedIn()` |
| Text too small (<12px) | `penpotUtils.findShapes()` filtering by `fontSize` |
| Missing contrast | `mcp__penpot__export_shape` and visually inspect |
| Hierarchy structure | `penpotUtils.shapeStructure()` to review nesting |
| Export CSS | `penpot.generateStyle(selection, { type: 'css', includeChildren: true })` |

## Design Review Checklist

- [ ] Visual hierarchy is clear
- [ ] Consistent spacing and alignment
- [ ] Typography is readable (16px+ body text)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Interactive elements are obvious
- [ ] Mobile-friendly touch targets (44×44px minimum)
- [ ] Loading/empty/error states considered
- [ ] Consistent with design system

## Tips for Great Designs

1. **Start with content**: Real content reveals layout needs
2. **Design mobile-first**: Constraints breed creativity
3. **Use a grid**: 8px base grid keeps things aligned
4. **Limit colors**: 1 primary + 1 secondary + neutrals
5. **Limit fonts**: 1-2 typefaces maximum
6. **Embrace whitespace**: Breathing room improves comprehension
7. **Be consistent**: Same action = same appearance everywhere
8. **Provide feedback**: Every action needs a response
