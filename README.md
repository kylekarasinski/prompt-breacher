# PROMPT//BREACH

An educational game about prompt injection and defenses, built with TanStack
Start, TypeScript, React, and Tailwind CSS.

## Requirements

- [Bun](https://bun.sh/) (the project uses Bun and the `bun.lock` lockfile)
- [Git](https://git-scm.com/downloads), if you are cloning the repository

You do not need to install Node.js or npm to run the project with Bun.

## Install Bun

Choose the command for your operating system:

### Windows (PowerShell)

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### macOS or Linux

```sh
curl -fsSL https://bun.sh/install | bash
```

If the installer says the `bun` command is not found, open a new terminal so
your `PATH` updates, then verify the installation:

```sh
bun --version
```

For other installation options and troubleshooting, see the
[official Bun installation guide](https://bun.sh/docs/installation).

## Download and run the project

Clone this repository, change into its folder, install dependencies, and start
the development server:

```sh
git clone <https://github.com/kylekarasinski/prompt-breacher>
cd prompt-breach
bun install
bun run dev
```

Replace `<https://github.com/kylekarasinski/prompt-breacher>` with this repository's clone URL. Open the local URL
printed in the terminal in your browser.

To stop the development server, press **Ctrl+C** in the terminal.

## Other commands

```sh
bun run test   # Run tests
bun run lint   # Check linting
bun run build  # Create a production build
```