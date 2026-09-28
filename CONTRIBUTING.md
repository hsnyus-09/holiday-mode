# Contributing

## Development

```bash
npm ci
npm run dev
```

## Checks Before Submitting

```bash
npx playwright install chromium
npm run check
npm run pack:smoke
```

## Guidelines for Changes

- If you change `pause()`, `resume()`, `destroy()`, or tab state handling, update the relevant tests as well.
- Insert user-facing text with `textContent` instead of HTML.
- When adding a preset or effect, update the types, input validation, demo, and README together.
- Preserve reduced-motion settings and keyboard accessibility.

Please describe the scope of your changes and the tests you ran in the PR. If behavior changes, update the tests and documentation as well.
