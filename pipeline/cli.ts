import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildDataset, type DatasetBuildResult } from "./buildDataset";
import {
  DEFAULT_STAGING_ROOT,
  FIXTURE_INPUT_PATH,
  type DatasetBuildInput,
} from "./config";
import {
  validateDataset,
  type DatasetValidationResult,
} from "./validateDataset";

export async function runPipelineCli(
  args: string[],
): Promise<DatasetBuildResult | DatasetValidationResult> {
  const command = args[0];
  const stagingRoot = resolve(
    optionValue(args, "--staging") ?? DEFAULT_STAGING_ROOT,
  );

  if (command === "build") {
    const inputPath = args.includes("--fixtures")
      ? FIXTURE_INPUT_PATH
      : optionValue(args, "--input");
    if (!inputPath) {
      throw new Error("Build requires --fixtures or --input <path>");
    }
    const input = JSON.parse(
      await readFile(resolve(inputPath), "utf8"),
    ) as DatasetBuildInput;
    return buildDataset(input, { stagingRoot });
  }
  if (command === "validate") return validateDataset(stagingRoot);
  throw new Error("Usage: pipeline/cli.ts <build|validate> [options]");
}

function optionValue(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runPipelineCli(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
