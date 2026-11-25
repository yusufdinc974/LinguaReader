# Contributing to LinguaReader

Thanks for helping! This page has the details. The short version is in the [README](README.md#contributing).

## Setting up

You need **Node.js 22** or later and npm.

```bash
git clone https://github.com/<your-username>/LinguaReader.git
cd LinguaReader
npm install
npm run dev
```

`npm run dev` starts Vite and Electron with hot reload. The first run downloads the OCR models (about 96 MB) into `resources/ocr/`. If you only work on the UI, you can skip them: `npm run dev` still starts, and text recognition stays off.

## Before you open a pull request

1. Create a branch from `main` with a short, descriptive name, such as `fix/cbz-page-order` or `feat/epub-support`.
2. Keep the change about one thing. Open an issue first for anything large, so we can agree on the approach before you spend time on it.
3. Run the checks:

   ```bash
   npm test                                     # unit tests
   npx tsc --noEmit                             # type check the UI
   npx tsc --noEmit -p tsconfig.electron.json   # type check the main process
   ```

4. Try the change in the app. For reader or OCR changes, the files in `test/fixtures/` are a good start.
5. In the pull request, say what changed and why, how you tested it, and add a screenshot or short clip for anything visible.

Every pull request also builds and installs the app on Windows and macOS and checks that OCR still reads a scanned PDF and a manga page.

## How the app is built

LinguaReader is an Electron app with a React renderer.

- **Renderer** (`src/`): the four screens in `src/pages/`, UI pieces in `src/components/`, and the reader logic in `src/lib/` (PDF and comic loading, the selectable text layer, highlights, the OCR layer and spaced repetition).
- **Main process** (`electron/`): the SQLite database, IPC handlers, file access, updates, phone sync and the encrypted DeepL key.
- **OCR** (`electron/ocr/`): a worker process that runs PaddleOCR models with ONNX Runtime.
- **Tests** (`test/`): unit tests run with Node's built-in test runner, plus the end-to-end OCR check used in CI.

## Rules that keep users safe

- The renderer is sandboxed and reaches the main process only through `electron/preload.ts`. Every new IPC handler must check its arguments.
- The app only reads files the user opened. Don't add code that reads other paths.
- No telemetry. Keep network use to what a feature needs: translation, update checks and phone sync on the local network.
- Never send the DeepL key to the renderer, into backups or over phone sync.

## Style

- TypeScript everywhere, with no type errors.
- Match the style of the code around your change: 4-space indent, single quotes, small functions with clear names.
- Interface text is short, plain English, written for language learners.

## Reporting bugs

[Open an issue](https://github.com/yusufdinc974/LinguaReader/issues/new) with:

- what you did, what you expected, and what happened
- your OS and the app version (**Settings → About**)
- the file that shows the problem, if you can share it, or a screenshot

## License

By contributing, you agree that your contributions are released under the [MIT License](LICENSE).
