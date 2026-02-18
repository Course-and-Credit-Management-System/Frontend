# UniPortal Copilot Instructions

Follow these standards for all code generation and project assistance.

## Business Rules
- **Credit Limit**: Enforce the 24-credit ceiling unless an admin override is detected.
- **Priority**: Always prioritize `is_retake: true` enrollments over new course selections.
- **Authentication**: Ensure `must_reset_password` checks are handled at the route level.

## Styling & UI
- **Primary Brand**: `#0d4a8f` (BG/Buttons), `#ffc20e` (Alerts).
- **Table Design**: `bg-[#0d4a8f]` headers with white text. Alternating row colors (`#ffffff` and `#f5f5f5`).
- **Icons**: Use Google Material icons via standard `material-icons-outlined` classes.

## Architecture
- Use **Generics** in API requests to maintain type safety.
- Centralize all constants and interfaces in [types.ts](types.ts).
- Refer to [lib/api.ts](lib/api.ts) for all backend communication logic.
