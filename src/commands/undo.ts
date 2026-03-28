import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pc from "picocolors";
import { getRepoRoot } from "../utils/git.js";

const exec = promisify(execFile);

export async function undo(): Promise<void> {
  const repoRoot = await getRepoRoot();
  const patchPath = join(repoRoot, ".thinktank", "last-applied.patch");

  let patch: string;
  try {
    patch = await readFile(patchPath, "utf-8");
  } catch {
    console.error(pc.red("  No applied patch to undo."));
    console.error();
    console.error("  Run `thinktank apply` first to apply an agent's changes.");
    process.exit(1);
  }

  console.log("  Reversing last applied patch...");

  try {
    const child = exec("git", ["apply", "--reverse", "-"], { cwd: repoRoot });
    child.child.stdin?.write(patch);
    child.child.stdin?.end();
    await child;
  } catch (err: unknown) {
    const e = err as { stderr?: string };
    console.error(pc.red("  Failed to reverse the patch."));
    if (e.stderr) console.error(`  ${e.stderr}`);
    console.error("  The patch file is at: .thinktank/last-applied.patch");
    console.error("  You may need to reverse changes manually.");
    process.exit(1);
  }

  await rm(patchPath).catch(() => {});

  console.log(pc.green("  Undo complete — last applied patch has been reversed."));
  console.log();
  console.log("  Review with: git diff");
  console.log();
}
