---
description: "Guidelines and rules for implementing and managing react-i18next multi-language support (English and Myanmar) in React components."
applyTo:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.js"
---

# React i18next Localization (English & Myanmar)

When asked to implement, configure, or update multi-language features, always adhere strictly to the following conventions:

## 1. Project Initialization & Structure
- **Translation Files**: Place the translation JSON files inside `src/locales/`. 
  - English: `src/locales/en.json`
  - Myanmar: `src/locales/my.json`
- **Configuration File**: Ensure the configuration file is created or exists at `src/i18n.ts` (or `.js`).
- **Initialization**: The configuration file MUST be imported into the main app entry file (usually `src/index.js` or `src/main.tsx`).

## 2. Component Implementation
- Always use the `useTranslation` hook from `react-i18next` inside functional components.
- **Key Naming & Values**: Prefer using the exact readable English text as the translation key (e.g. `t("Course Selection")`). Do NOT blindly convert English UI text into `snake_case` keys (like `t("course_selection")`). If you must use `snake_case` keys, you MUST ensure that the `en.json` file maps that key to the proper grammatically correct English string (`"course_selection": "Course Selection"`), NEVER to the `snake_case` string.
- **Dynamic Statuses**: When rendering dynamic statuses from the backend (like a FastAPI `status: "Failed"` or `status: "Pending"`), dynamically map the translation key (e.g., `t(\`status.${status.toLowerCase()}\`)`). Ensure the corresponding keys exist in both `en.json` and `my.json`.

## 3. Typography & UI Restraints
- **Burmese Font Enforcement**: For any Myanmar language display, ALWAYS enforce the use of **Noto Sans Myanmar** (Google Fonts, SIL OFL 1.1). 
- Ensure that when the language language context switches to `my`, CSS or Tailwind classes apply `font-family: 'Noto Sans Myanmar', sans-serif;`.
