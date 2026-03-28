import pc from "picocolors";
import {
  BUILT_IN_DEFAULTS,
  getConfigValue,
  loadConfig,
  loadFileConfig,
  setConfigValue,
} from "../utils/config.js";

export type ConfigAction = "set" | "get" | "list";

export function config(action: ConfigAction, key?: string, value?: string): void {
  switch (action) {
    case "set": {
      if (!key || value === undefined) {
        console.error("Usage: thinktank config set <key> <value>");
        process.exit(1);
      }
      const error = setConfigValue(key, value);
      if (error) {
        console.error(`  Error: ${error}`);
        process.exit(1);
      }
      console.log(`  ${pc.green("✓")} Set ${pc.bold(key)} = ${pc.cyan(value)}`);
      break;
    }

    case "get": {
      if (!key) {
        console.error("Usage: thinktank config get <key>");
        process.exit(1);
      }
      const result = getConfigValue(key);
      if (typeof result === "string") {
        console.error(`  Error: ${result}`);
        process.exit(1);
      }
      const sourceLabel = result.source === "config" ? pc.green("config") : pc.dim("default");
      console.log(`  ${pc.bold(key)} = ${pc.cyan(result.value)} (${sourceLabel})`);
      break;
    }

    case "list": {
      const resolved = loadConfig();
      const fileConfig = loadFileConfig();
      console.log();
      console.log(pc.bold("  thinktank configuration"));
      console.log();
      for (const key of Object.keys(BUILT_IN_DEFAULTS) as Array<keyof typeof BUILT_IN_DEFAULTS>) {
        const value = String(resolved[key]);
        const isCustom = key in fileConfig;
        const sourceLabel = isCustom ? pc.green("config") : pc.dim("default");
        console.log(`  ${pc.bold(key.padEnd(14))} ${pc.cyan(value.padEnd(14))} ${sourceLabel}`);
      }
      console.log();
      break;
    }
  }
}
