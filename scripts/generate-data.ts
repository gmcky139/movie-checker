import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AppData, DataMode } from "../src/domain/types";
import { createSampleData } from "./generate-sample-data";
import { fetchRealData } from "./fetch-real-data";
import { validateAppData } from "./validate-data";

type GenerateOptions = {
  outputPath?: string;
  now?: Date;
  fetchReal?: (now: Date) => Promise<AppData>;
};

export async function generateData(mode: DataMode, options: GenerateOptions = {}): Promise<void> {
  const now = options.now ?? new Date();
  const data =
    mode === "real" ? await (options.fetchReal ?? fetchRealData)(now) : createSampleData(now);
  const errors = await validateAppData(data, { now });
  if (errors.length > 0) {
    throw new Error(
      `Generated ${mode} data is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  const outputPath = options.outputPath ?? resolve(process.cwd(), "src/data/generated.json");
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporaryPath, outputPath);
  } catch (error: unknown) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  console.log(`Generated ${mode} data: ${outputPath}`);
}

async function main(): Promise<void> {
  const mode = process.env.DATA_MODE ?? "sample";
  if (mode !== "sample" && mode !== "real") {
    throw new Error(`DATA_MODE must be sample or real, received: ${mode}`);
  }
  await generateData(mode);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
