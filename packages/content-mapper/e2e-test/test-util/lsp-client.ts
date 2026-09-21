import type { ChildProcessByStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Readable, Writable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Keep the resolution in sync with `scripts/vitest-e2e-test-setup.ts`.
/** The native tsc binary shipped with the `typescript` npm package. Overridable via the `TSGO_BIN` environment variable. */
const tsgoBinPath = process.env['TSGO_BIN'] ?? resolveNativeTscBinPath(import.meta.url);

/**
 * Resolves the platform-specific native tsc binary the same way as `typescript/lib/getExePath.js`.
 * The `typescript-nightly` alias points at the `typescript` nightly, whose platform package is a
 * dependency of the nightly, not of this package, so it must be resolved relative to the nightly
 * package to work with pnpm's non-flat `node_modules`.
 */
function resolveNativeTscBinPath(base: string): string {
  const typescriptPkgPath = createRequire(base).resolve('typescript-nightly/package.json');
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

export type FileSpanWithContext = FileSpan & { contextRange?: Range };

/** `newText` is kept only when it differs from the requested new name (e.g. `a_1 as renamed`). */
export type RenameLocation = FileSpan & { newText?: string };

export type FileRename = { oldFile: string; newFile: string };

export type RenameResult = { locs: RenameLocation[]; fileRenames: FileRename[] };

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

export type CompletionEntry = {
  name: string;
  sortText: string;
  source?: string;
  insertText?: string;
};

export type CompletionDetails = {
  additionalTextEdits?: TextEdit[];
};

export type CodeAction = {
  title: string;
  kind?: string;
  edits: FileTextEdits[];
  /** The files that the code action creates. */
  createdFiles: string[];
};

interface LSPLocation {
  uri: string;
  range: Range;
}

interface LSPLocationLink {
  targetUri: string;
  targetRange: Range;
  targetSelectionRange: Range;
}

interface LSPTextDocumentEdit {
  textDocument: { uri: string; version: number | null };
  edits: TextEdit[];
}

interface LSPRenameFile {
  kind: 'rename';
  oldUri: string;
  newUri: string;
}

interface LSPCreateFile {
  kind: 'create';
  uri: string;
}

interface LSPWorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  documentChanges?: (LSPTextDocumentEdit | LSPRenameFile | LSPCreateFile)[];
}

interface LSPCompletionItem {
  label: string;
  labelDetails?: { description?: string };
  sortText?: string;
  insertText?: string;
  additionalTextEdits?: TextEdit[];
}

interface LSPCodeAction {
  title: string;
  kind?: string;
  edit?: LSPWorkspaceEdit;
}

interface JSONRPCMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * A thin client for the tsgo LSP server.
 *
 * Methods returning language feature results (definitions, references, rename, file rename edits,
 * diagnostics, completion, code actions) return normalized values: only the fields relevant to tests are kept, URIs are
 * converted to paths normalized with `formatPath`, and the results are sorted so that they can be
 * compared with `toStrictEqual`. Spans and text edits are sorted by file path, then by position.
 * Duplicates are not removed.
 */
export interface LSPClient {
  /** Opens files. A file is opened with its on-disk content unless `content` is given. */
  openFiles(files: readonly (string | { file: string; content: string })[]): Promise<void>;
  closeFiles(files: readonly string[]): Promise<void>;
  /** Replaces the whole content of an opened file. */
  changeFile(file: string, content: string): Promise<void>;
  sendDefinition(args: FileLocation): Promise<FileSpan[]>;
  /** Like `sendDefinition`, but each definition also carries the range of its enclosing declaration as `contextRange`. */
  sendDefinitionWithContext(args: FileLocation): Promise<FileSpanWithContext[]>;
  sendReferences(args: FileLocation): Promise<FileSpan[]>;
  sendRename(args: FileLocation, newName?: string): Promise<RenameResult>;
  /**
   * Returns the diagnostics except the ones with the hint severity (e.g. unused locals), which
   * tsserver reports as suggestion diagnostics instead of semantic or syntactic diagnostics.
   */
  sendDocumentDiagnostic(file: string): Promise<Diagnostic[]>;
  sendWillRenameFiles(args: { oldFilePath: string; newFilePath: string }): Promise<FileTextEdits[]>;
  /**
   * Sets the user preferences by the names that tsserver uses (e.g. `quotePreference`).
   * The preferences stay in effect until the next call.
   */
  sendConfigure(args: { preferences: Record<string, unknown> }): Promise<void>;
  sendCompletion(args: FileLocation): Promise<CompletionEntry[]>;
  /** Returns the details of the completion entry with `name` and `source` among the entries at the location. */
  sendCompletionDetails(args: FileLocation & { name: string; source?: string }): Promise<CompletionDetails>;
  /** Returns the code actions of the kinds `only` for `range`, as if `range` had the diagnostics with `errorCodes`. */
  sendCodeActions(args: FileSpan & { errorCodes?: number[]; only: string[] }): Promise<CodeAction[]>;
}

export function formatPath(path: string) {
  // In windows, the server returns paths with '/' instead of '\\'.
  return path.replaceAll('\\', '/');
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

function normalizeDefinitions(
  result: LSPLocation | LSPLocation[] | LSPLocationLink[] | null,
  withContext: boolean,
): FileSpanWithContext[] {
  if (result === null) return [];
  const definitions = Array.isArray(result) ? result : [result];
  return definitions
    .map((definition) =>
      'targetUri' in definition
        ? {
            file: toFilePath(definition.targetUri),
            range: definition.targetSelectionRange,
            ...(withContext ? { contextRange: definition.targetRange } : {}),
          }
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
    if (!('textDocument' in documentChange)) continue;
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

function normalizeRenameResult(edit: LSPWorkspaceEdit | null, newName: string): RenameResult {
  const locs = collectTextEdits(edit).flatMap(({ file, textEdits }) =>
    textEdits.map((textEdit) => ({
      file,
      range: textEdit.range,
      ...(textEdit.newText === newName ? {} : { newText: textEdit.newText }),
    })),
  );
  const fileRenames = (edit?.documentChanges ?? [])
    .filter(
      (documentChange): documentChange is LSPRenameFile => 'kind' in documentChange && documentChange.kind === 'rename',
    )
    .map((documentChange) => ({
      oldFile: toFilePath(documentChange.oldUri),
      newFile: toFilePath(documentChange.newUri),
    }));
  return { locs, fileRenames };
}

function getCompletionSource(item: LSPCompletionItem): string | undefined {
  return item.labelDetails?.description;
}

function normalizeCompletionEntries(items: readonly LSPCompletionItem[]): CompletionEntry[] {
  return items
    .map((item) => {
      const source = getCompletionSource(item);
      return {
        name: item.label,
        sortText: item.sortText ?? item.label,
        ...(source === undefined ? {} : { source }),
        ...(item.insertText === undefined ? {} : { insertText: item.insertText }),
      };
    })
    .toSorted(
      (a, b) =>
        a.sortText.localeCompare(b.sortText) ||
        (a.source ?? '').localeCompare(b.source ?? '') ||
        a.name.localeCompare(b.name),
    );
}

function normalizeCodeActions(actions: readonly LSPCodeAction[] | null): CodeAction[] {
  return (actions ?? [])
    .map((action) => ({
      title: action.title,
      ...(action.kind === undefined ? {} : { kind: action.kind }),
      edits: collectTextEdits(action.edit ?? null),
      createdFiles: (action.edit?.documentChanges ?? [])
        .filter(
          (documentChange): documentChange is LSPCreateFile =>
            'kind' in documentChange && documentChange.kind === 'create',
        )
        .map((documentChange) => toFilePath(documentChange.uri)),
    }))
    .toSorted((a, b) => a.title.localeCompare(b.title));
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

const HEADER_TERMINATOR = new Uint8Array([0x0d, 0x0a, 0x0d, 0x0a]); // '\r\n\r\n'

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

function indexOfHeaderTerminator(bytes: Uint8Array): number {
  for (let i = 0; i + HEADER_TERMINATOR.length <= bytes.length; i++) {
    if (HEADER_TERMINATOR.every((byte, j) => bytes[i + j] === byte)) return i;
  }
  return -1;
}

function languageIdOf(filePath: string): string {
  if (filePath.endsWith('.tsx')) return 'typescriptreact';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.css')) return 'css';
  return 'plaintext';
}

/**
 * The user preferences that are in effect unless a test sets others, by the names that tsserver uses.
 *
 * `providePrefixAndSuffixTextForRename` defaults to `true` in tsgo, which makes a rename through a
 * shorthand export specifier return an edit like `a_1 as renamed`. tsserver defaults to the opposite,
 * and the expectations here are shared with the ts-plugin e2e tests, which run with that default.
 */
const DEFAULT_PREFERENCES = { providePrefixAndSuffixTextForRename: false };

/**
 * Launches a tsgo LSP server shared by all tests in a test file. The server is spawned lazily on
 * the first use, and spawned again after it exits unexpectedly, so that a crash fails only the
 * requests that were pending. The server exits by itself when the test process closes its stdin.
 */
export function launchLSPClient(rootDir: string): LSPClient {
  let proc: ChildProcessByStdio<Writable, Readable, null> | undefined;
  let nextRequestId = 1;
  const pendingRequests = new Map<
    number | string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  const documentVersions = new Map<string, number>();
  let buffer: Uint8Array = new Uint8Array(0);
  let contentLength: number | undefined;
  let preferences: Record<string, unknown> = DEFAULT_PREFERENCES;

  /** The server accepts the preferences by the names that tsserver uses in the `unstable` section of `js/ts`. */
  function getConfiguration(section: string | undefined): unknown {
    return section === 'js/ts' ? { unstable: preferences } : null;
  }

  function send(message: object): void {
    const body = new TextEncoder().encode(JSON.stringify({ jsonrpc: '2.0', ...message }));
    const header = new TextEncoder().encode(`Content-Length: ${body.length}\r\n\r\n`);
    proc!.stdin.write(concatBytes(header, body));
  }

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  async function sendRequest(method: string, params: unknown): Promise<any> {
    const id = nextRequestId++;
    send({ id, method, params });
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
    });
  }

  function handleMessage(message: JSONRPCMessage): void {
    if (message.id !== undefined && message.method !== undefined) {
      // A server-to-client request. The tests need no dynamic capability registration,
      // so every request other than `workspace/configuration` is answered with an empty result.
      if (message.method === 'workspace/configuration') {
        const { items } = message.params as { items: { section?: string }[] };
        send({ id: message.id, result: items.map((item) => getConfiguration(item.section)) });
      } else {
        send({ id: message.id, result: null });
      }
    } else if (message.id !== undefined) {
      const pendingRequest = pendingRequests.get(message.id);
      pendingRequests.delete(message.id);
      if (message.error) pendingRequest?.reject(new Error(message.error.message));
      else pendingRequest?.resolve(message.result);
    }
  }

  function handleData(chunk: Uint8Array): void {
    buffer = concatBytes(buffer, chunk);
    while (true) {
      if (contentLength === undefined) {
        const headerEnd = indexOfHeaderTerminator(buffer);
        if (headerEnd === -1) return;
        const header = new TextDecoder().decode(buffer.subarray(0, headerEnd));
        const match = /Content-Length: (\d+)/u.exec(header);
        if (match === null) throw new Error(`Invalid header: ${JSON.stringify(header)}`);
        contentLength = Number(match[1]);
        buffer = buffer.subarray(headerEnd + HEADER_TERMINATOR.length);
      }
      if (buffer.length < contentLength) return;
      const body = new TextDecoder().decode(buffer.subarray(0, contentLength));
      buffer = buffer.subarray(contentLength);
      contentLength = undefined;
      handleMessage(JSON.parse(body) as JSONRPCMessage);
    }
  }

  function handleExit(code: number | null, signal: string | null): void {
    for (const pendingRequest of pendingRequests.values()) {
      pendingRequest.reject(new Error(`The server exited unexpectedly (code: ${code}, signal: ${signal}).`));
    }
    pendingRequests.clear();
    documentVersions.clear();
    buffer = new Uint8Array(0);
    contentLength = undefined;
    started = undefined;
  }

  let started: Promise<void> | undefined;
  async function ensureStarted(): Promise<void> {
    started ??= (async () => {
      proc = spawn(tsgoBinPath, ['--lsp', '-stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
      proc.stdout.on('data', handleData);
      proc.on('exit', handleExit);
      await sendRequest('initialize', {
        processId: process.pid,
        rootUri: toFileUri(rootDir),
        capabilities: {
          workspace: {
            configuration: true,
            // The server answers a rename request on an import specifier with a file rename
            // operation only when the client declares these capabilities.
            workspaceEdit: { documentChanges: true, resourceOperations: ['create', 'rename'] },
            fileOperations: { willRename: true },
          },
          textDocument: {
            // The server reports the enclosing declaration of a definition only as a part of `LocationLink`.
            definition: { linkSupport: true },
            completion: {
              completionItem: {
                snippetSupport: true,
                labelDetailsSupport: true,
                resolveSupport: { properties: ['detail', 'documentation', 'additionalTextEdits'] },
              },
            },
            codeAction: {
              codeActionLiteralSupport: { codeActionKind: { valueSet: ['quickfix', 'refactor'] } },
            },
          },
        },
        initializationOptions: { runExternalCode: true },
      });
      send({ method: 'initialized', params: {} });
    })();
    return started;
  }

  async function sendCompletionRequest(args: FileLocation): Promise<LSPCompletionItem[]> {
    await ensureStarted();
    const result: LSPCompletionItem[] | { items: LSPCompletionItem[] } | null = await sendRequest(
      'textDocument/completion',
      { textDocument: { uri: toFileUri(args.file) }, position: args.position },
    );
    if (result === null) return [];
    return Array.isArray(result) ? result : result.items;
  }

  async function sendDefinitionRequest(args: FileLocation) {
    await ensureStarted();
    return sendRequest('textDocument/definition', {
      textDocument: { uri: toFileUri(args.file) },
      position: args.position,
    });
  }

  return {
    async openFiles(files) {
      await ensureStarted();
      for (const entry of files) {
        const file = typeof entry === 'string' ? entry : entry.file;
        const text = typeof entry === 'string' ? readFileSync(file, 'utf8') : entry.content;
        const uri = toFileUri(file);
        documentVersions.set(uri, 1);
        send({
          method: 'textDocument/didOpen',
          params: { textDocument: { uri, languageId: languageIdOf(file), version: 1, text } },
        });
      }
    },
    async closeFiles(files) {
      await ensureStarted();
      for (const file of files) {
        const uri = toFileUri(file);
        documentVersions.delete(uri);
        send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
      }
    },
    async changeFile(file, content) {
      await ensureStarted();
      const uri = toFileUri(file);
      const version = (documentVersions.get(uri) ?? 1) + 1;
      documentVersions.set(uri, version);
      send({
        method: 'textDocument/didChange',
        params: { textDocument: { uri, version }, contentChanges: [{ text: content }] },
      });
    },
    sendDefinition: async (args) => normalizeDefinitions(await sendDefinitionRequest(args), false),
    sendDefinitionWithContext: async (args) => normalizeDefinitions(await sendDefinitionRequest(args), true),
    async sendReferences(args) {
      await ensureStarted();
      const result = await sendRequest('textDocument/references', {
        textDocument: { uri: toFileUri(args.file) },
        position: args.position,
        context: { includeDeclaration: true },
      });
      return normalizeLocations(result);
    },
    async sendRename(args, newName = 'renamed') {
      await ensureStarted();
      const result = await sendRequest('textDocument/rename', {
        textDocument: { uri: toFileUri(args.file) },
        position: args.position,
        newName,
      });
      return normalizeRenameResult(result, newName);
    },
    async sendDocumentDiagnostic(file) {
      await ensureStarted();
      const result: { items: Diagnostic[] } = await sendRequest('textDocument/diagnostic', {
        textDocument: { uri: toFileUri(file) },
      });
      return normalizeDiagnostics(result.items);
    },
    async sendConfigure(args) {
      await ensureStarted();
      preferences = { ...DEFAULT_PREFERENCES, ...args.preferences };
      send({
        method: 'workspace/didChangeConfiguration',
        params: { settings: { 'js/ts': getConfiguration('js/ts') } },
      });
    },
    async sendCompletion(args) {
      return normalizeCompletionEntries(await sendCompletionRequest(args));
    },
    async sendCompletionDetails(args) {
      const items = await sendCompletionRequest(args);
      const item = items.find((item) => item.label === args.name && getCompletionSource(item) === args.source);
      if (item === undefined) throw new Error(`Completion entry ${JSON.stringify(args.name)} is not found.`);
      const resolved: LSPCompletionItem = await sendRequest('completionItem/resolve', item);
      return resolved.additionalTextEdits === undefined ? {} : { additionalTextEdits: resolved.additionalTextEdits };
    },
    async sendCodeActions(args) {
      await ensureStarted();
      const result = await sendRequest('textDocument/codeAction', {
        textDocument: { uri: toFileUri(args.file) },
        range: args.range,
        context: {
          diagnostics: (args.errorCodes ?? []).map((code) => ({ range: args.range, code, source: 'ts', message: '' })),
          only: args.only,
        },
      });
      return normalizeCodeActions(result);
    },
    async sendWillRenameFiles(args) {
      await ensureStarted();
      const result = await sendRequest('workspace/willRenameFiles', {
        files: [{ oldUri: toFileUri(args.oldFilePath), newUri: toFileUri(args.newFilePath) }],
      });
      return collectTextEdits(result);
    },
  };
}
