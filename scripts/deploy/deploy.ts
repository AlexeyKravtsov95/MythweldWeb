/**
 * Uploads `dist/` to the VK Cloud Object Storage bucket by the plan in
 * `objects.ts`, one `aws s3 cp` per file with its Content-Type and
 * Cache-Control, then deletes objects the build no longer has.
 *
 *   node scripts/deploy/deploy.ts --dry-run      # validate and print the plan
 *   node scripts/deploy/deploy.ts                # upload (CI only)
 *   node scripts/deploy/deploy.ts --no-prune     # upload, delete nothing
 *
 * Settings come from the environment: S3_ENDPOINT, S3_REGION, S3_BUCKET.
 * The AWS CLI reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY itself; this
 * script never reads, prints or passes the keys.
 */
import { execFile } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { promisify } from "node:util";
import {
  BUCKET,
  CACHE,
  ENDPOINT_PATTERN,
  planUpload,
  staleKeys,
  type CacheClass,
  type UploadItem,
} from "./objects.ts";

const run = promisify(execFile);
const CONCURRENCY = 6;

function listDist(dist: string): string[] {
  return readdirSync(dist, { recursive: true, encoding: "utf8" })
    .filter((entry) => statSync(join(dist, entry)).isFile())
    .map((entry) => relative(dist, join(dist, entry)).split(sep).join("/"))
    .sort();
}

function setting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function target() {
  const endpoint = setting("S3_ENDPOINT").replace(/\/+$/, "");
  const region = setting("S3_REGION");
  const bucket = setting("S3_BUCKET");
  if (bucket !== BUCKET) {
    throw new Error(`S3_BUCKET must be "${BUCKET}", got "${bucket}".`);
  }
  if (!ENDPOINT_PATTERN.test(endpoint)) {
    throw new Error(`S3_ENDPOINT "${endpoint}" is not a VK Cloud S3 endpoint.`);
  }
  return { endpoint, region, bucket };
}

async function pool<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        if (item !== undefined) await worker(item);
      }
    },
  );
  await Promise.all(lanes);
}

function summary(items: readonly UploadItem[]): string {
  const rows = (Object.keys(CACHE) as CacheClass[]).map((cls) => {
    const count = items.filter((item) => item.cacheClass === cls).length;
    return `| ${cls} | ${count} | \`${CACHE[cls]}\` |`;
  });
  return [
    "| Class | Files | Cache-Control |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const prune = !args.has("--no-prune");
  const dist = process.env["DIST"] ?? "dist";

  const keys = listDist(dist);
  const plan = planUpload(keys, readFileSync(join(dist, "robots.txt"), "utf8"));
  console.log(`Plan: ${plan.length} files from ${dist}/\n\n${summary(plan)}\n`);

  if (dryRun) {
    for (const item of plan) {
      console.log(`${item.key}\t${item.contentType}\t${item.cacheControl}`);
    }
    return;
  }

  const { endpoint, region, bucket } = target();
  const common = ["--endpoint-url", endpoint, "--region", region];

  // Read the bucket first: a key without list rights fails here, before
  // anything is uploaded.
  const listed = await run("aws", [
    "s3api",
    "list-objects-v2",
    "--bucket",
    bucket,
    "--query",
    "Contents[].Key",
    "--output",
    "json",
    ...common,
  ]);
  const remote = (JSON.parse(listed.stdout || "null") as string[] | null) ?? [];

  let done = 0;
  await pool(plan, async (item) => {
    await run("aws", [
      "s3",
      "cp",
      join(dist, item.key),
      `s3://${bucket}/${item.key}`,
      "--content-type",
      item.contentType,
      "--cache-control",
      item.cacheControl,
      "--only-show-errors",
      "--no-progress",
      ...common,
    ]);
    done += 1;
    if (done % 25 === 0 || done === plan.length) {
      console.log(`Uploaded ${done}/${plan.length}`);
    }
  });

  const stale = staleKeys(remote, keys);
  if (!prune) {
    console.log(`Prune skipped; ${stale.length} stale objects kept.`);
    return;
  }
  for (const key of stale) {
    await run("aws", ["s3", "rm", `s3://${bucket}/${key}`, ...common]);
    console.log(`Deleted stale ${key}`);
  }
  console.log(`Done: ${plan.length} uploaded, ${stale.length} deleted.`);
}

main().catch((error: unknown) => {
  // Print only the message and the CLI's stderr; neither contains the keys,
  // which reach the AWS CLI through its own environment variables.
  const { message, stderr } = error as { message: string; stderr?: string };
  console.error(stderr?.trim() || message);
  process.exit(1);
});
