import { createHolidayMode, presets, type HolidayController, type HolidayEffect, type HolidayPresetName } from "../index";
import "./styles.css";

const effectChoices: HolidayEffect[] = ["moon", "rabbit", "confetti", "holiday-banner"];
const presetChoices = Object.keys(presets) as HolidayPresetName[];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#playground" aria-label="Holiday Mode playground">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="25" />
        <path d="M42 13c10 9 12 25 3 36-8 10-22 14-34 8 8 6 19 8 29 5 17-5 27-23 22-40-2-7-9-12-20-9Z" />
        <path d="M18 44c10 6 19 6 29 0" />
      </svg>
      <span>Holiday Mode</span>
    </a>
    <nav aria-label="문서">
      <a href="#api">API</a>
      <a href="#docs">Docs</a>
    </nav>
  </header>

  <main>
    <section class="hero" id="playground">
      <div class="hero-copy">
        <p class="eyebrow">Korean-first seasonal DOM effects</p>
        <h1>한 줄로 켜는,<br />한가위.</h1>
        <p class="intro">달, 토끼, 색종이, 배너를 프레임워크 없이 안전하게 띄웁니다. 일시정지, 재개, 정리까지 컨트롤러 하나로 끝납니다.</p>
        <div class="status-row" aria-live="polite">
          <span class="status-dot" data-testid="status-dot"></span>
          <span id="statusText">준비됨</span>
        </div>
      </div>
      <div class="stage-shell">
        <div class="stage" data-testid="playground-stage" id="stage" tabindex="0" aria-label="Holiday Mode live stage">
          <svg class="stage-art" viewBox="0 0 720 460" aria-hidden="true">
            <defs>
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stop-color="#fff8d6" />
                <stop offset="72%" stop-color="#f8eaa6" />
                <stop offset="100%" stop-color="#c7f35e" />
              </radialGradient>
              <linearGradient id="pineWash" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="#123f33" />
                <stop offset="1" stop-color="#061f1a" />
              </linearGradient>
            </defs>
            <rect width="720" height="460" rx="28" fill="url(#pineWash)" />
            <circle cx="534" cy="112" r="74" fill="url(#moonGlow)" />
            <path d="M559 49c34 30 38 83 8 117-27 31-72 42-111 24 26 22 64 27 98 10 49-24 69-83 45-132-7-14-20-21-40-19Z" fill="#143a31" opacity=".18" />
            <path d="M70 334c83-42 166-42 249 0s166 42 249 0 122-35 152-11v137H0v-91c20-5 43-17 70-35Z" fill="#fff8df" opacity=".08" />
            <path d="M118 286c22-32 49-34 81-8 30-29 59-27 87 6" fill="none" stroke="#b6e65f" stroke-width="8" stroke-linecap="round" />
            <path d="M128 288c38 27 88 27 149 0" fill="none" stroke="#f7c95d" stroke-width="5" stroke-linecap="round" />
            <g fill="#fff8df">
              <ellipse cx="190" cy="228" rx="48" ry="36" />
              <ellipse cx="165" cy="174" rx="13" ry="42" transform="rotate(-16 165 174)" />
              <ellipse cx="214" cy="174" rx="13" ry="42" transform="rotate(16 214 174)" />
              <circle cx="177" cy="222" r="4" fill="#082c25" />
              <circle cx="205" cy="222" r="4" fill="#082c25" />
              <path d="M184 237c8 7 17 7 25 0" fill="none" stroke="#082c25" stroke-width="4" stroke-linecap="round" />
            </g>
          </svg>
          <div class="stage-copy">
            <span>Live stage</span>
            <strong id="stageMessage">풍요로운 한가위 보내세요</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace" aria-label="Holiday Mode controls">
      <form class="controls">
        <label>
          <span>Preset</span>
          <select data-testid="preset-select" id="presetSelect"></select>
        </label>
        <label>
          <span>Effect</span>
          <select data-testid="effect-select" id="effectSelect"></select>
        </label>
        <label>
          <span>Message</span>
          <input id="messageInput" maxlength="96" value="풍요로운 한가위 보내세요" />
        </label>
        <label>
          <span>Intensity</span>
          <input id="intensityInput" type="range" min="0" max="1" step="0.05" value="0.72" />
        </label>
        <fieldset>
          <legend>Colors</legend>
          <button type="button" class="swatch is-selected" data-color="#b6e65f" aria-label="lime selected"></button>
          <button type="button" class="swatch" data-color="#f7c95d" aria-label="gold"></button>
          <button type="button" class="swatch" data-color="#7ed7c1" aria-label="jade"></button>
          <button type="button" class="swatch" data-color="#e85d75" aria-label="rose"></button>
        </fieldset>
        <div class="actions">
          <button type="button" data-testid="start-effect" id="startButton">Start</button>
          <button type="button" data-testid="pause-effect" id="pauseButton">Pause</button>
          <button type="button" data-testid="stop-effect" id="stopButton">Stop</button>
        </div>
      </form>

      <section class="code-panel" id="api" aria-label="API example">
        <div class="panel-heading">
          <h2>실제 사용 코드</h2>
          <button type="button" id="copyButton">Copy</button>
        </div>
        <pre data-testid="api-code" tabindex="0"><code id="apiCode"></code></pre>
        <p id="copyStatus" class="copy-status" aria-live="polite"></p>
      </section>
    </section>

    <section class="docs" id="docs">
      <h2>설계 메모</h2>
      <div class="doc-grid">
        <article>
          <h3>Lifecycle</h3>
          <p>컨트롤러는 <code>pause()</code>, <code>resume()</code>, <code>destroy()</code>를 제공합니다. <code>destroy()</code>는 DOM, 타이머, visibility listener를 정리합니다.</p>
        </article>
        <article>
          <h3>Reduced motion</h3>
          <p><code>prefers-reduced-motion</code>을 기본으로 존중하며, 움직임이 필요한 장식은 즉시 정적인 상태로 전환됩니다.</p>
        </article>
        <article>
          <h3>Privacy</h3>
          <p>네트워크 요청, 저장소, 분석 도구가 없습니다. 메시지는 <code>textContent</code>로만 그려집니다.</p>
        </article>
      </div>
    </section>
  </main>

  <footer>
    <span>MIT 2026 Chuseok project contributors</span>
  </footer>
`;

const stage = mustGet("[data-testid='playground-stage']") as HTMLElement;
const presetSelect = mustGet("[data-testid='preset-select']") as HTMLSelectElement;
const effectSelect = mustGet("[data-testid='effect-select']") as HTMLSelectElement;
const messageInput = mustGet("#messageInput") as HTMLInputElement;
const intensityInput = mustGet("#intensityInput") as HTMLInputElement;
const startButton = mustGet("[data-testid='start-effect']") as HTMLButtonElement;
const pauseButton = mustGet("[data-testid='pause-effect']") as HTMLButtonElement;
const stopButton = mustGet("[data-testid='stop-effect']") as HTMLButtonElement;
const apiCode = mustGet("[data-testid='api-code'] code") as HTMLElement;
const copyButton = mustGet("#copyButton") as HTMLButtonElement;
const copyStatus = mustGet("#copyStatus") as HTMLElement;
const statusText = mustGet("#statusText") as HTMLElement;
const stageMessage = mustGet("#stageMessage") as HTMLElement;
let controller: HolidayController | undefined;
let accent = "#b6e65f";

for (const preset of presetChoices) {
  const option = document.createElement("option");
  option.value = preset;
  option.textContent = presets[preset].label;
  presetSelect.append(option);
}

for (const effect of ["all", ...effectChoices]) {
  const option = document.createElement("option");
  option.value = effect;
  option.textContent = effect === "all" ? "All effects" : effect;
  effectSelect.append(option);
}

document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((button) => {
  const color = button.dataset.color ?? accent;
  button.style.background = color;
  button.addEventListener("click", () => {
    accent = color;
    document.querySelectorAll(".swatch").forEach((item) => {
      item.classList.remove("is-selected");
    });
    button.classList.add("is-selected");
    updateCode();
  });
});

presetSelect.addEventListener("change", () => {
  const preset = presets[presetSelect.value as HolidayPresetName];
  messageInput.value = preset.message;
  intensityInput.value = String(preset.intensity);
  stageMessage.textContent = preset.message;
  updateCode();
});

effectSelect.addEventListener("change", updateCode);
messageInput.addEventListener("input", () => {
  stageMessage.textContent = messageInput.value;
  updateCode();
});
intensityInput.addEventListener("input", updateCode);

startButton.addEventListener("click", startEffect);
pauseButton.addEventListener("click", () => {
  if (!controller) {
    startEffect();
  }
  controller?.pause();
  setStatus("일시정지됨");
});
stopButton.addEventListener("click", stopEffect);

copyButton.addEventListener("click", () => {
  void copyCode();
});

async function copyCode(): Promise<void> {
  const text = apiCode.textContent;
  try {
    if ("clipboard" in navigator) {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = "코드를 복사했습니다.";
    } else {
      fallbackCopy(text);
      copyStatus.textContent = "코드를 선택 가능한 텍스트로 복사했습니다.";
    }
  } catch {
    fallbackCopy(text);
    copyStatus.textContent = "클립보드를 사용할 수 없어 코드가 선택되었습니다.";
  }
}

stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startEffect();
  }
  if (event.key === "Escape") {
    stopEffect();
  }
});

updateCode();

function startEffect(): void {
  controller?.destroy();
  controller = createHolidayMode({
    target: stage,
    preset: presetSelect.value as HolidayPresetName,
    effects: getSelectedEffects(),
    message: messageInput.value,
    intensity: Number(intensityInput.value),
    colors: { accent },
    durationMs: 7_500
  });
  setStatus("실행 중");
}

function stopEffect(): void {
  controller?.destroy();
  controller = undefined;
  setStatus("정지됨");
}

function getSelectedEffects(): HolidayEffect[] {
  return effectSelect.value === "all" ? effectChoices : [effectSelect.value as HolidayEffect];
}

function updateCode(): void {
  const effects = getSelectedEffects().map((effect) => `"${effect}"`).join(", ");
  apiCode.textContent = `import { createHolidayMode } from "holiday-mode";

const holiday = createHolidayMode({
  target: "#stage",
  preset: "${presetSelect.value}",
  effects: [${effects}],
  message: ${JSON.stringify(messageInput.value)},
  intensity: ${Number(intensityInput.value).toFixed(2)},
  colors: { accent: "${accent}" }
});

holiday.pause();
holiday.resume();
holiday.destroy();`;
}

function setStatus(value: string): void {
  statusText.textContent = value;
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand("copy");
  textarea.remove();
}

function mustGet(selector: string): Element {
  const node = document.querySelector(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node;
}
