import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';

export class Logger {
  private static spinner: Ora | null = null;

  static info(message: string) {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  static success(message: string) {
    console.log(chalk.green(`✔ ${message}`));
  }

  static warn(message: string) {
    this.stopSpinner();
    console.log(`${chalk.yellow('⚠')} ${message}`);
  }

  static error(message: string) {
    this.stopSpinner();
    console.log(`${chalk.red('✖')} ${message}`);
  }

  static header(message: string) {
    this.stopSpinner();
    console.log(
      boxen(chalk.bold.cyan(message), {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
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
        text: message,
        color: 'cyan',
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
    console.log(`${chalk.yellow('🛠')} ${chalk.bold.white(name)}`);
  }

  static reason(thought: string) {
    this.stopSpinner();
    console.log(chalk.bold.gray(`\n🧠 THOUGHTS:`));
    console.log(boxen(chalk.italic.whiteBright(thought), {
      padding: 1,
      margin: 0,
      borderColor: 'gray',
      borderStyle: 'round',
      dimBorder: true
    }));
    console.log();
  }

  static plan(steps: string[]) {
    this.stopSpinner();
    console.log(chalk.cyan(`\n📋 PLAN:`));
    steps.forEach((step, i) => {
      console.log(chalk.cyan(`  ${i + 1}. ${step}`));
    });
    console.log();
  }
}
