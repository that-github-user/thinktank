import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { EnsembleResult } from "../types.js";
import { displayResults } from "../utils/display.js";

export async function list(): Promise<void> {
  try {
    const raw = await readFile(join(".thinktank", "latest.json"), "utf-8");
    const result: EnsembleResult = JSON.parse(raw);
    displayResults(result);
  } catch {
    console.log("  No results found. Run `thinktank run` first.");
  }
}
