import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AppData } from "../src/domain/types";

const data = JSON.parse(
  await readFile(resolve(process.cwd(), "src/data/generated.json"), "utf8"),
) as AppData;
const coverage = data.posterCoverage;
if (!coverage) throw new Error("Generated data has no poster coverage summary");

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (!summaryPath) throw new Error("GITHUB_STEP_SUMMARY is not available");

await appendFile(
  summaryPath,
  [
    "## TMDB poster coverage",
    "",
    `- Coverage: ${coverage.coveragePercent}%`,
    `- Matched: ${coverage.matchedCount}`,
    `- Eligible: ${coverage.eligibleCount}`,
    `- Unmatched: ${coverage.unmatchedTitles.length}`,
    "",
  ].join("\n"),
  "utf8",
);
