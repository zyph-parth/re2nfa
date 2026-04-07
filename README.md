# RE2NFA

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A polished web-based automata workbench for converting regular expressions into epsilon-NFAs and minimal DFAs, visualizing their structure, inspecting transition tables, and simulating input strings against the resulting machine.

Built with React and Vite, this project combines a clean interactive UI with a custom automata engine that implements parsing, Thompson construction, subset construction, DFA completion, minimization, and execution tracing.

## Highlights

- Convert regular expressions into epsilon-NFAs using Thompson construction
- Generate complete minimized DFAs from the resulting NFA
- Visualize automata as interactive SVG graphs
- Inspect NFA and DFA transition tables
- Simulate candidate strings against the minimized DFA
- View execution traces for acceptance and rejection paths
- Explore the theory pipeline directly in the app

## Supported Regex Syntax

The parser supports the following operators and conventions:

- `a|b` or `a+b` for union
- `ab` for implicit concatenation
- `r*` for Kleene star
- `r+` for one-or-more
- `r?` for optional
- `( ... )` for grouping
- `\x` to escape the next character as a literal
- `epsilon` for the empty string

Examples:

- `(a+b)*abb`
- `a(b+c)*`
- `a?(b+c)*`
- `(a+epsilon)b`

## How It Works

The application follows a standard automata-construction pipeline:

1. Tokenize and parse the regular expression into postfix notation.
2. Build an epsilon-NFA using Thompson construction.
3. Convert the epsilon-NFA into a DFA with subset construction.
4. Complete the DFA by adding a dead state where needed.
5. Minimize the completed DFA through partition refinement.
6. Simulate input strings against the minimized DFA and produce a trace.

## Tech Stack

- React 19
- Vite
- JavaScript (ES modules)
- Custom automata engine
- ESLint for code quality

## Project Structure

```text
re2nfa/
|- src/
|  |- components/     # UI panels and interactive controls
|  |- engine/         # Regex parser, NFA/DFA construction, layout, SVG rendering
|  |- App.jsx         # Main application shell
|  |- main.jsx        # React entry point
|  `- index.css       # Global styling
|- test/
|  `- engine.test.js  # Engine regression tests
|- public/            # Optional static assets
|- dist/              # Production build output
|- index.html
|- package.json
`- vite.config.js
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Open the app

Vite will print a local development URL in the terminal, typically:

```text
http://localhost:5173
```

## Available Scripts

- `npm run dev` starts the Vite development server
- `npm run build` creates the production build in `dist/`
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint
- `npm test` runs the engine test suite

## Quality and Verification

Before sharing or packaging the project, it is a good idea to run:

```bash
npm run lint
npm test
npm run build
```

The included tests cover key automata behaviors such as:

- union vs postfix-plus parsing
- dead-state completion
- DFA acceptance behavior
- epsilon-only language handling

## Use Cases

This project is well suited for:

- compiler and formal languages coursework
- automata and theory of computation demos
- teaching regex-to-automata conversion visually
- debugging or validating regular-language examples
- portfolio presentation of algorithms and UI work

## Notes

- Source code should be edited inside `src/`, not in `dist/`
- The `dist/` folder contains generated production assets
- The automata engine is separated from the UI for easier maintenance and testing

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
