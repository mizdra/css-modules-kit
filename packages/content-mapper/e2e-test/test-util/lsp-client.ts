import type { ChildProcessByStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Readable, Writable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from '@css-modules-kit/core';

/** The tsgo binary built by `scripts/setup-tsgo.sh`. Overridable via the `TSGO_BIN` environment variable. */
const tsgoBinPath =
  process.env['TSGO_BIN'] ??
  resolve(
    import.meta.dirname,
    `../../../../.tmp/typescript/built/tsgo${process.platform === 'win32' ? '.exe' : ''}`,
  );

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface TextDocumentEdit {
  textDocument: { uri: string; version: number | null };
  edits: TextEdit[];
}

export interface RenameFile {
  kind: 'rename';
  oldUri: string;
  newUri: string;
}

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  documentChanges?: (TextDocumentEdit | RenameFile)[];
}

export interface Diagnostic {
  range: Range;
  severity?: number;
  code?: number | string;
  source?: string;
  message: string;
}

export interface FullDocumentDiagnosticReport {
  kind: string;
  items: Diagnostic[];
}

interface JSONRPCMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

export function toFileUri(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

/** The server percent-encodes characters like `@` that `pathToFileURL` leaves as-is. */
function normalizeFileUri(uri: string): string {
  return toFileUri(fileURLToPath(uri));
}

export function normalizeLocations(locations: readonly Location[]): Location[] {
  return locations
    .map((location) => ({ ...location, uri: normalizeFileUri(location.uri) }))
    .toSorted(
      (a, b) =>
        a.uri.localeCompare(b.uri) ||
        a.range.start.line - b.range.start.line ||
        a.range.start.character - b.range.start.character,
    );
}

/**
 * Flattens the text edits in `changes` and `documentChanges` into a per-file record, sorted so
 * that assertions do not depend on the server's edit order. File operations like {@link RenameFile}
 * are not text edits and are extracted by {@link normalizeFileRenames} instead.
 */
export function normalizeWorkspaceEdit(edit: WorkspaceEdit | null): Record<string, TextEdit[]> | null {
  if (edit === null) return null;
  const changes: Record<string, TextEdit[]> = {};
  for (const [uri, edits] of Object.entries(edit.changes ?? {})) {
    changes[normalizeFileUri(uri)] = edits;
  }
  for (const documentChange of edit.documentChanges ?? []) {
    if (!('textDocument' in documentChange)) continue;
    const uri = normalizeFileUri(documentChange.textDocument.uri);
    changes[uri] = [...(changes[uri] ?? []), ...documentChange.edits];
  }
  for (const [uri, edits] of Object.entries(changes)) {
    changes[uri] = edits.toSorted(
      (a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character,
    );
  }
  return changes;
}

/** Extracts the file rename operations from `documentChanges`. */
export function normalizeFileRenames(edit: WorkspaceEdit | null): RenameFile[] | null {
  if (edit === null) return null;
  const renames: RenameFile[] = [];
  for (const documentChange of edit.documentChanges ?? []) {
    if ('kind' in documentChange && documentChange.kind === 'rename') {
      renames.push({
        kind: 'rename',
        oldUri: normalizeFileUri(documentChange.oldUri),
        newUri: normalizeFileUri(documentChange.newUri),
      });
    }
  }
  return renames;
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

export interface LSPClient {
  /** Opens `filePath` with its on-disk content so that subsequent requests can reference it. */
  openFile(filePath: string): Promise<void>;
  /** Replaces the whole content of an opened file. */
  changeFile(filePath: string, text: string): Promise<void>;
  sendDefinition(filePath: string, position: Position): Promise<Location[]>;
  sendReferences(filePath: string, position: Position): Promise<Location[]>;
  sendRename(filePath: string, position: Position, newName: string): Promise<WorkspaceEdit | null>;
  sendDocumentDiagnostic(filePath: string): Promise<FullDocumentDiagnosticReport>;
  sendWillRenameFiles(oldFilePath: string, newFilePath: string): Promise<WorkspaceEdit | null>;
}

/**
 * Launches a tsgo LSP server shared by all tests in a test file. The server is spawned lazily on
 * the first use, so a module-level client does not require the tsgo binary in skipped test files.
 * The server exits by itself when the test process closes its stdin.
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

  function send(message: object): void {
    const body = new TextEncoder().encode(JSON.stringify({ jsonrpc: '2.0', ...message }));
    const header = new TextEncoder().encode(`Content-Length: ${body.length}\r\n\r\n`);
    proc!.stdin.write(concatBytes(header, body));
  }

  async function sendRequest(method: string, params: unknown): Promise<unknown> {
    const id = nextRequestId++;
    send({ id, method, params });
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
    });
  }

  function handleMessage(message: JSONRPCMessage): void {
    if (message.id !== undefined && message.method !== undefined) {
      // A server-to-client request. The tests need no configuration or dynamic capability
      // registration, so every request is answered with an empty result.
      if (message.method === 'workspace/configuration') {
        send({ id: message.id, result: (message.params as { items: unknown[] }).items.map(() => null) });
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

  let started: Promise<void> | undefined;
  async function ensureStarted(): Promise<void> {
    started ??= (async () => {
      proc = spawn(tsgoBinPath, ['--lsp', '-stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
      proc.stdout.on('data', handleData);
      await sendRequest('initialize', {
        processId: process.pid,
        rootUri: toFileUri(rootDir),
        capabilities: {
          workspace: {
            configuration: true,
            // The server answers a rename request on an import specifier with a file rename
            // operation only when the client declares these capabilities.
            workspaceEdit: { documentChanges: true, resourceOperations: ['rename'] },
            fileOperations: { willRename: true },
          },
        },
        initializationOptions: { loadExternalPlugins: true },
      });
      send({ method: 'initialized', params: {} });
    })();
    return started;
  }

  return {
    async openFile(filePath) {
      await ensureStarted();
      const uri = toFileUri(filePath);
      documentVersions.set(uri, 1);
      send({
        method: 'textDocument/didOpen',
        params: {
          textDocument: { uri, languageId: languageIdOf(filePath), version: 1, text: readFileSync(filePath, 'utf8') },
        },
      });
    },
    async changeFile(filePath, text) {
      await ensureStarted();
      const uri = toFileUri(filePath);
      const version = (documentVersions.get(uri) ?? 1) + 1;
      documentVersions.set(uri, version);
      send({
        method: 'textDocument/didChange',
        params: { textDocument: { uri, version }, contentChanges: [{ text }] },
      });
    },
    async sendDefinition(filePath, position) {
      await ensureStarted();
      const result = await sendRequest('textDocument/definition', {
        textDocument: { uri: toFileUri(filePath) },
        position,
      });
      if (result === null) return [];
      return Array.isArray(result) ? (result as Location[]) : [result as Location];
    },
    async sendReferences(filePath, position) {
      await ensureStarted();
      const result = await sendRequest('textDocument/references', {
        textDocument: { uri: toFileUri(filePath) },
        position,
        context: { includeDeclaration: true },
      });
      return (result as Location[] | null) ?? [];
    },
    async sendRename(filePath, position, newName) {
      await ensureStarted();
      const result = await sendRequest('textDocument/rename', {
        textDocument: { uri: toFileUri(filePath) },
        position,
        newName,
      });
      return result as WorkspaceEdit | null;
    },
    async sendDocumentDiagnostic(filePath) {
      await ensureStarted();
      const result = await sendRequest('textDocument/diagnostic', {
        textDocument: { uri: toFileUri(filePath) },
      });
      return result as FullDocumentDiagnosticReport;
    },
    async sendWillRenameFiles(oldFilePath, newFilePath) {
      await ensureStarted();
      const result = await sendRequest('workspace/willRenameFiles', {
        files: [{ oldUri: toFileUri(oldFilePath), newUri: toFileUri(newFilePath) }],
      });
      return result as WorkspaceEdit | null;
    },
  };
}
