import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest/presets/js-with-babel-esm",
  extensionsToTreatAsEsm: [".ts"],
};

export default jestConfig;
