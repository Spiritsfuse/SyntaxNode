# Demo Script — SyntaxNode

This script outlines a 2–3 minute demonstration of SyntaxNode's capabilities.

## Introduction (30 Seconds)
- **Visual**: Start with a clean terminal.
- **Narration**: "Welcome to SyntaxNode, a production-grade AI Agent CLI tool built with TypeScript and Google Gemini. Today, I'll show you how SyntaxNode can autonomously build a high-quality clone of the Scaler Academy website."

## Step 1: Booting the CLI (30 Seconds)
- **Command**: `npm run start chat`
- **Visual**: The premium header appears with a double-bordered box.
- **Narration**: "We'll start by entering a chat session. Notice the clean, colorful UI. I'll give SyntaxNode a complex instruction."
- **Action**: Type `Help me clone the Scaler Academy landing page. I need a header, hero section, and footer.`

## Step 2: The Reasoning Loop (1 Minute)
- **Visual**: The `[THINKING]` spinner starts. Then, the gray thought process and the cyan numbered plan appear.
- **Narration**: "SyntaxNode doesn't just generate code in one go. It enters an iterative reasoning loop. It first thinks about the architecture, plans the steps, and then starts executing tools."
- **Visual**: Observe the `[LOOP]` indicators and `[EXECUTE]` logs as it calls `create_file`, `generate_html`, and `generate_css`.
- **Narration**: "You can see it registering tools and executing them one by one. It's currently generating the HTML structure and then the premium CSS to match Scaler's aesthetic."

## Step 3: Verifying the Output (30 Seconds)
- **Visual**: The agent finishes with a "Task completed successfully!" message.
- **Action**: Exit the CLI and show the `generated/` directory.
- **Narration**: "The agent has finished. Let's look at the generated files. We have an index.html, styles.css, and even a script.js. Everything is neatly organized in the 'generated' folder."

## Step 4: Browser Preview (30 Seconds)
- **Action**: Open `generated/index.html` in the browser.
- **Visual**: Show the responsive, polished landing page.
- **Narration**: "And here is the final result. A fully responsive, visually polished clone of Scaler Academy, built autonomously by SyntaxNode. From gradients to typography, the fidelity is production-grade."

## Conclusion
- **Narration**: "SyntaxNode: Bringing the power of agentic reasoning to your terminal. Thank you!"
