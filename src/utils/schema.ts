import type { EnsembleResult } from "../types.js";

/**
 * Validate that a parsed JSON object has the required shape of an EnsembleResult.
 * Returns null on success, or a descriptive error string on failure.
 */
export function validateResult(data: unknown): string | null {
  if (data === null || typeof data !== "object") {
    return "result must be a non-null object";
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.prompt !== "string") {
    return "missing or invalid field: prompt (expected string)";
  }
  if (typeof obj.model !== "string") {
    return "missing or invalid field: model (expected string)";
  }
  if (typeof obj.timestamp !== "string") {
    return "missing or invalid field: timestamp (expected string)";
  }
  if (obj.scoring !== "weighted" && obj.scoring !== "copeland") {
    return 'missing or invalid field: scoring (expected "weighted" or "copeland")';
  }
  if (!Array.isArray(obj.agents)) {
    return "missing or invalid field: agents (expected array)";
  }
  if (!Array.isArray(obj.tests)) {
    return "missing or invalid field: tests (expected array)";
  }
  if (!Array.isArray(obj.convergence)) {
    return "missing or invalid field: convergence (expected array)";
  }
  if (obj.recommended !== null && typeof obj.recommended !== "number") {
    return "missing or invalid field: recommended (expected number or null)";
  }
  if (!Array.isArray(obj.scores)) {
    return "missing or invalid field: scores (expected array)";
  }

  return null;
}

/**
 * Parse JSON and validate as EnsembleResult. Returns the result or throws with a descriptive message.
 */
export function parseAndValidateResult(json: string, filename: string): EnsembleResult {
  const data = JSON.parse(json);
  const error = validateResult(data);
  if (error) {
    throw new Error(`Invalid result file ${filename}: ${error}`);
  }
  return data as EnsembleResult;
}
