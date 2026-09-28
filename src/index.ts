export type HolidayEffect = "moon" | "rabbit" | "confetti" | "holiday-banner";

export type HolidayPresetName = "chuseok" | "seollal" | "winter";

export interface HolidayPalette {
  background: string;
  moon: string;
  accent: string;
  secondary: string;
  text: string;
}

export interface HolidayPreset {
  name: HolidayPresetName;
  label: string;
  message: string;
  effects: readonly HolidayEffect[];
  palette: HolidayPalette;
  intensity: number;
}

export interface HolidayModeOptions {
  target?: HTMLElement | string;
  preset?: string | HolidayPreset;
  effects?: readonly string[];
  message?: string;
  intensity?: number;
  colors?: Partial<HolidayPalette>;
  durationMs?: number;
  respectReducedMotion?: boolean;
  pauseWhenHidden?: boolean;
  immersive?: boolean;
}

export interface HolidayController {
  readonly element: HTMLElement;
  readonly status: "running" | "paused" | "destroyed";
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

const DEFAULT_DURATION_MS = 12_000;
const MAX_MESSAGE_LENGTH = 96;
const STYLE_ID = "holiday-mode-library-styles";
const mountedStyleUsers = new WeakMap<Document, number>();
const knownEffects = new Set<string>(["moon", "rabbit", "confetti", "holiday-banner"]);

export const seasonalPresets: Record<HolidayPresetName, HolidayPreset> = {
  chuseok: {
    name: "chuseok",
    label: "Chuseok",
    message: "풍요로운 한가위 보내세요",
    effects: ["moon", "rabbit", "confetti", "holiday-banner"],
    palette: {
      background: "#082c25",
      moon: "#fff5cf",
      accent: "#b6e65f",
      secondary: "#f7c95d",
      text: "#fff8df"
    },
    intensity: 0.72
  },
  seollal: {
    name: "seollal",
    label: "Seollal",
    message: "새해 복 많이 받으세요",
    effects: ["rabbit", "confetti", "holiday-banner"],
    palette: {
      background: "#153047",
      moon: "#f7efe2",
      accent: "#7ed7c1",
      secondary: "#e85d75",
      text: "#fffaf0"
    },
    intensity: 0.58
  },
  winter: {
    name: "winter",
    label: "Winter",
    message: "따뜻한 겨울 밤 되세요",
    effects: ["moon", "confetti", "holiday-banner"],
    palette: {
      background: "#12323a",
      moon: "#f4fbff",
      accent: "#9fe7f5",
      secondary: "#d7f2ff",
      text: "#f7fcff"
    },
    intensity: 0.46
  }
};

export function createHolidayMode(options: HolidayModeOptions = {}): HolidayController {
  const documentRef = getDocument(options.target);
  const target = resolveTarget(documentRef, options.target);
  const preset = resolvePreset(options.preset);
  const palette = normalizePalette(documentRef, { ...preset.palette, ...options.colors }, preset.palette);
  const effects = normalizeEffects(options.effects ?? preset.effects);
  const intensity = clamp(options.intensity ?? preset.intensity, 0, 1);
  const durationMs = clampDuration(options.durationMs);
  const respectReducedMotion = options.respectReducedMotion ?? true;
  const pauseWhenHidden = options.pauseWhenHidden ?? true;
  const reducedMotion = respectReducedMotion && prefersReducedMotion(documentRef);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const isViewport = target === documentRef.body || target === documentRef.documentElement;
  const previousPosition = target.style.position;
  const previousOverflow = target.style.overflow;
  let status: HolidayController["status"] = "running";
  let hiddenPaused = false;
  let destroyed = false;
  let remainingDurationMs = durationMs;
  let durationStartedAt = now();
  let finishTimer: ReturnType<typeof setTimeout> | undefined;

  mountStyles(documentRef);
  if (!isViewport) {
    const computed = documentRef.defaultView?.getComputedStyle(target);
    if (!computed || computed.position === "" || computed.position === "static") {
      target.style.position = "relative";
    }
    target.style.overflow = "hidden";
  }

  const root = documentRef.createElement("div");
  root.className = "hm-root";
  root.dataset.status = status;
  root.dataset.reducedMotion = String(reducedMotion);
  root.dataset.holidayMode = "true";
  root.dataset.viewport = String(isViewport);
  root.dataset.immersive = String(options.immersive ?? false);
  root.style.setProperty("--hm-bg", palette.background);
  root.style.setProperty("--hm-moon", palette.moon);
  root.style.setProperty("--hm-accent", palette.accent);
  root.style.setProperty("--hm-secondary", palette.secondary);
  root.style.setProperty("--hm-text", palette.text);
  root.setAttribute("aria-live", "polite");
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", `${preset.label} holiday mode`);

  const safeMessage = normalizeMessage(options.message ?? preset.message);

  if (effects.includes("moon")) {
    root.append(createMoon(documentRef));
  }
  if (effects.includes("rabbit")) {
    root.append(createRabbit(documentRef));
  }
  if (effects.includes("confetti")) {
    root.append(createConfetti(documentRef, intensity, reducedMotion));
  }
  if (effects.includes("holiday-banner")) {
    root.append(createBanner(documentRef, safeMessage));
  }

  target.append(root);

  scheduleCompletion(remainingDurationMs);

  function setManagedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function scheduleCompletion(delay: number): void {
    if (finishTimer) {
      clearTimeout(finishTimer);
      timers.delete(finishTimer);
    }
    durationStartedAt = now();
    finishTimer = setManagedTimeout(() => {
      finishTimer = undefined;
      if (!destroyed) {
        root.dataset.complete = "true";
      }
    }, delay);
  }

  function pauseCompletionTimer(): void {
    if (!finishTimer) {
      return;
    }
    remainingDurationMs = Math.max(0, remainingDurationMs - (now() - durationStartedAt));
    clearTimeout(finishTimer);
    timers.delete(finishTimer);
    finishTimer = undefined;
  }

  function onVisibilityChange(): void {
    if (!pauseWhenHidden || destroyed) {
      return;
    }
    if (documentRef.visibilityState === "hidden" && status === "running") {
      hiddenPaused = true;
      pauseInternal();
      return;
    }
    if (documentRef.visibilityState === "visible" && hiddenPaused) {
      hiddenPaused = false;
      resumeInternal();
    }
  }

  documentRef.addEventListener("visibilitychange", onVisibilityChange);

  function pause(): void {
    hiddenPaused = false;
    pauseInternal();
  }

  function pauseInternal(): void {
    if (destroyed || status === "paused") {
      return;
    }
    status = "paused";
    root.dataset.status = status;
    pauseCompletionTimer();
  }

  function resume(): void {
    hiddenPaused = false;
    resumeInternal();
  }

  function resumeInternal(): void {
    if (destroyed || status === "running") {
      return;
    }
    status = "running";
    root.dataset.status = status;
    if (!root.dataset.complete && remainingDurationMs > 0) {
      scheduleCompletion(remainingDurationMs);
    }
  }

  function destroy(): void {
    if (destroyed) {
      return;
    }
    destroyed = true;
    status = "destroyed";
    root.dataset.status = status;
    if (finishTimer) {
      clearTimeout(finishTimer);
    }
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.clear();
    documentRef.removeEventListener("visibilitychange", onVisibilityChange);
    root.remove();
    if (!isViewport) {
      target.style.position = previousPosition;
      target.style.overflow = previousOverflow;
    }
    unmountStyles(documentRef);
  }

  return {
    element: root,
    get status() {
      return status;
    },
    pause,
    resume,
    destroy
  };
}

export const presets = seasonalPresets;

function resolvePreset(preset: HolidayModeOptions["preset"]): HolidayPreset {
  if (!preset) {
    return seasonalPresets.chuseok;
  }
  if (typeof preset === "string") {
    if (isPresetName(preset)) {
      return seasonalPresets[preset];
    }
    throw new Error(`holiday-mode preset not found: ${preset}`);
  }
  return preset;
}

function isPresetName(value: string): value is HolidayPresetName {
  return value === "chuseok" || value === "seollal" || value === "winter";
}

function normalizeEffects(effects: readonly string[]): HolidayEffect[] {
  const normalized: HolidayEffect[] = [];
  for (const effect of effects) {
    if (!knownEffects.has(effect)) {
      throw new Error(`holiday-mode effect not found: ${effect}`);
    }
    const knownEffect = effect as HolidayEffect;
    if (!normalized.includes(knownEffect)) {
      normalized.push(knownEffect);
    }
  }
  return normalized.length > 0 ? normalized : ["holiday-banner"];
}

function normalizePalette(documentRef: Document, palette: HolidayPalette, fallback: HolidayPalette): HolidayPalette {
  return {
    background: normalizeColor(documentRef, palette.background, fallback.background),
    moon: normalizeColor(documentRef, palette.moon, fallback.moon),
    accent: normalizeColor(documentRef, palette.accent, fallback.accent),
    secondary: normalizeColor(documentRef, palette.secondary, fallback.secondary),
    text: normalizeColor(documentRef, palette.text, fallback.text)
  };
}

function normalizeColor(documentRef: Document, value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const cssApi = (documentRef.defaultView as Window & { CSS?: { supports?: (property: string, value: string) => boolean } }).CSS;
  const supports = cssApi?.supports;
  if (supports?.("color", trimmed) === false) {
    return fallback;
  }
  if (!supports && /\s/.test(trimmed) && !/^(color-mix|rgb|rgba|hsl|hsla|oklch|lab|var)\(/iu.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

function normalizeMessage(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.slice(0, MAX_MESSAGE_LENGTH) || seasonalPresets.chuseok.message;
}

function getDocument(target: HolidayModeOptions["target"]): Document {
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    return target.ownerDocument;
  }
  if (typeof document !== "undefined") {
    return document;
  }
  throw new Error("holiday-mode requires a DOM document or an HTMLElement target.");
}

function resolveTarget(documentRef: Document, target: HolidayModeOptions["target"]): HTMLElement {
  if (!target) {
    return documentRef.body;
  }
  if (typeof target === "string") {
    const found = documentRef.querySelector<HTMLElement>(target);
    if (!found) {
      throw new Error(`holiday-mode target not found: ${target}`);
    }
    return found;
  }
  return target;
}

function prefersReducedMotion(documentRef: Document): boolean {
  const win = documentRef.defaultView as Window & { matchMedia?: (query: string) => MediaQueryList };
  return typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function clampDuration(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DURATION_MS;
  }
  return Math.max(1_000, Math.min(value, 60_000));
}

function now(): number {
  return Date.now();
}

function createMoon(documentRef: Document): SVGSVGElement {
  const svg = svgEl(documentRef, "svg");
  svg.setAttribute("class", "hm-moon");
  svg.setAttribute("viewBox", "0 0 160 160");
  svg.setAttribute("aria-hidden", "true");
  const circle = svgEl(documentRef, "circle");
  circle.setAttribute("cx", "78");
  circle.setAttribute("cy", "78");
  circle.setAttribute("r", "58");
  circle.setAttribute("fill", "var(--hm-moon)");
  const shadow = svgEl(documentRef, "path");
  shadow.setAttribute("d", "M99 27c26 20 32 58 12 85-18 24-50 32-77 21 16 13 38 20 62 14 39-10 62-49 52-88-6-22-24-40-49-32Z");
  shadow.setAttribute("fill", "rgba(8, 44, 37, 0.18)");
  const ring = svgEl(documentRef, "circle");
  ring.setAttribute("cx", "78");
  ring.setAttribute("cy", "78");
  ring.setAttribute("r", "66");
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "var(--hm-accent)");
  ring.setAttribute("stroke-width", "2");
  ring.setAttribute("stroke-dasharray", "8 11");
  svg.append(circle, shadow, ring);
  return svg;
}

function createRabbit(documentRef: Document): SVGSVGElement {
  const svg = svgEl(documentRef, "svg");
  svg.setAttribute("class", "hm-rabbit");
  svg.setAttribute("viewBox", "0 0 180 180");
  svg.setAttribute("aria-hidden", "true");
  const parts: Array<[keyof SVGElementTagNameMap, Record<string, string>]> = [
    ["ellipse", { cx: "88", cy: "106", rx: "46", ry: "36", fill: "var(--hm-moon)" }],
    ["ellipse", { cx: "58", cy: "53", rx: "13", ry: "39", fill: "var(--hm-moon)", transform: "rotate(-18 58 53)" }],
    ["ellipse", { cx: "109", cy: "53", rx: "13", ry: "39", fill: "var(--hm-moon)", transform: "rotate(17 109 53)" }],
    ["circle", { cx: "75", cy: "101", r: "4", fill: "var(--hm-bg)" }],
    ["circle", { cx: "103", cy: "101", r: "4", fill: "var(--hm-bg)" }],
    ["path", { d: "M83 116c8 7 17 7 25 0", fill: "none", stroke: "var(--hm-bg)", "stroke-width": "4", "stroke-linecap": "round" }],
    ["path", { d: "M45 136c30 17 63 18 99 0", fill: "none", stroke: "var(--hm-accent)", "stroke-width": "8", "stroke-linecap": "round" }]
  ];
  for (const [name, attrs] of parts) {
    const node = svgEl(documentRef, name);
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, value);
    }
    svg.append(node);
  }
  return svg;
}

function createConfetti(documentRef: Document, intensity: number, reducedMotion: boolean): HTMLElement {
  const field = documentRef.createElement("div");
  field.className = "hm-confetti";
  field.setAttribute("aria-hidden", "true");
  const count = reducedMotion ? Math.ceil(6 + intensity * 8) : Math.ceil(16 + intensity * 34);
  for (let index = 0; index < count; index += 1) {
    const piece = documentRef.createElement("span");
    piece.style.left = `${(deterministic(index, 11) * 100).toFixed(3)}%`;
    piece.style.animationDelay = `${(deterministic(index, 23) * 1.8).toFixed(3)}s`;
    piece.style.animationDuration = `${(2.5 + deterministic(index, 37) * 3).toFixed(3)}s`;
    piece.style.setProperty("--hm-confetti-rotate", `${String(Math.round(deterministic(index, 41) * 360))}deg`);
    piece.dataset.kind = String(index % 4);
    field.append(piece);
  }
  return field;
}

function createBanner(documentRef: Document, message: string): HTMLElement {
  const banner = documentRef.createElement("div");
  banner.className = "hm-banner";
  const label = documentRef.createElement("span");
  label.className = "hm-banner-label";
  label.textContent = "Holiday Mode";
  const text = documentRef.createElement("strong");
  text.textContent = message;
  banner.append(label, text);
  return banner;
}

function svgEl<TName extends keyof SVGElementTagNameMap>(documentRef: Document, name: TName): SVGElementTagNameMap[TName] {
  return documentRef.createElementNS("http://www.w3.org/2000/svg", name);
}

function deterministic(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function mountStyles(documentRef: Document): void {
  mountedStyleUsers.set(documentRef, (mountedStyleUsers.get(documentRef) ?? 0) + 1);
  if (documentRef.getElementById(STYLE_ID)) {
    return;
  }
  const style = documentRef.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.hm-root{position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;color:var(--hm-text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hm-root[data-viewport="true"]{position:fixed;z-index:2147483000}
.hm-root::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 76% 22%,color-mix(in srgb,var(--hm-moon) 20%,transparent),transparent 24rem),linear-gradient(160deg,color-mix(in srgb,var(--hm-bg) 28%,transparent),transparent);opacity:.34;animation:hm-fade 620ms ease both}
.hm-root[data-immersive="true"]::before{background:radial-gradient(circle at 76% 22%,color-mix(in srgb,var(--hm-moon) 22%,transparent),transparent 24rem),linear-gradient(160deg,color-mix(in srgb,var(--hm-bg) 93%,black),var(--hm-bg));opacity:.88}
.hm-moon{position:absolute;right:clamp(1.5rem,7vw,8rem);top:clamp(1rem,8vh,6rem);width:clamp(7rem,18vw,14rem);filter:drop-shadow(0 0 32px color-mix(in srgb,var(--hm-moon) 52%,transparent));animation:hm-rise 1100ms cubic-bezier(.2,.8,.2,1) both}
.hm-rabbit{position:absolute;right:clamp(2rem,10vw,12rem);bottom:clamp(3rem,12vh,8rem);width:clamp(8rem,22vw,17rem);filter:drop-shadow(0 20px 30px rgba(0,0,0,.28));animation:hm-hop 1800ms cubic-bezier(.18,.8,.28,1) 2 both}
.hm-confetti{position:absolute;inset:0}.hm-confetti span{position:absolute;top:-2rem;width:.65rem;height:1.1rem;border-radius:999px;background:var(--hm-accent);opacity:.9;transform:rotate(var(--hm-confetti-rotate));animation:hm-fall linear 2 both}.hm-confetti span[data-kind="1"]{background:var(--hm-secondary);height:.65rem}.hm-confetti span[data-kind="2"]{background:var(--hm-moon);border-radius:2px}.hm-confetti span[data-kind="3"]{background:transparent;border:.16rem solid var(--hm-accent)}
.hm-banner{position:absolute;left:clamp(1rem,6vw,5rem);bottom:clamp(1rem,8vh,5rem);display:grid;gap:.45rem;max-width:min(34rem,calc(100% - 2rem));padding:1rem 1.15rem;border:1px solid color-mix(in srgb,var(--hm-accent) 48%,transparent);border-radius:18px;background:color-mix(in srgb,var(--hm-bg) 72%,transparent);box-shadow:0 22px 55px rgba(0,0,0,.28);backdrop-filter:blur(12px);animation:hm-slide 720ms ease both}
.hm-banner-label{font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--hm-accent)}.hm-banner strong{font-size:clamp(1.3rem,4vw,2.6rem);line-height:1.1;word-break:keep-all}
.hm-root[data-status="paused"]::before,.hm-root[data-status="paused"] *{animation-play-state:paused!important}.hm-root[data-complete="true"] .hm-confetti span{opacity:0}.hm-root[data-reduced-motion="true"] *{animation-duration:1ms!important;animation-iteration-count:1!important}
@keyframes hm-fade{from{opacity:0}to{opacity:.34}}@keyframes hm-rise{from{opacity:0;transform:translateY(1rem) scale(.96)}to{opacity:1;transform:none}}@keyframes hm-hop{0%{transform:translateY(1rem);opacity:0}30%,70%{transform:translateY(0);opacity:1}50%{transform:translateY(-.55rem)}100%{transform:translateY(0);opacity:1}}@keyframes hm-fall{0%{transform:translate3d(0,-2rem,0) rotate(var(--hm-confetti-rotate));opacity:0}10%{opacity:1}100%{transform:translate3d(3rem,110vh,0) rotate(calc(var(--hm-confetti-rotate) + 210deg));opacity:0}}@keyframes hm-slide{from{opacity:0;transform:translateY(1rem)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.hm-root *{animation-duration:1ms!important;animation-iteration-count:1!important}}
`;
  documentRef.head.append(style);
}

function unmountStyles(documentRef: Document): void {
  const nextCount = Math.max(0, (mountedStyleUsers.get(documentRef) ?? 0) - 1);
  mountedStyleUsers.set(documentRef, nextCount);
  if (nextCount === 0) {
    documentRef.getElementById(STYLE_ID)?.remove();
  }
}
