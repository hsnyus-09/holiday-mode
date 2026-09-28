# Holiday Mode

A TypeScript library that adds holiday effects to web pages. It works without any additional framework. It renders a moon, rabbit, confetti, and holiday banner in the DOM, and you can stop, restart, or remove the effects with `pause()`, `resume()`, and `destroy()`.

## Quick Start

Use Node.js 22 LTS (22.12 or later).

```bash
npm ci
npm run dev
```

The default development server URL is `http://127.0.0.1:5175`.

## Usage

```ts
import { createHolidayMode } from "holiday-mode";

const holiday = createHolidayMode({
  target: "#stage",
  preset: "chuseok",
  effects: ["moon", "rabbit", "confetti", "holiday-banner"],
  message: "Wishing you a bountiful Chuseok",
  intensity: 0.72,
  colors: { accent: "#b6e65f" },
  durationMs: 8000
});

holiday.pause();
holiday.resume();
holiday.destroy();
```

You can import the module on the server as well, but effect creation must be called in the browser.

```ts
if (typeof window !== "undefined") {
  createHolidayMode({ preset: "winter" });
}
```

## API

### `createHolidayMode(options?)`

Returns a `HolidayController`.

```ts
interface HolidayController {
  readonly element: HTMLElement;
  readonly status: "running" | "paused" | "destroyed";
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

| Option | Value |
| --- | --- |
| `target` | An `HTMLElement` or CSS selector string. Defaults to `document.body`. |
| `preset` | `chuseok`, `seollal`, `winter`, or a `HolidayPreset` object |
| `effects` | `moon`, `rabbit`, `confetti`, `holiday-banner` |
| `message` | Text rendered in the DOM with `textContent`. Maximum 96 characters. |
| `intensity` | A number from `0` to `1`. Controls confetti density. |
| `colors` | Set any of the following colors: `background`, `moon`, `accent`, `secondary`, `text` |
| `durationMs` | Clamped to between 1 and 60 seconds. Defaults to 12 seconds. |
| `respectReducedMotion` | Whether to respect `prefers-reduced-motion`. Defaults to `true`. |
| `pauseWhenHidden` | Whether to pause automatically when the tab is hidden. Defaults to `true`. |
| `immersive` | Applies a darker overlay to the background. Defaults to `false`. |

Exports `createHolidayMode`, `presets`, `seasonalPresets`, and the related TypeScript types.

## Lifecycle and Accessibility

`destroy()` cleans up the DOM it created, timers, and event listeners. Shared styles are also removed when the last effect is removed. `pause()` and `resume()` are safe to call repeatedly.

By default, the library respects the reduced-motion setting, and its effects do not intercept page clicks or touch input. Banner text is announced with `aria-live="polite"`.

## Build and Release

```bash
npm run build
npm run preview
```

For static hosting, upload only the contents of `demo-dist/`. The library and type declarations are generated in `dist/`.

`npm pack` builds the library and creates a `.tgz` package.

```bash
npm pack
```

## Tests

Install Chromium before running browser tests for the first time.

```bash
npx playwright install chromium
npm run check
npm run pack:smoke
```

`npm run check` includes browser tests and a dependency security check. `npm run pack:smoke` installs the package to verify its API and type declarations.

## Documentation

[Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Changelog](CHANGELOG.md) · [License](LICENSE)
