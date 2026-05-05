#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { Orchestrator } from './agent/orchestrator';
import { Logger } from './core/logger';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('syntaxnode')
  .description('Production-grade AI Agent CLI for building and cloning websites')
  .version('1.0.0');

program
  .command('chat')
  .description('Start a conversational session with the agent')
  .action(async () => {
    Logger.header('Welcome to SyntaxNode');
    const orchestrator = new Orchestrator();

    const ask = async () => {
      const { instruction } = await inquirer.prompt([
        {
          type: 'input',
          name: 'instruction',
          message: 'What would you like me to do?',
          validate: (input) => input.trim() !== '' || 'Please provide an instruction.',
        },
      ]);

      if (instruction.toLowerCase() === 'exit' || instruction.toLowerCase() === 'quit') {
        Logger.info('Goodbye!');
        process.exit(0);
      }

      await orchestrator.run(instruction);
      ask(); // Recursive call for continuous chat
    };

    ask();
  });

program
  .command('clone')
  .description('Clone a website (e.g., Scaler Academy)')
  .argument('[url]', 'The URL to clone (default: Scaler Academy)')
  .action(async (url) => {
    const target = url || 'Scaler Academy';
    Logger.header(`SyntaxNode: Cloning ${target}`);
    const orchestrator = new Orchestrator();
    await orchestrator.run(`Help me clone the ${target} website. Generate a fully working frontend with a Header, Hero section, and Footer. Make it responsive and visually polished, following premium SaaS aesthetics.`);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
