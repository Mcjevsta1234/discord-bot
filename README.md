# Witchy Agent (Clean Slate)

A minimal, fresh-start coding agent toolkit. It focuses on deterministic tools for shell, git, Python execution, and simple code edits so you can rebuild your workflow without legacy conflicts.

## Features
- **Shell runner**: Execute whitelisted shell commands with streaming output and timeouts.
- **Git helper**: Run common Git commands (status, add, commit, checkout) through the agent tool interface.
- **Python test runner**: Quickly run `python -m compileall` or `pytest` (if present) to validate code.
- **Script generator**: Write Python or shell scripts to disk with one call.
- **Text replacer**: Apply search/replace patches across files using a structured request.

## Quickstart
1. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run the CLI tool for an overview:
   ```bash
   python -m witchy_agent.cli --help
   ```
3. Examples:
   - Run a safe shell command:
     ```bash
     python -m witchy_agent.cli shell "ls -la"
     ```
   - Run git status:
     ```bash
     python -m witchy_agent.cli git status
     ```
   - Generate a Python script:
     ```bash
     python -m witchy_agent.cli write-script my_script.py "print('hello')"
     ```
   - Replace text in a file:
     ```bash
     python -m witchy_agent.cli replace --path README.md --search "hello" --replace "hi"
     ```

## Design Notes
- Tool calls are modeled with Pydantic for predictable inputs/outputs.
- The shell tool enforces a default timeout and optional allowlist to reduce risk.
- All tools return structured JSON so you can integrate them into higher-level agents or chat UIs.

## Repository Layout
- `witchy_agent/`
  - `cli.py`: Typer-powered command-line entrypoint.
  - `core.py`: Tool registry and execution helpers.
  - `tools/`: Individual tool implementations (shell, git, tests, scripts, replace).
- `requirements.txt`: Python dependencies.
- `README.md`: This file.
- `.gitignore`: Standard Python ignores.

## Safety
The shell tool defaults to a 60s timeout and streams stdout/stderr separately. You can optionally provide an allowlist of commands via the CLI flags to constrain what runs in production setups.

