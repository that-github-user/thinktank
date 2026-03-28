import { readFileSync } from "node:fs";

/**
 * Resolve the prompt from positional arg, --file, or stdin (piped).
 * Exits with a helpful error when no prompt source is found.
 */
export function resolvePrompt(
  positionalArg: string | undefined,
  filePath: string | undefined,
): string {
  if (filePath) {
    try {
      const content = readFileSync(filePath, "utf-8").trim();
      if (!content) {
        console.error(`Error: prompt file is empty: ${filePath}`);
        process.exit(1);
      }
      return content;
    } catch (err) {
      console.error(`Error: could not read prompt file: ${filePath}`);
      console.error((err as Error).message);
      process.exit(1);
    }
  }

  if (positionalArg) {
    return positionalArg;
  }

  // Try reading from stdin if it's piped (not a TTY)
  if (!process.stdin.isTTY) {
    try {
      const stdinContent = readFileSync(0, "utf-8").trim();
      if (stdinContent) {
        return stdinContent;
      }
    } catch {
      // stdin not readable, fall through to error
    }
  }

  console.error("Error: no prompt provided.");
  console.error("Usage: thinktank run <prompt>");
  console.error("       thinktank run -f <file>");
  console.error("       echo 'prompt' | thinktank run");
  process.exit(1);
}
