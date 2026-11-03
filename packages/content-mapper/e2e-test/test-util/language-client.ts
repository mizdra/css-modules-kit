import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

// Keep the resolution in sync with `scripts/vitest-e2e-test-setup.ts`.
/** The native tsc binary shipped with the `typescript` npm package. Overridable via the `TSGO_BIN` environment variable. */
const tsgoBinPath = process.env['TSGO_BIN'] ?? resolveNativeTscBinPath(import.meta.url);

/**
 * Resolves the platform-specific native tsc binary the same way as `typescript/lib/getExePath.js`.
 * The platform package is a dependency of `typescript`, not of this package, so it must be
 * resolved relative to `typescript` to work with pnpm's non-flat `node_modules`.
 */
function resolveNativeTscBinPath(base: string): string {
  const typescriptPkgPath = createRequire(base).resolve('typescript/package.json');
  const platformPkgName = `@typescript/typescript-${process.platform}-${process.arch}`;
  const platformPkgPath = createRequire(typescriptPkgPath).resolve(`${platformPkgName}/package.json`);
  const binName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
  return fileURLToPath(new URL(`./lib/${binName}`, pathToFileURL(platformPkgPath)));
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export type FileLocation = { file: string; position: Position };

export type FileSpan = { file: string; range: Range };

/** `newText` is kept only when it differs from the requested new name. */
export type RenameLocation = FileSpan & { newText?: string };

export type TextEdit = { range: Range; newText: string };

export type FileTextEdits = { file: string; textEdits: TextEdit[] };

export type Diagnostic = {
  range: Range;
  severity?: number;
  code?: number | string;
  source?: string;
  message: string;
};

export const DiagnosticSeverity = { Error: 1, Warning: 2, Information: 3, Hint: 4 } as const;

interface LSPLocation {
  uri: string;
  range: Range;
}

interface LSPLocationLink {
  targetUri: string;
  targetSelectionRange: Range;
}

interface LSPTextDocumentEdit {
  textDocument: { uri: string; version: number | null };
  edits: TextEdit[];
}

interface LSPWorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  documentChanges?: LSPTextDocumentEdit[];
}

/**
 * A thin client for the tsgo language server.
 *
 * Methods returning language feature results (definitions, references, rename, file rename edits,
 * diagnostics) return normalized values: only the fields relevant to tests are kept, URIs are
 * converted to paths normalized with `formatPath`, and the results are sorted so that they can be
 * compared with `toStrictEqual`. Spans and text edits are sorted by file path, then by position.
 * Duplicates are not removed.
 */
export interface LanguageClient {
  /** Opens files. A file is opened with its on-disk content unless `content` is given. */
  openFiles(files: readonly (string | { file: string; content: string })[]): Promise<void>;
  closeFiles(files: readonly string[]): Promise<void>;
  /** Replaces the whole content of an opened file. */
  changeFile(file: string, content: string): Promise<void>;
  sendDefinition(args: FileLocation): Promise<FileSpan[]>;
  sendReferences(args: FileLocation): Promise<FileSpan[]>;
  sendRename(args: FileLocation, newName?: string): Promise<RenameLocation[]>;
  /**
   * Returns the diagnostics except the ones with the hint severity (e.g. unused locals), which
   * tsserver reports as suggestion diagnostics instead of semantic or syntactic diagnostics.
   */
  sendDocumentDiagnostic(file: string): Promise<Diagnostic[]>;
  sendWillRenameFiles(args: { oldFilePath: string; newFilePath: string }): Promise<FileTextEdits[]>;
}

export function formatPath(path: string) {
  // On Windows, the server returns paths with '/' instead of '\\' and with a lowercase drive letter.
  return path.replaceAll('\\', '/').replace(/^[A-Z]:/u, (drive) => drive.toLowerCase());
}

function toFileUri(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

function toFilePath(uri: string): string {
  return formatPath(fileURLToPath(uri));
}

function comparePositions(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}

function compareFileSpans(a: FileSpan, b: FileSpan): number {
  return a.file.localeCompare(b.file) || comparePositions(a.range.start, b.range.start);
}

function normalizeDefinitions(result: LSPLocation | LSPLocation[] | LSPLocationLink[] | null): FileSpan[] {
  if (result === null) return [];
  const definitions = Array.isArray(result) ? result : [result];
  return definitions
    .map((definition) =>
      'targetUri' in definition
        ? { file: toFilePath(definition.targetUri), range: definition.targetSelectionRange }
        : { file: toFilePath(definition.uri), range: definition.range },
    )
    .toSorted(compareFileSpans);
}

function normalizeLocations(locations: readonly LSPLocation[] | null): FileSpan[] {
  return (locations ?? [])
    .map((location) => ({ file: toFilePath(location.uri), range: location.range }))
    .toSorted(compareFileSpans);
}

function collectTextEdits(edit: LSPWorkspaceEdit | null): FileTextEdits[] {
  const textEdits = new Map<string, TextEdit[]>();
  for (const [uri, edits] of Object.entries(edit?.changes ?? {})) {
    textEdits.set(toFilePath(uri), [...edits]);
  }
  for (const documentChange of edit?.documentChanges ?? []) {
    const file = toFilePath(documentChange.textDocument.uri);
    textEdits.set(file, [...(textEdits.get(file) ?? []), ...documentChange.edits]);
  }
  return [...textEdits]
    .map(([file, edits]) => ({
      file,
      textEdits: edits
        .map((textEdit) => ({ range: textEdit.range, newText: textEdit.newText }))
        .toSorted((a, b) => comparePositions(a.range.start, b.range.start)),
    }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
}

function normalizeRenameLocations(edit: LSPWorkspaceEdit | null, newName: string): RenameLocation[] {
  return collectTextEdits(edit).flatMap(({ file, textEdits }) =>
    textEdits.map((textEdit) => ({
      file,
      range: textEdit.range,
      ...(textEdit.newText === newName ? {} : { newText: textEdit.newText }),
    })),
  );
}

function normalizeDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.severity !== DiagnosticSeverity.Hint)
    .map((diagnostic) => ({
      range: diagnostic.range,
      ...('severity' in diagnostic ? { severity: diagnostic.severity } : {}),
      ...('code' in diagnostic ? { code: diagnostic.code } : {}),
      ...('source' in diagnostic ? { source: diagnostic.source } : {}),
      message: diagnostic.message,
    }))
    .toSorted((a, b) => comparePositions(a.range.start, b.range.start));
}

function languageIdOf(filePath: string): string {
  if (filePath.endsWith('.tsx')) return 'typescriptreact';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.css')) return 'css';
  return 'plaintext';
}

/**
 * Launches a tsgo language server shared by all tests in a test file, and resolves after the
 * initialization. The server exits by itself when the test process closes its stdin.
 */
export async function launchLanguageClient(rootDir: string): Promise<LanguageClient> {
  const documentVersions = new Map<string, number>();
  const proc = spawn(tsgoBinPath, ['--lsp', '-stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const connection = createMessageConnection(new StreamMessageReader(proc.stdout), new StreamMessageWriter(proc.stdin));
  // The tests need neither user settings nor dynamic capability registration, so every
  // server-to-client request is answered with an empty result.
  connection.onRequest(() => null);
  connection.listen();
  // Rejects the pending requests.
  proc.on('exit', () => connection.dispose());

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  async function sendRequest(method: string, params: unknown): Promise<any> {
    return connection.sendRequest(method, params);
  }

  async function sendNotification(method: string, params: unknown): Promise<void> {
    await connection.sendNotification(method, params);
  }

  await sendRequest('initialize', {
    processId: process.pid,
    rootUri: toFileUri(rootDir),
    capabilities: {
      workspace: {
        workspaceEdit: { documentChanges: true },
        fileOperations: { willRename: true },
      },
      textDocument: {
        definition: { linkSupport: true },
      },
    },
    initializationOptions: { runExternalCode: true },
  });
  await sendNotification('initialized', {});

  return {
    async openFiles(files) {
      for (const entry of files) {
        const file = typeof entry === 'string' ? entry : entry.file;
        const text = typeof entry === 'string' ? readFileSync(file, 'utf8') : entry.content;
        const uri = toFileUri(file);
        documentVersions.set(uri, 1);
        await sendNotification('textDocument/didOpen', {
          textDocument: { uri, languageId: languageIdOf(file), version: 1, text },
        });
      }
    },
    async closeFiles(files) {
      for (const file of files) {
        const uri = toFileUri(file);
        documentVersions.delete(uri);
        await sendNotification('textDocument/didClose', { textDocument: { uri } });
      }
    },
    async changeFile(file, content) {
      const uri = toFileUri(file);
      const version = (documentVersions.get(uri) ?? 1) + 1;
      documentVersions.set(uri, version);
      await sendNotification('textDocument/didChange', {
        textDocument: { uri, version },
        contentChanges: [{ text: content }],
      });
    },
    async sendDefinition(args) {
      const result = await sendRequest('textDocument/definition', {
        textDocument: { uri: toFileUri(args.file) },
        position: args.position,
      });
      return normalizeDefinitions(result);
    },
    async sendReferences(args) {
      const result = await sendRequest('textDocument/references', {
        textDocument: { uri: toFileUri(args.file) },
        position: args.position,
        context: { includeDeclaration: true },
      });
      return normalizeLocations(result);
    },
    async sendRename(args, newName = 'renamed') {
      const result = await sendRequest('textDocument/rename', {
        textDocument: { uri: toFileUri(args.file) },
        position: args.position,
        newName,
      });
      return normalizeRenameLocations(result, newName);
    },
    async sendDocumentDiagnostic(file) {
      const result: { items: Diagnostic[] } = await sendRequest('textDocument/diagnostic', {
        textDocument: { uri: toFileUri(file) },
      });
      return normalizeDiagnostics(result.items);
    },
    async sendWillRenameFiles(args) {
      const result = await sendRequest('workspace/willRenameFiles', {
        files: [{ oldUri: toFileUri(args.oldFilePath), newUri: toFileUri(args.newFilePath) }],
      });
      return collectTextEdits(result);
    },
  };
}
