#!/usr/bin/env node

import { Command } from "commander";
import { apply } from "./commands/apply.js";
import { clean } from "./commands/clean.js";
import { compare } from "./commands/compare.js";
import { type ConfigAction, config } from "./commands/config.js";
import { evaluate } from "./commands/evaluate.js";
import { init } from "./commands/init.js";
import { list } from "./commands/list.js";
import { retry, run } from "./commands/run.js";
import { stats } from "./commands/stats.js";
import { undo } from "./commands/undo.js";
import { loadConfig } from "./utils/config.js";
import { resolvePrompt } from "./utils/prompt.js";

const program = new Command();

program
  .name("thinktank")
  .description(
    "Ensemble AI coding — run N parallel agents on the same task, select the best result",
  )
  .version("0.1.0");

const cfg = loadConfig();

program
  .command("run")
  .description("Run a task with N parallel AI coding agents")
  .argument("[prompt]", "The coding task to perform")
  .option("-n, --attempts <number>", "Number of parallel attempts", String(cfg.attempts))
  .option("-f, --file <path>", "Read prompt from a file (avoids shell expansion issues)")
  .option("-t, --test-cmd <command>", "Test command to verify results (e.g., 'npm test')")
  .option(
    "--test-timeout <seconds>",
    "Timeout for test command in seconds",
    String(cfg.testTimeout),
  )
  .option("--timeout <seconds>", "Timeout per agent in seconds", String(cfg.timeout))
  .option("--no-timeout", "Disable agent timeout entirely")
  .option("--model <model>", "Claude model to use", cfg.model)
  .option("-r, --runner <name>", "AI coding tool to use", cfg.runner)
  .option(
    "--threshold <number>",
    "Convergence clustering similarity threshold (0.0-1.0)",
    String(cfg.threshold),
  )
  .option("--scoring <method>", "Scoring method: copeland (default) or weighted", "copeland")
  .option("--no-color", "Disable colored output")
  .option("--output-format <format>", "Output format: text (default), json, or diff", "text")
  .option("--verbose", "Show detailed output from each agent")
  .option("--whitespace-insensitive", "Ignore whitespace differences in convergence comparison")
  .option("--retry", "Re-run only failed/timed-out agents from the last run")
  .action(async (promptArg: string | undefined, opts) => {
    const testTimeout = parseInt(opts.testTimeout, 10);
    if (Number.isNaN(testTimeout) || testTimeout < 10 || testTimeout > 600) {
      console.error("Error: --test-timeout must be a number between 10 and 600 seconds");
      process.exit(1);
    }

    // --no-timeout: commander sets opts.timeout to false
    const timeout = opts.timeout === false ? 0 : parseInt(opts.timeout, 10);
    if (opts.timeout !== false && (Number.isNaN(timeout) || timeout < 10 || timeout > 1800)) {
      console.error("Error: --timeout must be a number between 10 and 1800 seconds");
      process.exit(1);
    }

    const threshold = parseFloat(opts.threshold);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
      console.error("Error: --threshold must be a number between 0.0 and 1.0");
      process.exit(1);
    }

    const validScoring = ["weighted", "copeland"];
    if (!validScoring.includes(opts.scoring)) {
      console.error(`Error: --scoring must be one of: ${validScoring.join(", ")}`);
      process.exit(1);
    }

    // --no-color: commander parses --no-color as opts.color === false
    if (opts.color === false) {
      process.env.NO_COLOR = "1";
    }

    const validFormats = ["text", "json", "diff"];
    if (!validFormats.includes(opts.outputFormat)) {
      console.error(`Error: --output-format must be one of: ${validFormats.join(", ")}`);
      process.exit(1);
    }

    // --retry: re-run only failed agents from last run, ignore --attempts and prompt
    if (opts.retry) {
      await retry({
        prompt: "", // ignored — loaded from previous result
        attempts: 0, // ignored — determined by failed agent count
        testCmd: opts.testCmd,
        testTimeout,
        timeout,
        model: opts.model,
        threshold,
        runner: opts.runner,
        scoring: opts.scoring,
        verbose: opts.verbose ?? false,
        outputFormat: opts.outputFormat,
        retry: true,
        whitespaceInsensitive: opts.whitespaceInsensitive ?? false,
      });
      return;
    }

    const prompt = resolvePrompt(promptArg, opts.file);

    const attempts = parseInt(opts.attempts, 10);
    if (Number.isNaN(attempts) || attempts < 1 || attempts > 20) {
      console.error("Error: --attempts must be a number between 1 and 20");
      process.exit(1);
    }

    const knownModels = ["sonnet", "opus", "haiku"];
    if (
      !knownModels.includes(opts.model) &&
      !opts.model.startsWith("claude-") &&
      !opts.model.startsWith("anthropic.")
    ) {
      console.warn(
        `Warning: unknown model "${opts.model}" — known models: ${knownModels.join(", ")}`,
      );
    }

    await run({
      prompt,
      attempts,
      testCmd: opts.testCmd,
      testTimeout,
      timeout,
      model: opts.model,
      threshold,
      runner: opts.runner,
      scoring: opts.scoring,
      verbose: opts.verbose ?? false,
      outputFormat: opts.outputFormat,
      whitespaceInsensitive: opts.whitespaceInsensitive ?? false,
    });
  });

program
  .command("apply")
  .description("Apply the recommended (or selected) agent's changes to your repo")
  .option("-a, --agent <number>", "Apply a specific agent's changes instead of the recommended one")
  .option("-p, --preview", "Show the diff without applying")
  .option("-d, --dry-run", "Show what would be applied without making changes")
  .action(async (opts) => {
    await apply({
      agent: opts.agent ? parseInt(opts.agent, 10) : undefined,
      preview: opts.preview ?? false,
      dryRun: opts.dryRun ?? false,
    });
  });

program
  .command("init")
  .description("Set up thinktank in the current project (checks prereqs, detects test command)")
  .action(async () => {
    await init();
  });

program
  .command("undo")
  .description("Reverse the last applied diff (from `thinktank apply`)")
  .action(async () => {
    await undo();
  });

program
  .command("compare <agentA> <agentB>")
  .description("Compare two agents' results side by side")
  .action(async (agentA: string, agentB: string) => {
    await compare({
      agentA: parseInt(agentA, 10),
      agentB: parseInt(agentB, 10),
    });
  });

program
  .command("list")
  .description("List all past runs, or show details for a specific run")
  .argument("[run-number]", "Run number to show details for")
  .action(async (runNumberArg?: string) => {
    const runNumber = runNumberArg ? parseInt(runNumberArg, 10) : undefined;
    if (runNumberArg && (Number.isNaN(runNumber) || (runNumber as number) < 1)) {
      console.error("Error: run number must be a positive integer");
      process.exit(1);
    }
    await list(runNumber);
  });

program
  .command("clean")
  .description("Remove thinktank worktrees, branches, and optionally run history")
  .option("--all", "Also delete .thinktank/ run history")
  .action(async (opts) => {
    await clean({
      all: opts.all ?? false,
    });
  });

program
  .command("stats")
  .description("Show aggregate statistics across all thinktank runs")
  .option("--model <name>", "Filter to runs using the specified model")
  .option("--since <date>", "Show only runs from this date onward (ISO 8601)")
  .option("--until <date>", "Show only runs up to this date (ISO 8601)")
  .option("--passed-only", "Show only runs where at least one agent passed tests")
  .action(async (opts) => {
    await stats({
      model: opts.model,
      since: opts.since,
      until: opts.until,
      passedOnly: opts.passedOnly,
    });
  });

program
  .command("evaluate")
  .description("Compare scoring methods (weighted vs Copeland vs Borda) across all runs")
  .action(async () => {
    await evaluate();
  });

const configCmd = program
  .command("config")
  .description("View and update thinktank configuration (.thinktank/config.json)");

configCmd
  .command("set <key> <value>")
  .description("Set a config value")
  .action((key: string, value: string) => {
    config("set", key, value);
  });

configCmd
  .command("get <key>")
  .description("Get a config value")
  .action((key: string) => {
    config("get", key);
  });

configCmd
  .command("list")
  .description("List all config values")
  .action(() => {
    config("list");
  });

program.parse();
