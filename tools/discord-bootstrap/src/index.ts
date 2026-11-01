/**
 * CLI entry point.
 *
 * Usage:
 *   node dist/index.js --dry-run   # read-only plan, never mutates the guild
 *   node dist/index.js --apply     # apply after explicit local confirmation
 *
 * The bot token is loaded from the environment (see .env.example) and is
 * scrubbed from every error message before printing.
 */
import * as readline from "node:readline/promises";
import { ConfigError, loadEnv, redactSecrets } from "./config.js";
import { createDiscordConnection } from "./discord.js";
import { runApply, runDryRun, type ApplyOutcome } from "./executor.js";
import type { BootstrapPlan } from "./planner.js";

type RunMode = "dry-run" | "apply";

function parseArgs(argv: readonly string[]): RunMode | null {
  let mode: RunMode | null = null;
  for (const arg of argv) {
    if (arg === "--dry-run" && mode === null) {
      mode = "dry-run";
    } else if (arg === "--apply" && mode === null) {
      mode = "apply";
    } else {
      throw new ConfigError(`Неизвестный или повторный аргумент: ${arg}`);
    }
  }
  return mode;
}

const USAGE = [
  "Mythweld Discord Bootstrap (DISCORD-M0)",
  "",
  "Использование:",
  "  npm run setup:dry   — показать план изменений (ничего не меняет)",
  "  npm run setup:apply — применить план с подтверждением владельца",
  "",
  "Переменные окружения (см. .env.example): DISCORD_BOT_TOKEN, DISCORD_GUILD_ID.",
].join("\n");

function line(label: string, status: string): string {
  return `  [${status}] ${label}`;
}

export function renderPlan(plan: BootstrapPlan): string {
  const parts: string[] = [];
  parts.push("== План настройки Discord-сервера Mythweld ==");
  parts.push("");
  parts.push("Роли:");
  for (const role of plan.roles) {
    parts.push(
      line(role.name, role.action === "create" ? "создать" : "существует"),
    );
  }
  parts.push("");
  parts.push("Категории:");
  for (const category of plan.categories) {
    const status =
      category.action === "create"
        ? "создать"
        : category.action === "exists"
          ? "существует"
          : "конфликт";
    parts.push(line(category.name, status));
  }
  parts.push("");
  parts.push("Каналы:");
  for (const channel of plan.channels) {
    const kind = channel.kind === "forum" ? "форум" : "текстовый";
    const status =
      channel.action === "create"
        ? "создать"
        : channel.action === "exists"
          ? "существует"
          : "конфликт";
    parts.push(line(`#${channel.name} (${kind})`, status));
  }
  parts.push("");
  parts.push("Стартовые сообщения (EN + RU):");
  for (const message of plan.messages) {
    const status =
      message.action === "send"
        ? "отправить"
        : message.action === "skip"
          ? "уже опубликовано"
          : "заблокировано";
    parts.push(line(`#${message.channelKey}`, status));
  }
  if (plan.conflicts.length > 0) {
    parts.push("");
    parts.push("Конфликты (решаются вручную, инструмент их не трогает):");
    for (const conflict of plan.conflicts) {
      parts.push(`  - ${conflict.message}`);
    }
  }
  if (plan.warnings.length > 0) {
    parts.push("");
    parts.push("Предупреждения:");
    for (const warning of plan.warnings) {
      parts.push(`  - ${warning}`);
    }
  }
  const toCreate =
    plan.roles.filter((role) => role.action === "create").length +
    plan.categories.filter((category) => category.action === "create").length +
    plan.channels.filter((channel) => channel.action === "create").length +
    plan.messages.filter((message) => message.action === "send").length;
  parts.push("");
  parts.push(
    `Итог: создать ${toCreate}, конфликтов ${plan.conflicts.length}. ` +
      "Повторный запуск не дублирует существующее.",
  );
  return parts.join("\n");
}

function renderOutcome(outcome: ApplyOutcome): string {
  const marks: Record<string, string> = {
    ok: "OK",
    skipped: "ПРОПУЩЕНО",
    failed: "ОШИБКА",
    warning: "ВНИМАНИЕ",
  };
  const parts: string[] = ["== Отчёт о применении =="];
  for (const step of outcome.steps) {
    parts.push(
      `  ${marks[step.status] ?? step.status}\t${step.label} — ${step.detail}`,
    );
  }
  const ok = outcome.steps.filter((step) => step.status === "ok").length;
  const skipped = outcome.steps.filter(
    (step) => step.status === "skipped",
  ).length;
  const warnings = outcome.steps.filter(
    (step) => step.status === "warning",
  ).length;
  const failed = outcome.steps.filter(
    (step) => step.status === "failed",
  ).length;
  parts.push("");
  parts.push(
    `Итог: успешно ${ok}, пропущено ${skipped}, предупреждений ${warnings}, ошибок ${failed}.`,
  );
  if (failed > 0 || warnings > 0) {
    parts.push(
      "Исправьте перечисленные проблемы и запустите команду снова — повтор безопасен.",
    );
  }
  return parts.join("\n");
}

async function askForConfirmation(plan: BootstrapPlan): Promise<boolean> {
  if (process.stdin.isTTY !== true) {
    console.log(
      "Ввод недоступен (не TTY): подтверждение невозможно, применение отменено.",
    );
    return false;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    console.log(renderPlan(plan));
    console.log("");
    const answer = (
      await rl.question(
        "Применить эти изменения? Введите YES для подтверждения: ",
      )
    ).trim();
    return answer === "YES";
  } finally {
    rl.close();
  }
}

async function main(): Promise<number> {
  const mode = parseArgs(process.argv.slice(2));
  if (mode === null) {
    console.log(USAGE);
    return 1;
  }
  const env = loadEnv();
  const connection = createDiscordConnection(env.botToken, env.guildId);
  try {
    console.log("Подключение к Discord…");
    await connection.login();
    console.log(`Подключено. Бот: <@${connection.api.botUserId}>`);
    if (mode === "dry-run") {
      const plan = await runDryRun(connection.api);
      console.log(renderPlan(plan));
      console.log("");
      console.log("Dry-run завершён: изменения не вносились.");
      return 0;
    }
    const outcome = await runApply(connection.api, {
      confirm: askForConfirmation,
      secrets: [env.botToken],
    });
    if (outcome.status === "permission-denied") {
      console.log(renderOutcome(outcome));
      console.log("");
      console.log("Применение остановлено: недостаточно прав у бота.");
      return 1;
    }
    if (outcome.status === "aborted") {
      console.log("Применение отменено владельцем. Изменения не вносились.");
      return 1;
    }
    console.log(renderOutcome(outcome));
    return outcome.status === "applied" ? 0 : 1;
  } finally {
    await connection.destroy();
  }
}

function loadEnvTokenSafe(): readonly string[] {
  try {
    return [loadEnv().botToken];
  } catch {
    return [];
  }
}

void main().then(
  (code: number) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // Never print the token, even if an error message happens to contain it.
    console.error(redactSecrets(message, loadEnvTokenSafe()));
    if (error instanceof ConfigError) {
      console.error("");
      console.error(USAGE);
    }
    process.exitCode = 1;
  },
);
