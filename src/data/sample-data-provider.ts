import generatedData from "./generated.json";
import type { AppData, MovieDataProvider } from "../domain/types";

export class SampleDataProvider implements MovieDataProvider {
  async load(): Promise<AppData> {
    return structuredClone(generatedData as AppData);
  }
}
