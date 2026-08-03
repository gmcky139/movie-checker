import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createSampleData } from "./generate-sample-data";
import { fetchRealData } from "./fetch-real-data";
import { validateAppData } from "./validate-data";

async function main(): Promise<void> {
  const mode = process.env.DATA_MODE ?? "sample";
  if (mode !== "sample" && mode !== "real") {
    throw new Error(`DATA_MODE must be sample or real, received: ${mode}`);
  }

  const data = mode === "real" ? await fetchRealData() : createSampleData();
  const errors = await validateAppData(data);
  if (errors.length > 0) {
    throw new Error(
      `Generated ${mode} data is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  const outputPath = resolve(process.cwd(), "src/data/generated.json");
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

await main();
