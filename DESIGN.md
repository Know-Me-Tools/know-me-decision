# DESIGN — know-me-decision

Owner: `ui-ux-designer` role. This file is the **design authority** for the surfaces this repo owns: the `ui://decide/review-card` MCP App and the operator-panel specification. The incumbent source is the KnowMe brand system used in `docs/architecture/knowme-decision-layer.html`. The tokens below are copied from it, not invented. Recommendations from `ui-ux-pro-max` go in `design-system/`; Stitch output goes in `DESIGN.stitch.md`. Neither overwrites this file without authorization.

## Surface mode

Both surfaces are **Operate** mode (variance 3–4, motion 2–3, density 6–8). These are decision tools used under time pressure, often in clinical contexts. They should read as calm, legible and trustworthy, never persuasive.

## Tokens (incumbent: KnowMe)

| Token | Light | Dark |
|---|---|---|
| `--canvas` | `#F5F6F8` | `#0B0F14` |
| `--chrome` | `#FFFFFF` | `#111620` |
| `--surface` | `#EBEEF2` | `#161D29` |
| `--raised` | `#FFFFFF` | `#1C2535` |
| `--fg` | `#0B0F14` | `#E8EDF3` |
| `--fg-sub` | `#414B5A` | `#A7B0BC` |
| `--fg-faint` | `#6B7280` | `#8A93A3` |
| `--ember` (brand accent) | `#D2461F` | `#FF6A3D` |
| `--cyan` / `--green` / `--amber` / `--red` | `#0A7F9C` / `#15803D` / `#B45309` / `#B91C1C` | taken from the report's dark block |

- **Type:** Space Grotesk (display), Inter (UI), Roboto (prose), JetBrains Mono (ids and hashes).
- **Radius:** 12px (8px small).

## Semantic mapping (decision outcomes)

- `Escalate`: red, and never styled as an error the user can dismiss.
- `Review`: amber.
- `Act`: green.
- Ember is the brand accent and must **not** be used to mean an outcome.
- Every outcome also has a text label and an icon. Color is never the only signal.

## MCP App constraints (these override brand defaults)

- **Host theming wins.** Apply the host's style variables, theme and fonts first (`applyHostStyleVariables`, `applyDocumentTheme`, `applyHostFonts`). The KnowMe tokens above are fallbacks only.
- **Self-contained bundle.** One HTML file (singlefile build). No external network, fonts or CDNs unless declared in `_meta.ui.csp`, and the default is none: PHI must never leave the locality.
- **Degradation.** Must render inside a sandboxed iframe at narrow inline widths and in fullscreen. Hosts without MCP Apps support get the same content as text in the tool result.
- **Accessibility.** WCAG 2.2 AA: keyboard-operable confirm and override, visible focus, reduced motion honored.

## Open questions (resolve with `/teach-impeccable` and an ADR)

1. Review-card stack: HTMX/Alpine (PLAYBOOK M6) vs. vanilla or React on `@modelcontextprotocol/ext-apps`. This needs an ADR.
2. Brand personality and anti-references for clinical surfaces.
3. Whether the operator panel adopts The Boss's own design system or these tokens.
