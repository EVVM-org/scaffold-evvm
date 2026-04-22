# Scaffold-EVVM Redesign Plan

Generated from `ui-ux-pro-max` skill audit on 2026-04-21.

**Product classification:** Financial / Analytics Dashboard (data-dense developer tool with block explorer).
**Target style:** Dark Mode (OLED) + Data-Dense + Minimalism. Light mode kept as a first-class peer — the skill's dark-only stance is relaxed because the project already serves devs who prefer light.
**Reference:** `design-system/scaffold-evvm/MASTER.md` (design tokens, colors, typography, component specs).

## Current-state gap (summary)

| Area | Now | Target |
|---|---|---|
| Fonts | System stack + Courier New | Fira Sans (body) + Fira Code (mono/headings), self-hosted via `next/font/google` |
| Colors | `#4f46e5` + `#00ee96` + scattered status colors, 3+ overlapping variable naming conventions (`--color-bg`, `--bg-primary`, `--card-background`) | One semantic layer: `--surface-*`, `--text-*`, `--accent`, `--danger`, `--success`, `--warning`, `--border` — mapped per theme |
| Type scale | Ad-hoc (`1rem`, `2rem`, etc.) | 12/14/16/18/24/32 codified as `--fs-xs … --fs-3xl` |
| Primitives | Each page/CSS module reinvents buttons, cards, inputs, tables | Shared `components/ui/` set: Button, Card, Input, Select, Badge, Table, Stat, Code, EmptyState |
| Navigation | Flat top bar, 11 items — no active hierarchy when nested | Same top bar ≤1024px, sidebar (collapsed/expanded) at ≥1024px, grouped sections (EVVM / Explorer / Tools) |
| Pages | 14 pages styled individually | All consume the same primitives + MASTER tokens |
| A11y | Focus rings partially present; some icon-only buttons | WCAG 4.5:1 contrast verified per theme, visible 2–3px focus rings, aria-labels on copy/search/theme controls, reduced-motion respect |

## Phased migration (each phase lands on its own commit)

### Phase 1 — Foundations (≈1 PR)
1. Replace the global CSS token layer with one semantic scale (color, space, radius, shadow, type, motion). Add light + dark value sets for each.
2. Load Fira Sans + Fira Code via `next/font/google` (offline-safe, `display: swap`, no render-blocking).
3. Keep the existing `--color-*` / `--bg-*` aliases pointing at the new tokens for one release so existing CSS modules don't break.

### Phase 2 — Primitives (≈1 PR)
4. Create `components/ui/`: `Button`, `Card`, `Input`, `Select`, `Badge`, `Table`, `Stat`, `Code`, `EmptyState`, `Skeleton`, `Toast`.
5. All use the Phase-1 tokens; each has `size` + `variant` props + visible focus.

### Phase 3 — Shell & Navigation (≈1 PR)
6. Split `Navigation` into `TopBar` (mobile ≤1023px) and `Sidebar` (desktop ≥1024px).
7. Group routes: **EVVM** (Faucet, Register, Status, Payments, Treasury, Staking, Names, P2PSwap) · **Explorer** (EVVMScan) · **Tools** (Config).
8. Persistent network badge, wallet, theme toggle. Breadcrumbs for `/evvmscan/*` and `/evvm/*`.

### Phase 4 — Page migration (chunked, 2–3 PRs)
9. **EVVMScan** (already closest to target): fold into new primitives, add loading skeletons + empty states.
10. **Payments + Staking + NameService + P2PSwap**: migrate their SigConstructor components to the new `Input` / `Button` / `Card`. Unify the "result card" pattern that shows signed data.
11. **Faucet + Register + Status + Treasury + Config + Home**: same treatment, smaller surfaces.

### Phase 5 — Polish (≈1 PR)
12. A11y sweep: focus visible, keyboard nav, aria-live for transaction feedback, `prefers-reduced-motion`.
13. Motion tokens (150–300ms ease-out enter, ease-in exit) applied uniformly.
14. Side-by-side light/dark screenshots in README.

## Non-goals

- No new dependencies beyond `next/font` (already implicit via Next 15).
- No rewrite to Tailwind/shadcn — keeping CSS modules is intentional (matches the current codebase; avoids a huge diff). If we ever want Tailwind later, the token layer is already compatible.
- No behavior changes to signature/transaction logic — purely presentational.

## How to consume this plan

- When building a specific page, read `design-system/scaffold-evvm/MASTER.md` first. If `design-system/scaffold-evvm/pages/<page>.md` exists, its rules override MASTER.
- Start with Phase 1. The downstream phases all depend on the token + font layer landing first.
