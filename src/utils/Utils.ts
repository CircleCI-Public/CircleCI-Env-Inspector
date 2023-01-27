import chalk from "chalk";

export function exitOnError(e: Error, title?: string) {
  console.error(
    chalk.bold.red(title ?? "Fatal error: "),
    chalk.bold(e.message ?? e ?? "Unknown error")
  );
  process.exit(1);
}

export function printMessage(message: string, title?: string, indent?: number) {
  const titleStyled = title ? chalk.green(title) : "";
  const indentStyled = indent ? " ".repeat(indent) : "";
  console.log(chalk.bold(`${indentStyled}${titleStyled} ${message}`));
}
