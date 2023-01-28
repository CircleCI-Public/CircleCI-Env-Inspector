import chalk from "chalk";

export function exitOnError(e: Error, title?: string, indent?: number) {
  const titleStyled = title ? chalk.red(title) : "";
  const indentStyled = indent ? " ".repeat(indent) : "";
  console.error(chalk.bold(`${indentStyled}${titleStyled} ${e.message}`));
  process.exit(1);
}

function print(
  message: string,
  log: Console["warn"] | Console["error"] | Console["log"],
  title?: string,
  indent?: number
) {
  let titleStyled = title ? title : "";

  if (log.name === "warn") titleStyled = chalk.yellow(titleStyled);
  else if (log.name === "error") titleStyled = chalk.red(titleStyled);
  else titleStyled = chalk.green(titleStyled);

  const indentStyled = indent ? " ".repeat(indent) : "";
  log(chalk.bold(`${indentStyled}${titleStyled} ${message}`));
}

export function printMessage(message: string, title?: string, indent?: number) {
  print(message, console.log, title, indent);
}

export function printWarning(message: string, title?: string, indent?: number) {
  print(message, console.warn, title, indent);
}

export function printError(message: string, title?: string, indent?: number) {
  print(message, console.error, title, indent);
}
