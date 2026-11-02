/**
 * Smoke tests for the real CLI binary (dist/index.js), spawned as a child
 * process. Discord is never contacted: with an empty token the CLI stops at
 * configuration validation, which is exactly what these tests assert —
 * the run must reach config handling, not fail with a Node option error.
 *
 * Every spawn uses a literal argument list with shell: false; nothing is
 * interpolated through a shell and no user input is involved.
 */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Env-file values never override real environment variables, so an empty
// DISCORD_BOT_TOKEN keeps every run on the config-error path even if a
// local .env exists on the developer machine.
const CLEAN_ENV = {
  ...process.env,
  DISCORD_BOT_TOKEN: "",
  DISCORD_GUILD_ID: "",
};

function outputOf(result: SpawnSyncReturns<string>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

describe("CLI smoke через дочерний процесс (FIX-1)", () => {
  it("запуск с --env-file-if-exists доходит до конфигурации, а не до bad option", () => {
    // .env отсутствует в каталоге инструмента (исключён .gitignore);
    // документированный флаг Node должен молча продолжить без файла.
    const result = spawnSync(
      process.execPath,
      ["--env-file-if-exists=.env", "dist/index.js", "--dry-run"],
      { cwd: toolRoot, encoding: "utf8", shell: false, env: CLEAN_ENV },
    );
    const output = outputOf(result);

    expect(result.status).toBe(1);
    expect(output).not.toContain("bad option");
    expect(output).toContain("DISCORD_BOT_TOKEN");
  });

  it("прямой запуск --dry-run без токена завершается конфигурационной ошибкой", () => {
    const result = spawnSync(process.execPath, ["dist/index.js", "--dry-run"], {
      cwd: toolRoot,
      encoding: "utf8",
      shell: false,
      env: CLEAN_ENV,
    });
    const output = outputOf(result);

    expect(result.status).toBe(1);
    expect(output).not.toContain("bad option");
    expect(output).toContain("DISCORD_BOT_TOKEN");
    expect(output).toContain("setup:dry");
  });

  it("запуск без аргументов печатает использование", () => {
    const result = spawnSync(process.execPath, ["dist/index.js"], {
      cwd: toolRoot,
      encoding: "utf8",
      shell: false,
      env: CLEAN_ENV,
    });
    const output = outputOf(result);

    expect(result.status).toBe(1);
    expect(output).toContain("Использование");
    expect(output).toContain("setup:apply");
  });

  it("неизвестный аргумент даёт понятную ошибку, а не крах процесса", () => {
    const result = spawnSync(process.execPath, ["dist/index.js", "--bogus"], {
      cwd: toolRoot,
      encoding: "utf8",
      shell: false,
      env: CLEAN_ENV,
    });

    expect(result.status).toBe(1);
    expect(outputOf(result)).toContain("--bogus");
  });
});
