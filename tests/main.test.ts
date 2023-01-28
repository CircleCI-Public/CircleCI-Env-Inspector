import { printError, printMessage, printWarning } from "../src/utils/Utils";
import { jest } from "@jest/globals";
import stripAnsi from "strip-ansi";

describe("printMessage", () => {
  it("should call console.log with the correct message", () => {
    const spy = jest.spyOn(console, "log");
    printMessage("Hello world", "Message", 2);
    expect(stripAnsi(spy.mock.calls[0][0])).toEqual("  Message Hello world");
    spy.mockRestore();
  });
});

describe("printWarning", () => {
  it("should call console.warn with the correct message", () => {
    const spy = jest.spyOn(console, "warn");
    printWarning("A warning occurred", "Warning", 2);
    expect(stripAnsi(spy.mock.calls[0][0])).toEqual(
      "  Warning A warning occurred"
    );
    spy.mockRestore();
  });
});

describe("printError", () => {
  it("should call console.error with the correct message", () => {
    const spy = jest.spyOn(console, "error");
    printError("An error occurred", "Error", 2);
    expect(stripAnsi(spy.mock.calls[0][0])).toEqual(
      "  Error An error occurred"
    );
    spy.mockRestore();
  });
});
