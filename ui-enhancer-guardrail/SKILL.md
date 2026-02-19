---
name: ui-enhancer-guardrail
description: Specialized for visual and UX enhancements while strictly maintaining separation from business logic, state management, and API integrations. Use when asked to improve UI/UX without risk of breaking functionality.
---

# UI Enhancer Guardrail

This skill provides a strict "Visual Only" workflow for improving User Interface and User Experience.

## Core Mandate: Pure UI Separation

When this skill is active, you are strictly prohibited from modifying any code that handles data, state, or business logic. Your focus is exclusively on the "Presentation Layer".

###  Permitted Modifications (UI/UX Only)
- **Tailwind Classes**: Adjusting colors, spacing (padding/margin), typography, shadows, borders, and animations.
- **JSX/HTML Structure**: Reorganizing elements for better layout flow (e.g., wrapping elements in a div for flex/grid) without breaking event handlers.
- **CSS**: Adding or modifying styles in CSS/SCSS files.
- **Static Content**: Fixing typos in labels or improving micro-copy.
- **Accessibility (A11y)**: Adding `aria-labels`, `alt` text, or improving color contrast.

###  Strictly Prohibited Modifications (Logic/Data)
- **State Management**: Do NOT touch `useState`, `useReducer`, `useContext`, or any state-related hooks.
- **Lifecycle/Side Effects**: Do NOT touch `useEffect`, `useLayoutEffect`, or any lifecycle methods.
- **Event Handlers**: Do NOT modify the logic inside `onClick`, `onChange`, `onSubmit`, etc. (You may move where they are attached if restructuring JSX, but the function reference must remain intact).
- **API Integration**: Do NOT modify `fetch`, `axios`, or any `api.*` calls.
- **Business Logic**: Do NOT touch sorting, filtering, or validation algorithms.

## Workflow

1. **Scan for Logic**: Before editing a file, identify the logic sections (hooks, functions, imports) and mark them as "untouchable" in your internal plan.
2. **Apply Visual Polish**: Focus on the JSX return statement or CSS files. Use the existing design system tokens where available.
3. **Verify Integrity**: Ensure that after your changes, all original props, event handlers, and data bindings remain exactly as they were.

## When to Ask
If a desired UI enhancement requires a change to state or logic (e.g., adding a toggle that needs a new `useState`), you MUST stop and ask the user for permission to step outside the UI Guardrail.
