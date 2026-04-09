---
description: "Applies the i18n-translator agent to localize a specific frontend page based on its URL."
---

@i18n-translator Please localize the React component associated with this frontend URL: {{url}}.

1. Identify the exact `.tsx` file that serves this route (e.g. from `pages/`).
2. Follow your `i18n-translator` core directives to extract all hardcoded English UI text displayed to the user.
3. Update the translation files ensuring English is in `public/locales/en/translation.json` and Myanmar (Burmese) is in `public/locales/my/translation.json`. Make sure the value for the English keys is actually readable Title Case/Sentence Case English, NOT `snake_case` variable names! Let the default English `t('Readable Text')` keys remain raw readable strings exactly.
4. Inject `import { useTranslation } from 'react-i18next';` and replace the original strings with `t(...)` bindings, preferring exact English strings as keys.
5. Ensure the layout and typography requirements (like 'Noto Sans Myanmar') are mapped for the Myanmar string rendering.

Here is the URL to process: {{url}}
