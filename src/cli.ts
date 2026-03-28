#!/usr/bin/env node

import { Command } from "commander";
import { apply } from "./commands/apply.js";
import { compare } from "./commands/compare.js";
import { list } from "./commands/list.js";
import { run } from "./commands/run.js";

const program = new Command();

program
  .name("thinktank")
  .description(
    "Ensemble AI coding — run N parallel agents on the same task, select the best result",
  )
  .version("0.1.0");

program
  .command("run")
  .description("Run a task with N parallel AI coding agents")
  .argument("<prompt>", "The coding task to perform")
  .option("-n, --attempts <number>", "Number of parallel attempts", "3")
  .option("-t, --test-cmd <command>", "Test command to verify results (e.g., 'npm test')")
  .option("--timeout <seconds>", "Timeout per agent in seconds", "300")
  .option("--model <model>", "Claude model to use", "sonnet")
  .option("-r, --runner <name>", "AI coding tool to use (default: claude-code)")
  .option("--verbose", "Show detailed output from each agent")
  .action(async (prompt: string, opts) => {
    const attempts = parseInt(opts.attempts, 10);
    if (Number.isNaN(attempts) || attempts < 1 || attempts > 20) {
      console.error("Error: --attempts must be a number between 1 and 20");
      process.exit(1);
    }

    const timeout = parseInt(opts.timeout, 10);
    if (Number.isNaN(timeout) || timeout < 10 || timeout > 600) {
      console.error("Error: --timeout must be a number between 10 and 600 seconds");
      process.exit(1);
    }

    const knownModels = ["sonnet", "opus", "haiku"];
    if (!knownModels.includes(opts.model) && !opts.model.startsWith("claude-")) {
      console.warn(
        `Warning: unknown model "${opts.model}" — known models: ${knownModels.join(", ")}`,
      );
    }

    await run({
      prompt,
      attempts,
      testCmd: opts.testCmd,
      timeout,
      model: opts.model,
      runner: opts.runner,
      verbose: opts.verbose ?? false,
    });
  });

program
  .command("apply")
  .description("Apply the recommended (or selected) agent's changes to your repo")
  .option("-a, --agent <number>", "Apply a specific agent's changes instead of the recommended one")
  .option("-p, --preview", "Show the diff without applying")
  .action(async (opts) => {
    await apply({
      agent: opts.agent ? parseInt(opts.agent, 10) : undefined,
      preview: opts.preview ?? false,
    });
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
  .description("List results from the most recent ensemble run")
  .action(async () => {
    await list();
  });

program.parse();
