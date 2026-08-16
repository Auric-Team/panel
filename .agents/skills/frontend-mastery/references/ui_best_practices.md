# Modern UI/UX Best Practices & Design Tokens

## 1. Color System & Accessibility
- **Contrast Ratio**: Ensure WCAG AA compliance (minimum 4.5:1 for normal text, 3:1 for large text/icons).
- **Dark Mode Strategy**: Use CSS semantic variables (e.g. `--background`, `--card`, `--foreground`, `--primary`, `--border`) to ensure consistent theming.
- **Feedback States**: Always provide visual states for:
  - Default
  - Hover
  - Active/Focus-visible
  - Disabled (with clear cursor indicators)
  - Loading / Pending (spinners or pulse skeletons)

## 2. Typography Hierarchy
- Headlines: Bold/Semibold with tight tracking (`tracking-tight`).
- Body: 14px–16px (`text-sm` or `text-base`), relaxed line height (`leading-relaxed`).
- Microcopy/Captions: 12px (`text-xs`), muted foreground colors for visual hierarchy.

## 3. Micro-Interactions Checklist
- Use smooth easing transitions (`cubic-bezier(0.4, 0, 0.2, 1)`).
- Add subtle shadow lifts on hover: `hover:shadow-md transition-shadow`.
- Animate dropdowns and modals with scale & fade transitions.
