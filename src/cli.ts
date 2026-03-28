#!/usr/bin/env node

import { Command } from "commander";
import { run } from "./commands/run.js";
import { list } from "./commands/list.js";

const program = new Command();

program
  .name("thinktank")
  .description(
    "Ensemble AI coding — run N parallel agents on the same task, select the best result"
  )
  .version("0.1.0");

program
  .command("run")
  .description("Run a task with N parallel Claude Code agents")
  .argument("<prompt>", "The coding task to perform")
  .option("-n, --attempts <number>", "Number of parallel attempts", "3")
  .option(
    "-t, --test-cmd <command>",
    "Test command to verify results (e.g., 'npm test')"
  )
  .option("--timeout <seconds>", "Timeout per agent in seconds", "300")
  .option("--model <model>", "Claude model to use", "sonnet")
  .option("--verbose", "Show detailed output from each agent")
  .action(async (prompt: string, opts) => {
    await run({
      prompt,
      attempts: parseInt(opts.attempts, 10),
      testCmd: opts.testCmd,
      timeout: parseInt(opts.timeout, 10),
      model: opts.model,
      verbose: opts.verbose ?? false,
    });
  });

program
  .command("list")
  .description("List results from the most recent ensemble run")
  .action(async () => {
    await list();
  });

program.parse();
