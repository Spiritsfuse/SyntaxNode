# SyntaxNode — AI Agent CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5--Flash-orange.svg)](https://deepmind.google/technologies/gemini/)

**SyntaxNode** is a production-grade AI Agent CLI tool designed for autonomous website cloning and code generation. Inspired by modern AI coding assistants like Cursor and Windsurf, SyntaxNode implements a robust **reasoning loop** to think, plan, and execute tasks with high precision.

---

## 📺 Demo Video

[![Watch the Demo](https://img.shields.io/badge/YouTube-Watch%20Demo-red?style=for-the-badge&logo=youtube)](YOUR_YOUTUBE_LINK_HERE)

*A full walkthrough of the agent cloning Scaler Academy in the terminal, followed by a browser preview.*

---

## 🚀 Features

- **Agentic Reasoning Loop**: Implements a continuous **THINK -> PLAN -> TOOL -> OBSERVE** cycle.
- **Live Streaming Output**: Real-time reasoning logs streamed to the terminal for a "live" agent experience.
- **Premium Web Generation**: Specialized tools for high-fidelity HTML5, CSS3, and modern JavaScript.
- **Browser Automation**: Automatically opens the generated website and captures screenshots via Puppeteer.
- **Production-Grade Architecture**: Modular, typed, and scalable codebase built with TypeScript.
- **Google Gemini 2.5 Flash**: Powered by the latest low-latency, high-performance AI models.

---

## 📸 Cloned Website Preview

![Scaler Academy Clone Preview](docs/screenshots/preview.png)
*Generated autonomously by SyntaxNode in under 60 seconds.*

---

## 🛠 Architecture

SyntaxNode is built with a decoupled architecture for maximum flexibility:

- **Orchestrator**: The central engine driving the agent's reasoning loop.
- **Reasoner**: Interfaces with Gemini 2.5 Flash using structured prompts.
- **Tool Registry**: A modular system for registering and executing agent capabilities (FS, Shell, Browser).
- **Memory System**: Context-aware history management to enable iterative refinement.

Detailed technical documentation can be found in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📦 Setup & Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Spiritsfuse/SyntaxNode.git
   cd SyntaxNode
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` to the `.env` file.

4. **Build the Project**:
   ```bash
   npm run build
   ```

---

## 🎮 Usage

### Start a Conversational Session
Interact with the agent directly for any coding task:
```bash
npm run start chat
```

### Clone Scaler Academy (One-Shot)
Specifically optimized command for the assignment requirement:
```bash
npm run start clone
```

The generated files will be stored in the `/generated` directory and automatically opened in your browser.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the SyntaxNode Team.
