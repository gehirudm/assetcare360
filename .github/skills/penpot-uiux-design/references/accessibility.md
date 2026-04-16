# Accessibility Guidelines

WCAG 2.1 AA compliance standards for Penpot designs.

## Color Contrast

### WCAG AA Requirements

| Element | Minimum Ratio | Example |
| ------- | ------------- | ------- |
| Normal text (<18px) | 4.5:1 | #595959 on white = 4.56:1 ✓ |
| Large text (≥18px bold or ≥24px) | 3:1 | #767676 on white = 4.54:1 ✓ |
| UI components & icons | 3:1 | Borders, icons against background |
| Non-text contrast | 3:1 | Charts, focus indicators |

### WCAG AAA Requirements (Aspirational)

| Element | Minimum Ratio |
| ------- | ------------- |
| Normal text | 7:1 |
| Large text | 4.5:1 |

### Quick Contrast Check

Good neutral text colors on white (#FFFFFF):

| Color | Ratio | Use for |
| ----- | ----- | ------- |
| #000000 | 21:1 | Maximum contrast |
| #111827 | 18.4:1 | Primary text |
| #374151 | 10.7:1 | Secondary text |
| #6B7280 | 5.0:1 | Tertiary text (large only at AA) |
| #9CA3AF | 2.9:1 | Placeholder only (fails AA) |

### Tips

- Never rely on color alone to convey information (add icons, patterns, or text)
- Test designs in grayscale to verify visual hierarchy still works
- Ensure link text is distinguishable from body text (underline or 3:1 contrast + non-color indicator)

## Touch Targets

### Minimum Sizes

| Platform | Minimum | Recommended |
| -------- | ------- | ----------- |
| iOS (Apple HIG) | 44×44px | 44×44px |
| Android (Material) | 48×48dp | 48×48dp |
| Web (WCAG 2.5.8) | 24×24px | 44×44px |

### Spacing Between Targets

- Minimum 8px gap between interactive elements
- Recommended 12px gap for frequently-used controls
- Adjacent targets should not overlap hit areas

### Common Mistakes

- Icon buttons too small (use 44px container even for 24px icon)
- Text links too close together in lists
- Close buttons in corners without sufficient padding

## Typography for Accessibility

### Minimum Sizes

| Context | Minimum Size |
| ------- | ------------ |
| Body text | 16px |
| Secondary text | 14px |
| Captions / labels | 12px (sparingly) |
| Never below | 11px |

### Line Height

| Text Size | Line Height |
| --------- | ----------- |
| Body (16px) | 1.5 (24px) |
| Headings | 1.2–1.3 |
| Small text | 1.5–1.6 |

### Readability

- Maximum line length: 60-80 characters (measure)
- Paragraph spacing: at least 1.5× font size
- Avoid all-caps for body text (use for short labels only)
- Left-align text (avoid justified for body content)
- Use sufficient font weight (400+ for body, 300 minimum)

## Focus Indicators

### Requirements

- Visible focus ring on all interactive elements
- 2px minimum thickness
- 3:1 contrast against adjacent colors
- Must not be obscured by other elements

### Recommended Style

```
outline: 2px solid #2563EB;
outline-offset: 2px;
```

### Focus Order

- Logical reading order (left→right, top→bottom in LTR)
- Modal focus trap: Tab cycles within modal
- Skip navigation link for keyboard users

## Semantic Structure

### Heading Hierarchy

- One H1 per page/screen
- Don't skip levels (H1 → H3 without H2)
- Headings describe the section content
- Use visual size AND semantic level together

### Landmarks

Map visual sections to ARIA landmarks:

| Visual Section | ARIA Role |
| -------------- | --------- |
| Site header | `banner` |
| Main content | `main` |
| Navigation | `navigation` |
| Search | `search` |
| Sidebar | `complementary` |
| Footer | `contentinfo` |

## Form Accessibility

- Every input needs a visible label (not just placeholder)
- Group related fields with fieldset/legend
- Error messages reference the specific field
- Indicate required fields with text (not just asterisk color)
- Provide clear submission feedback

## Images & Icons

- Informative images need descriptive alt text
- Decorative images: `alt=""`
- Icon-only buttons need accessible labels
- Complex images (charts): provide text summary

## Motion & Animation

- Respect `prefers-reduced-motion`
- No auto-playing animations longer than 5 seconds
- Provide pause/stop controls for moving content
- Avoid content that flashes more than 3 times per second
