import axios, { AxiosError } from "axios";
import chalk from "chalk";

export function exitWithError(e: Error, title?: string) {
  printError(e.message, title);
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

export function printWarning(
  message: string,
  indent?: number,
  title = "Warning:"
) {
  print(message, console.warn, title, indent);
}

export function printError(message: string, title?: string, indent?: number) {
  print(message, console.error, title, indent);
}

/**
 * Returns the error as an AxiosError if it is one, otherwise it will _exit the program_.
 * @param e - unknown error
 * @returns AxiosError
 **/
export function getAxiosError(e: unknown) {
  if (!axios.isAxiosError(e)) exitWithError(e as Error, "Fatal Error:");
  return e as AxiosError;
}

export function printAxiosError(
  error: AxiosError,
  indent?: number,
  title = "API Request Error:"
) {
  printError(
    `${error.response?.status} ${error.response?.statusText} ${error.config?.url}`,
    title,
    indent
  );
}
