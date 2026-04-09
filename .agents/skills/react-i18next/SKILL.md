---
name: react-i18next-localization
description: "Workflow for implementing and managing react-i18next multi-language (English and Myanmar) features in React/Vite projects."
---

# react-i18next Localization Workflow

This skill provides a structured workflow for properly adding and maintaining multi-language support (English `en` and Myanmar `mm`) using `react-i18next` inside this workspace.

## Setup & Prerequisites (One-Time Execution)
If the project does not have localization initialized yet, ensure the following steps are performed:
1. **Dependencies**: Ensure `i18next`, `react-i18next`, `i18next-browser-languagedetector`, and `i18next-http-backend` are installed.
2. **Configuration**: Ensure a main `src/i18n.ts` exists and is imported into the app entry point.
3. **Translation Dictionaries**: Ensure JSON files are created (e.g., `public/locales/en/translation.json` and `public/locales/mm/translation.json`).

## Scenario Workflow: Localizing a React Component

When tasked with localizing a component (e.g. converting a static dashboard to support English and Myanmar languages), strictly follow these steps:

### Step 1: Identify Hardcoded Strings
- Read the target React component (e.g., `CourseDetails.tsx` or `AdminDashboard.tsx`).
- Identify all user-facing hardcoded text, including headers, buttons, error messages, placeholders, and tooltips.

### Step 2: Update Translation Files
- Open `public/locales/en/translation.json` and `public/locales/mm/translation.json`.
- Add logical, context-aware key-value pairs for the identified strings based on the feature being edited.
- *Note:* For Myanmar (`mm`) strings, ensure natural phrasing and correct Unicode spelling. If unsure about complex technical jargon translation, leave English as a fallback or flag it for review by the user.

### Step 3: Implement `useTranslation` Hook
- Import the hook at the top of the file: `import { useTranslation } from 'react-i18next';`
- Initialize it inside the component: `const { t } = useTranslation();`
- Replace hardcoded strings with `t('keyName')`.

### Step 4: Handle Dynamic Content (Interpolation)
- Never concatenate translation strings like `t("hello") + " " + user.name`.
- Use the built-in interpolation. 
  - English: `{"welcomeMessage": "Welcome, {{name}}!"}`
  - Component: `{t('welcomeMessage', { name: user.name })}`

### Step 5: Verify Responsive Design & Formatting
- Myanmar text can often render differently in length and vertical height compared to English. 
- Ensure UI boundaries, padding, and flexbox containers do not break when the language switches format.

## Language Switching Implementation
When asked to build or edit language controls:
1. Ensure the `LanguageSwitcher` uses `const { i18n } = useTranslation();`.
2. Toggle logic should trigger: `i18n.changeLanguage(selectedLang)`.
3. If not using `i18next-browser-languagedetector`, ensure the active language state persists across reloads via `localStorage`.

---

**Completion Checks:**
- [ ] No hardcoded text inside the `.tsx` block directly.
- [ ] Both `en` and `mm` JSON files contain matching key names.
- [ ] Complex interpolations (`{value}`) are handled cleanly by `i18next`.
- [ ] Component compiles successfully via Vite.