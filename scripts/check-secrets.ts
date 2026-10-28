/**
 * Looks for credentials in tracked files and in the build output:
 *
 *   node scripts/check-secrets.ts            # tracked files (git ls-files)
 *   node scripts/check-secrets.ts dist       # every file under dist/
 *
 * Findings name the file, line and rule, never the matched value, so the
 * output is safe for CI logs. `tests/secrets.test.ts` runs the same scan.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface Rule {
  id: string;
  pattern: RegExp;
}

/**
 * Credential shapes. VK Cloud S3 keys have no fixed prefix, so they are
 * caught by assignment (`VK_S3_SECRET_ACCESS_KEY=…`, also inside longer
 * names) rather than by shape; values that are GitHub expressions
 * (`${{ secrets.X }}`) start with `$` and pass.
 */
export const RULES: readonly Rule[] = [
  { id: "aws-access-key-id", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    id: "secret-assignment",
    pattern:
      /(?:secret_access_key|secret_key|access_key_id|access_key|client_secret|api_key|password)["']?\s*[:=]\s*["']?[A-Za-z0-9/+=_-]{12,}/i,
  },
  { id: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    id: "github-token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  },
  { id: "slack-token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    id: "url-credentials",
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@"'`]+:[^\s/:@"'`]+@/i,
  },
];

/** Binary formats in this repository; they are not scanned as text. */
const BINARY = /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|pdf)$/i;

export interface Finding {
  file: string;
  line: number;
  rule: string;
}

export function scanText(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  text.split("\n").forEach((content, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(content)) {
        findings.push({ file, line: index + 1, rule: rule.id });
      }
    }
  });
  return findings;
}

/** Files that hold credentials by convention must never be committed. */
export function isSecretFile(file: string): boolean {
  const name = file.slice(file.lastIndexOf("/") + 1);
  return (
    (/^\.env(\..+)?$/.test(name) && name !== ".env.example") ||
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /^credentials(\.json)?$/i.test(name)
  );
}

export function trackedFiles(cwd: string): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

export function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile());
}

export function scanFiles(files: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    if (isSecretFile(file)) {
      findings.push({ file, line: 0, rule: "secret-file" });
    }
    if (BINARY.test(file)) continue;
    findings.push(...scanText(file, readFileSync(file, "utf8")));
  }
  return findings;
}

function main(): void {
  const dir = process.argv[2];
  const files =
    dir === undefined ? trackedFiles(process.cwd()) : filesUnder(dir);
  const findings = scanFiles(files);
  for (const f of findings) console.error(`${f.file}:${f.line}: ${f.rule}`);
  console.log(
    `Secret scan: ${files.length} files, ${findings.length} finding(s).`,
  );
  if (findings.length > 0) process.exit(1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
