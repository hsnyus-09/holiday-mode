/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHolidayMode, presets } from "../index";

describe("createHolidayMode", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="stage"></main>';
    document.head.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  it("renders selected effects into the target and exposes lifecycle state", () => {
    const controller = createHolidayMode({
      target: "#stage",
      preset: "chuseok",
      effects: ["moon", "holiday-banner"],
      message: "테스트 한가위",
      intensity: 0.5
    });

    expect(controller.status).toBe("running");
    expect(controller.element.dataset.holidayMode).toBe("true");
    expect(controller.element.querySelector(".hm-moon")).not.toBeNull();
    expect(controller.element.querySelector(".hm-rabbit")).toBeNull();
    expect(controller.element.textContent).toContain("테스트 한가위");

    controller.pause();
    expect(controller.status).toBe("paused");
    expect(controller.element.dataset.status).toBe("paused");

    controller.resume();
    expect(controller.status).toBe("running");
    expect(controller.element.dataset.status).toBe("running");

    controller.destroy();
    expect(controller.status).toBe("destroyed");
    expect(document.querySelector(".hm-root")).toBeNull();
    expect(document.querySelector("#holiday-mode-library-styles")).toBeNull();
  });

  it("uses textContent for safe bounded message rendering", () => {
    const unsafe = `<img src=x onerror=alert(1)> ${"달".repeat(120)}`;
    const controller = createHolidayMode({
      target: "#stage",
      effects: ["holiday-banner"],
      message: unsafe
    });

    const banner = controller.element.querySelector(".hm-banner strong");
    if (!banner) {
      throw new Error("Expected banner text");
    }
    expect(banner.innerHTML).not.toContain("<img");
    expect(banner.textContent.length).toBeLessThanOrEqual(96);
    expect(controller.element.querySelector("img")).toBeNull();
    controller.destroy();
  });

  it("respects reduced motion when requested", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

    const controller = createHolidayMode({ target: "#stage", effects: ["confetti"] });

    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(controller.element.dataset.reducedMotion).toBe("true");
    expect(controller.element.querySelectorAll(".hm-confetti span").length).toBeLessThan(16);
    controller.destroy();
  });

  it("pauses and resumes on visibility changes, then removes listeners on destroy", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const controller = createHolidayMode({ target: "#stage", effects: ["moon"] });

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(controller.status).toBe("paused");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(controller.status).toBe("running");

    controller.destroy();
    expect(addSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("does not auto-resume a manual pause after visibility changes", () => {
    const controller = createHolidayMode({ target: "#stage", effects: ["moon"] });

    controller.pause();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(controller.status).toBe("paused");
    controller.destroy();
  });

  it("pauses duration completion while paused", () => {
    const controller = createHolidayMode({
      target: "#stage",
      durationMs: 1_000,
      effects: ["confetti"]
    });

    vi.advanceTimersByTime(700);
    controller.pause();
    vi.advanceTimersByTime(2_000);
    expect(controller.element.dataset.complete).toBeUndefined();
    controller.resume();
    vi.advanceTimersByTime(301);
    expect(controller.status).toBe("running");
    expect(controller.element.dataset.complete).toBe("true");
    expect(controller.element.querySelectorAll(".hm-confetti span").length).toBeGreaterThan(0);
    controller.destroy();
  });

  it("contains custom targets and restores temporary target styles", () => {
    const stage = document.querySelector<HTMLElement>("#stage");
    expect(stage).not.toBeNull();
    expect(stage?.style.position).toBe("");
    expect(stage?.style.overflow).toBe("");

    const controller = createHolidayMode({ target: stage!, effects: ["moon"] });
    expect(controller.element.dataset.viewport).toBe("false");
    expect(stage?.style.position).toBe("relative");
    expect(stage?.style.overflow).toBe("hidden");

    controller.destroy();
    expect(stage?.style.position).toBe("");
    expect(stage?.style.overflow).toBe("");
  });

  it("keeps shared styles until the last instance in a document is destroyed", () => {
    const first = createHolidayMode({ target: "#stage", effects: ["moon"] });
    const second = createHolidayMode({ target: "#stage", effects: ["rabbit"] });

    first.destroy();
    expect(document.querySelector("#holiday-mode-library-styles")).not.toBeNull();
    second.destroy();
    expect(document.querySelector("#holiday-mode-library-styles")).toBeNull();
  });

  it("validates runtime options from plain JavaScript callers", () => {
    expect(() => createHolidayMode({ target: "#stage", preset: "unknown" })).toThrow(/preset not found/);
    expect(() => createHolidayMode({ target: "#stage", effects: ["sparkles"] })).toThrow(/effect not found/);

    const controller = createHolidayMode({
      target: "#stage",
      effects: ["confetti"],
      durationMs: Number.NaN,
      colors: { accent: "not a color" }
    });
    expect(controller.element.style.getPropertyValue("--hm-accent")).toBe(presets.chuseok.palette.accent);
    controller.destroy();
  });

  it("exports documented seasonal presets", () => {
    expect(Object.keys(presets)).toEqual(["chuseok", "seollal", "winter"]);
    expect(presets.chuseok.effects).toContain("holiday-banner");
    expect(presets.seollal.message).toContain("새해");
  });
});
