# Holiday Mode

웹 페이지에 명절 효과를 얹는 TypeScript 라이브러리입니다. 별도 프레임워크 없이 사용할 수 있습니다. 달, 토끼, 색종이, 명절 배너를 DOM에 렌더링하고 `pause()`, `resume()`, `destroy()`로 효과를 멈추거나 다시 시작하고 제거할 수 있습니다.

## 빠른 시작

Node.js 22 LTS(22.12 이상)를 사용합니다.

```bash
npm ci
npm run dev
```

개발 서버 기본 주소는 `http://127.0.0.1:5175`입니다.

## 사용법

```ts
import { createHolidayMode } from "holiday-mode";

const holiday = createHolidayMode({
  target: "#stage",
  preset: "chuseok",
  effects: ["moon", "rabbit", "confetti", "holiday-banner"],
  message: "풍요로운 한가위 보내세요",
  intensity: 0.72,
  colors: { accent: "#b6e65f" },
  durationMs: 8000
});

holiday.pause();
holiday.resume();
holiday.destroy();
```

서버에서도 모듈을 가져올 수 있지만, 효과 생성은 브라우저에서 호출해야 합니다.

```ts
if (typeof window !== "undefined") {
  createHolidayMode({ preset: "winter" });
}
```

## API

### `createHolidayMode(options?)`

`HolidayController`를 반환합니다.

```ts
interface HolidayController {
  readonly element: HTMLElement;
  readonly status: "running" | "paused" | "destroyed";
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

| 옵션 | 값 |
| --- | --- |
| `target` | `HTMLElement` 또는 CSS 선택자 문자열. 기본값은 `document.body`입니다. |
| `preset` | `chuseok`, `seollal`, `winter`, 또는 `HolidayPreset` 객체 |
| `effects` | `moon`, `rabbit`, `confetti`, `holiday-banner` |
| `message` | DOM에 `textContent`로 렌더링되는 문구. 최대 96자입니다. |
| `intensity` | `0`부터 `1`까지의 숫자. 색종이 밀도를 조절합니다. |
| `colors` | `background`, `moon`, `accent`, `secondary`, `text` 중 원하는 색상만 지정 |
| `durationMs` | 1초부터 60초 사이로 제한됩니다. 기본값은 12초입니다. |
| `respectReducedMotion` | `prefers-reduced-motion` 반영 여부. 기본값은 `true`입니다. |
| `pauseWhenHidden` | 탭이 숨겨지면 자동으로 멈출지 여부. 기본값은 `true`입니다. |
| `immersive` | 배경을 더 진하게 덮습니다. 기본값은 `false`입니다. |

`createHolidayMode`, `presets`, `seasonalPresets`와 관련 TypeScript 타입을 내보냅니다.

## 수명주기와 접근성

`destroy()`는 생성한 DOM, 타이머, 이벤트 리스너를 정리합니다. 마지막 효과가 제거되면 공용 스타일도 제거됩니다. `pause()`와 `resume()`은 반복 호출해도 안전합니다.

기본적으로 동작 줄이기 설정을 따르며, 효과가 페이지의 클릭이나 터치를 가로채지 않습니다. 배너 문구는 `aria-live="polite"`로 알립니다.

## 빌드와 배포

```bash
npm run build
npm run preview
```

정적 호스팅에는 `demo-dist/`의 내용만 올립니다. 라이브러리와 타입 선언은 `dist/`에 생성됩니다.

`npm pack`은 라이브러리를 빌드하고 `.tgz` 패키지를 만듭니다.

```bash
npm pack
```

## 테스트

처음 브라우저 테스트를 실행하기 전에 Chromium을 설치합니다.

```bash
npx playwright install chromium
npm run check
npm run pack:smoke
```

`npm run check`에 브라우저 테스트와 의존성 보안 검사가 포함됩니다. `npm run pack:smoke`는 패키지를 설치해 API와 타입 선언을 확인합니다.

## 문서

[기여 안내](CONTRIBUTING.md) · [보안 정책](SECURITY.md) · [변경 기록](CHANGELOG.md) · [라이선스](LICENSE)
