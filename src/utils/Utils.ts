import chalk from "chalk";

export function exitOnError(e: Error, title?: string, indent?: number) {
  const titleStyled = title ? chalk.red(title) : "";
  const indentStyled = indent ? " ".repeat(indent) : "";
  console.error(chalk.bold(`${indentStyled}${titleStyled} ${e.message}`));
  process.exit(1);
}

export function printMessage(message: string, title?: string, indent?: number) {
  const titleStyled = title ? chalk.green(title) : "";
  const indentStyled = indent ? " ".repeat(indent) : "";
  console.log(chalk.bold(`${indentStyled}${titleStyled} ${message}`));
}

export function printError(
  message: string,
  title?: string,
  isWarning = false,
  indent?: number
) {
  let titleStyled = title ? title : "";
  isWarning
    ? (titleStyled = chalk.yellow(titleStyled))
    : (titleStyled = chalk.red(titleStyled));
  const indentStyled = indent ? " ".repeat(indent) : "";
  console.error(chalk.bold(`${indentStyled}${titleStyled} ${message}`));
}
