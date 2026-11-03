import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

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

interface LSPWorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
}

/**
 * A thin client for the tsgo language server.
 *
 * Methods returning language feature results (definitions, references, file rename edits,
 * diagnostics) return normalized values: only the fields relevant to tests are kept, URIs are
 * converted to paths normalized with `formatPath`, and the results are sorted so that they can be
 * compared with `toStrictEqual`. Spans and text edits are sorted by file path, then by position.
 * Duplicates are not removed.
 */
export interface LanguageClient {
  /** Opens files. A file is opened with its on-disk content unless `content` is given. */
  sendDidOpen(files: readonly (string | { file: string; content: string })[]): Promise<void>;
  sendDidClose(files: readonly string[]): Promise<void>;
  /** Replaces the whole content of an opened file. */
  sendDidChange(file: string, content: string): Promise<void>;
  sendDefinition(args: FileLocation): Promise<FileSpan[]>;
  sendReferences(args: FileLocation): Promise<FileSpan[]>;
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
  return pathToFileURL(filePath).href;
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

function normalizeDefinitions(result: LSPLocation | LSPLocation[] | null): FileSpan[] {
  if (result === null) return [];
  return normalizeLocations(Array.isArray(result) ? result : [result]);
}

function normalizeLocations(locations: readonly LSPLocation[] | null): FileSpan[] {
  return (locations ?? [])
    .map((location) => ({ file: toFilePath(location.uri), range: location.range }))
    .toSorted(compareFileSpans);
}

function normalizeWorkspaceEdit(edit: LSPWorkspaceEdit | null): FileTextEdits[] {
  return Object.entries(edit?.changes ?? {})
    .map(([uri, edits]) => ({
      file: toFilePath(uri),
      textEdits: edits
        .map((textEdit) => ({ range: textEdit.range, newText: textEdit.newText }))
        .toSorted((a, b) => comparePositions(a.range.start, b.range.start)),
    }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
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
 * Makes the content mapper resolvable from every `tsconfig.json` under `rootDir`. The server
 * resolves a mapper with node module resolution, and loads it only from a `node_modules` inside
 * a workspace folder.
 *
 * `rootDir` outlives a test run, so an existing link may point to another checkout. It is replaced
 * because the tests would otherwise run on the mapper of that checkout.
 */
function linkContentMapper(rootDir: string): void {
  const contentMapperDir = resolve(import.meta.dirname, '../..');
  const linkPath = join(rootDir, 'node_modules/@css-modules-kit/content-mapper');
  if (existsSync(linkPath) && realpathSync(linkPath) === realpathSync(contentMapperDir)) return;
  rmSync(linkPath, { force: true });
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(contentMapperDir, linkPath, 'junction');
}

/**
 * Launches a tsgo language server with `rootDir` as its workspace folder. The server is shared by
 * all tests in a test file, and resolves after the initialization. The server exits by itself when
 * the test process closes its stdin.
 */
export async function launchLanguageClient(rootDir: string): Promise<LanguageClient> {
  linkContentMapper(rootDir);
  const documentVersions = new Map<string, number>();
  const tscPath = resolve(import.meta.dirname, '../../node_modules/typescript/bin/tsc');
  const proc = spawn(process.execPath, [tscPath, '--lsp', '-stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
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
    capabilities: {},
    initializationOptions: { runExternalCode: true },
  });
  await sendNotification('initialized', {});

  return {
    async sendDidOpen(files) {
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
    async sendDidClose(files) {
      for (const file of files) {
        const uri = toFileUri(file);
        documentVersions.delete(uri);
        await sendNotification('textDocument/didClose', { textDocument: { uri } });
      }
    },
    async sendDidChange(file, content) {
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
      return normalizeWorkspaceEdit(result);
    },
  };
}
