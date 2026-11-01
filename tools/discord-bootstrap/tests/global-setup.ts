/**
 * Vitest global setup: compiles the CLI (tsc → dist/) once before the test
 * run so `tests/cli.smoke.test.ts` can spawn the real built binary.
 */
import { execSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export default function setup(): void {
  execSync("npx tsc -p tsconfig.build.json", {
    cwd: toolRoot,
    stdio: "inherit",
  });
}
