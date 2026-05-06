import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';

export class Logger {
  private static spinner: Ora | null = null;

  static info(message: string) {
    console.log(chalk.dim(`  ℹ ${message}`));
  }

  static success(message: string) {
    console.log(chalk.green(`  ✔ ${message}`));
  }

  static warn(message: string) {
    this.stopSpinner();
    console.log(`  ${chalk.yellow('⚠')} ${message}`);
  }

  static error(message: string) {
    this.stopSpinner();
    console.log(`  ${chalk.red('✖')} ${message}`);
  }

  static header(message: string) {
    this.stopSpinner();
    console.log(
      boxen(chalk.bold.cyan(message), {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'cyan',
      })
    );
  }

  static log(message: string) {
    this.stopSpinner();
    console.log(message);
  }

  static startSpinner(message: string) {
    if (this.spinner) {
      this.spinner.text = message;
    } else {
      this.spinner = ora({
        text: chalk.dim(message),
        color: 'cyan',
        spinner: 'dots',
      }).start();
    }
  }

  static stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  static step(step: string, message: string) {
    this.stopSpinner();
    console.log(`${chalk.bold.magenta(`[${step}]`)} ${message}`);
  }

  static tool(name: string) {
    this.stopSpinner();
    console.log(`${chalk.cyan('  🛠')} ${chalk.bold.white(name)}`);
  }

  static reason(thought: string) {
    this.stopSpinner();
    console.log(`\n${chalk.bold.gray('[THINK]')}`);
    console.log(`${chalk.white(thought)}\n`);
  }

  static plan(steps: string[]) {
    this.stopSpinner();
    console.log(`${chalk.bold.gray('[PLAN]')}`);
    steps.forEach((step, i) => {
      console.log(chalk.dim(`  ${i + 1}. ${step}`));
    });
    console.log();
  }
}
