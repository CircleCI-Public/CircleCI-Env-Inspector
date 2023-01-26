import chalk from "chalk";

export function exitOnError(e: Error, title?: string) {
  console.error(
    chalk.bold.red(title ?? "Fatal error: "),
    chalk.bold(e.message ?? e ?? "Unknown error")
  );
  process.exit(1);
}
