# Prompt: Scaffold UniPortal Page

Use this prompt to build new pages that adhere to the UniPortal design system.

## Context
Create a React component for a new page in the University Management System.

## Implementation Rules
1. **Layout**: Must use existing `Sidebar` and `Header` components.
2. **Typography**: Headings use **Poppins** (500/600/700); Body uses **Roboto** (400).
3. **Colors**: Primary Blue `#0d4a8f`, Secondary `#1e73be`, Accent Yellow `#ffc20e`.
4. **Styling**: Tailwind CSS only. Use `rounded-[6px]` for buttons and cards.
5. **Data**: Fetch data using the `api` singleton from `lib/api.ts`. Use TypeScript interfaces from `types.ts`.

## Code Standard
- Use functional components and hooks.
- Include Loading/Error states for API calls.
- Adhere to the [UI Patterns](../skills/ui-patterns/SKILL.md).
