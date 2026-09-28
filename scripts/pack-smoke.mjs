import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
let tempRoot;

async function run(command, args, options = {}) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    maxBuffer: 10 * 1024 * 1024
  });
  if (stdout.trim()) {
    process.stdout.write(`${stdout.trim()}\n`);
  }
  if (stderr.trim()) {
    process.stderr.write(`${stderr.trim()}\n`);
  }
  return stdout;
}

try {
  tempRoot = await mkdtemp(join(tmpdir(), "holiday-mode-pack-smoke-"));

  await run("npm", ["run", "build:lib"]);
  const packOutput = await run("npm", ["pack", "--json", "--foreground-scripts=false", "--pack-destination", tempRoot]);
  const [packed] = JSON.parse(packOutput);
  if (!packed?.filename) {
    throw new Error("npm pack did not return a tarball filename.");
  }

  const tarballPath = join(tempRoot, packed.filename);
  await run("npm", ["init", "-y"], { cwd: tempRoot });
  await run("npm", ["install", tarballPath, "typescript@5.9.3"], { cwd: tempRoot });

  const runtimeCheck = `
    import * as holidayMode from "holiday-mode";

    const expectedExports = ["createHolidayMode", "presets", "seasonalPresets"];
    for (const name of expectedExports) {
      if (!(name in holidayMode)) {
        throw new Error(\`Missing public export: \${name}\`);
      }
    }
    if (typeof holidayMode.createHolidayMode !== "function") {
      throw new Error("createHolidayMode must be a function export.");
    }
    if (holidayMode.presets !== holidayMode.seasonalPresets) {
      throw new Error("presets alias must reference seasonalPresets.");
    }
    if (!holidayMode.presets.chuseok.effects.includes("holiday-banner")) {
      throw new Error("Chuseok preset is missing the banner effect.");
    }
    if (typeof globalThis.document !== "undefined") {
      throw new Error("SSR import should not create or require a global document.");
    }
  `;
  await run("node", ["--input-type=module", "--eval", runtimeCheck], { cwd: tempRoot });

  await writeFile(
    join(tempRoot, "index.ts"),
    `import { createHolidayMode, presets, seasonalPresets, type HolidayController, type HolidayModeOptions, type HolidayPresetName } from "holiday-mode";

const presetName: HolidayPresetName = "chuseok";
const options: HolidayModeOptions = {
  preset: presetName,
  effects: ["moon", "rabbit", "confetti", "holiday-banner"],
  message: "풍요로운 한가위 보내세요",
  intensity: 0.72,
  durationMs: 1500,
  respectReducedMotion: true,
  pauseWhenHidden: true
};

const controller: HolidayController = createHolidayMode(options);
controller.pause();
controller.resume();
controller.destroy();

const label: string = presets.chuseok.label;
const winterEffects = seasonalPresets.winter.effects;
console.log(label, winterEffects.length);
`
  );
  await writeFile(
    join(tempRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          lib: ["ES2022", "DOM"],
          skipLibCheck: false,
          noEmit: true
        },
        include: ["index.ts"]
      },
      null,
      2
    )
  );

  await run(join(tempRoot, "node_modules", ".bin", "tsc"), ["--noEmit"], { cwd: tempRoot });
  process.stdout.write(`pack smoke passed: ${packed.filename}\n`);
} finally {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
