import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateAppData } from "./validate-data";

const inputPath = resolve(process.cwd(), "src/data/generated.json");
const parsed: unknown = JSON.parse(await readFile(inputPath, "utf8"));
if (
  typeof parsed !== "object" ||
  parsed === null ||
  !("dataMode" in parsed) ||
  parsed.dataMode !== "real"
) {
  throw new Error("Generated data is not in real mode");
}
const errors = await validateAppData(parsed);
if (errors.length > 0) {
  throw new Error(
    `Real data validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}
console.log(`Real data validation passed: ${inputPath}`);
