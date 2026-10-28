/**
 * No credentials in the repository or in the build (`npm run build` first).
 * Fixtures are assembled from pieces so this file never holds a credential
 * shape itself.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  filesUnder,
  isSecretFile,
  scanFiles,
  scanText,
  trackedFiles,
} from "../scripts/check-secrets.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("secret scan", () => {
  it("finds nothing in tracked files", () => {
    const files = trackedFiles(root).map((file) => join(root, file));
    expect(files.length).toBeGreaterThan(50);
    expect(scanFiles(files)).toEqual([]);
  });

  it("finds nothing in dist/", () => {
    const dist = join(root, "dist");
    expect(existsSync(dist)).toBe(true);
    expect(scanFiles(filesUnder(dist))).toEqual([]);
  });

  it("tracks no .env, key or credentials files", () => {
    expect(trackedFiles(root).filter(isSecretFile)).toEqual([]);
    for (const file of [
      ".env",
      ".env.production",
      "deploy/site.pem",
      "credentials",
    ]) {
      expect(isSecretFile(file), file).toBe(true);
    }
    expect(isSecretFile(".env.example")).toBe(false);
  });

  it.each([
    ["aws-access-key-id", `id ${"AKIA"}${"ABCDEFGHIJKLMNOP"}`],
    [
      "secret-assignment",
      `VK_S3_SECRET_ACCESS_KEY=${"wJalrXUtnFEMI"}${"K7MDENGbPxRfiCY"}`,
    ],
    [
      "secret-assignment",
      `aws_access_key_id: "${"4d6ZCC6Aym"}${"HyFGbM4sZa"}"`,
    ],
    ["private-key", `-----BEGIN ${"RSA PRIVATE"} KEY-----`],
    ["github-token", `${"ghp"}_${"a".repeat(36)}`],
    ["url-credentials", `https://${"user"}:${"hunter2"}@example.test/`],
  ])("detects %s", (rule, line) => {
    expect(scanText("fixture", `ok\n${line}\n`)).toEqual([
      { file: "fixture", line: 2, rule },
    ]);
  });

  it("allows references to GitHub secrets by name", () => {
    expect(
      scanText(
        "workflow",
        "AWS_SECRET_ACCESS_KEY: ${{ secrets.VK_S3_SECRET_ACCESS_KEY }}\n" +
          "Add VK_S3_ACCESS_KEY_ID and VK_S3_SECRET_ACCESS_KEY as secrets.",
      ),
    ).toEqual([]);
  });
});
