import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pc from "picocolors";
import { setConfigValue } from "../utils/config.js";

const exec = promisify(execFile);

export async function init(): Promise<void> {
  console.log();
  console.log(pc.bold("  thinktank init"));
  console.log(pc.dim("  ─".repeat(20)));
  console.log();

  // Step 1: Check Claude Code CLI
  console.log("  Checking Claude Code CLI...");
  try {
    await exec("claude", ["--version"]);
    console.log(pc.green("  ✓ Claude Code CLI is installed"));
  } catch {
    console.log(pc.red("  ✗ Claude Code CLI not found"));
    console.log(pc.dim("    Install: https://docs.anthropic.com/en/docs/claude-code"));
    console.log();
    return;
  }

  // Step 2: Check git repo
  console.log("  Checking git repository...");
  try {
    await exec("git", ["rev-parse", "--show-toplevel"]);
    console.log(pc.green("  ✓ Git repository detected"));
  } catch {
    console.log(pc.red("  ✗ Not a git repository"));
    console.log(pc.dim("    Run this command from inside a git repo"));
    console.log();
    return;
  }

  // Step 3: Detect test command
  console.log("  Detecting test command...");
  let testCmd: string | null = null;
  try {
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    if (pkg.scripts?.test && !pkg.scripts.test.includes("no test specified")) {
      testCmd = "npm test";
      console.log(pc.green(`  ✓ Found: ${testCmd}`));
    }
  } catch {
    // No package.json
  }
  if (!testCmd) {
    try {
      await access("Makefile");
      testCmd = "make test";
      console.log(pc.green(`  ✓ Found: ${testCmd}`));
    } catch {
      // No Makefile
    }
  }
  if (!testCmd) {
    try {
      await access("Cargo.toml");
      testCmd = "cargo test";
      console.log(pc.green(`  ✓ Found: ${testCmd}`));
    } catch {
      // No Cargo.toml
    }
  }
  if (!testCmd) {
    console.log(pc.yellow("  ⚠ No test command detected"));
    console.log(pc.dim("    Use -t flag to specify: thinktank run -t 'npm test' ..."));
  }

  // Step 4: Set up defaults
  console.log("  Setting up defaults...");
  setConfigValue("attempts", "5");
  console.log(pc.green("  ✓ Default attempts: 5"));

  // Step 5: Summary
  console.log();
  console.log(pc.bold("  Ready!"));
  console.log();
  console.log("  Try your first run:");
  if (testCmd) {
    console.log(pc.cyan(`    thinktank run "describe what this project does" -t "${testCmd}"`));
  } else {
    console.log(pc.cyan('    thinktank run "describe what this project does"'));
  }
  console.log();
}
