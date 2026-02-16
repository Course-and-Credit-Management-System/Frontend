# Responsive Trial-and-Error Playbook

This document is a practical guide for improving responsiveness in this project using a repeatable trial-and-error process.

## Objective
Ship responsive UI changes safely without breaking behavior.

## Scope Guardrail
Only change presentation-layer code during responsive iterations:
- Tailwind classes
- Layout wrappers (`flex`, `grid`, spacing, sizing)
- Visual-only JSX structure
- CSS styling

Do not change:
- API calls
- data/state/business logic
- sort/filter/validation behavior

## Breakpoint Targets
Use these viewport widths for manual checks:
- `320px` (small phone)
- `375px` (modern phone)
- `768px` (tablet)
- `1024px` (small laptop)
- `1280px` (desktop)
- `1536px` (wide desktop)

## Trial-and-Error Workflow
1. Reproduce the layout issue at a specific breakpoint.
2. Capture baseline:
   - page
   - viewport
   - exact symptom
3. Apply one UI-only change at a time.
4. Re-test all target breakpoints.
5. Keep the change if all breakpoints pass; revert if regression appears.
6. Log outcome in the template below.

## Common Responsive Failure Patterns
- Nested scroll containers causing clipped content
- Fixed heights (`h-screen`, `h-full`) on content-heavy panels
- Split panes activated too early (`lg`) causing cramped layout
- Header/toolbars with buttons that do not wrap on mobile
- Filter rows forced into one line instead of responsive grid
- Action buttons overflowing card width on small screens

## Recommended Fix Patterns
- Prefer `min-h-screen` over forced `h-screen` when content can grow
- Move split-pane breakpoint higher (e.g., `xl`) if tablet is cramped
- Replace horizontal control rows with responsive grids
- Use `w-full` on mobile buttons; restore inline layout at larger breakpoints
- Avoid double scroll regions; keep one primary scroll container per view
- Use `truncate` only for non-critical labels; allow wrapping for content text

## Quick Verification Checklist
- No horizontal scrollbar at any target breakpoint
- Primary actions stay visible without overlap
- No clipped panels or hidden text
- Back navigation and selection views remain usable on mobile
- Dark mode preserves contrast and readability
- Keyboard focus styles remain visible

## Trial Log Template
Copy this block per experiment:

```md
### Trial <ID>
- Date:
- Screen/Page:
- Breakpoint(s):
- Problem:
- Change Made (UI only):
- Result:
- Regressions Found:
- Final Decision: Keep / Revert
- Notes:
```

## Example Trials

### Trial A01
- Date: 2026-02-16
- Screen/Page: Admin Messages
- Breakpoint(s): 768px, 1024px
- Problem: Split view too cramped; detail and list both hard to read.
- Change Made (UI only): Moved two-pane breakpoint from `lg` to `xl` and improved control wrapping.
- Result: Tablet/mobile became readable; desktop retained split experience.
- Regressions Found: None.
- Final Decision: Keep
- Notes: Use `xl` split for content-dense list/detail pages.

### Trial A02
- Date: 2026-02-16
- Screen/Page: Admin Messages detail panel
- Breakpoint(s): 375px, 768px
- Problem: Nested scroll areas clipped message body.
- Change Made (UI only): Removed inner scroll lock and adjusted container height strategy.
- Result: Full message content visible with natural page flow.
- Regressions Found: None.
- Final Decision: Keep
- Notes: Avoid multiple stacked `overflow-y-auto` containers.

## PR Notes Template (Responsive)
Use this in PR descriptions:

```md
### Responsive Changes
- Pages touched:
- UI-only changes:
- Breakpoints tested: 320 / 375 / 768 / 1024 / 1280 / 1536
- Dark mode checked: Yes/No
- Known limitations:
```

## Team Rule
If a responsive fix requires logic/state changes, stop and open a separate task for functional changes.
