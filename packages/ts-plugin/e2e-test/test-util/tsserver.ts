import serverHarness from '@typescript/server-harness';
import type { server } from 'typescript';
import ts from 'typescript';

export type FileSpan = {
  file: string;
  start: server.protocol.Location;
  end: server.protocol.Location;
};

export type FileSpanWithContext = FileSpan & {
  contextStart?: server.protocol.Location;
  contextEnd?: server.protocol.Location;
};

export type RenameLocation = FileSpan & {
  prefixText?: string;
  suffixText?: string;
};

export type RenameResult = {
  info: server.protocol.RenameInfo;
  locs: RenameLocation[];
};

export type CompletionEntry = {
  name: string;
  sortText: string;
  source?: string;
  insertText?: string;
};

export type CompletionDetails = {
  codeActions?: { changes: server.protocol.FileCodeEdits[] }[];
};

export type CodeFixAction = {
  fixName: string;
  changes: server.protocol.FileCodeEdits[];
};

/**
 * A thin client for tsserver.
 *
 * Methods returning language feature results (definitions, references, rename, completion, code fixes)
 * return normalized values: only the fields relevant to tests are kept, paths are normalized with
 * `formatPath`, and the results are sorted so that they can be compared with `toStrictEqual`.
 * Spans are sorted by file path, then by position. Duplicates are not removed.
 */
interface Tsserver {
  sendUpdateOpen(args: server.protocol.UpdateOpenRequest['arguments']): Promise<server.protocol.Response>;
  sendConfigure(args: server.protocol.ConfigureRequest['arguments']): Promise<server.protocol.ConfigureResponse>;
  sendDefinitionAndBoundSpan(args: server.protocol.FileLocationRequestArgs): Promise<FileSpanWithContext[]>;
  sendReferences(args: server.protocol.ReferencesRequest['arguments']): Promise<FileSpan[]>;
  sendRename(args: server.protocol.RenameRequest['arguments']): Promise<RenameResult>;
  sendSemanticDiagnosticsSync(
    args: server.protocol.SemanticDiagnosticsSyncRequest['arguments'],
  ): Promise<server.protocol.SemanticDiagnosticsSyncResponse>;
  sendSyntacticDiagnosticsSync(
    args: server.protocol.SyntacticDiagnosticsSyncRequest['arguments'],
  ): Promise<server.protocol.SyntacticDiagnosticsSyncResponse>;
  sendGetEditsForFileRename(
    args: server.protocol.GetEditsForFileRenameRequest['arguments'],
  ): Promise<server.protocol.GetEditsForFileRenameResponse>;
  sendGetApplicableRefactors(
    args: server.protocol.GetApplicableRefactorsRequest['arguments'],
  ): Promise<server.protocol.GetApplicableRefactorsResponse>;
  sendGetEditsForRefactor(
    args: server.protocol.GetEditsForRefactorRequest['arguments'],
  ): Promise<server.protocol.GetEditsForRefactorResponse>;
  sendCompletionInfo(args: server.protocol.CompletionsRequest['arguments']): Promise<CompletionEntry[]>;
  sendCompletionDetails(args: server.protocol.CompletionDetailsRequest['arguments']): Promise<CompletionDetails[]>;
  sendGetCodeFixes(args: server.protocol.CodeFixRequest['arguments']): Promise<CodeFixAction[]>;
}

export function launchTsserver(): Tsserver {
  const server = serverHarness.launchServer(
    require.resolve('typescript/lib/tsserver.js'),
    [
      '--disableAutomaticTypingAcquisition',
      '--globalPlugins',
      '@css-modules-kit/ts-plugin',
      '--pluginProbeLocations',
      import.meta.dirname,
    ],
    [],
  );
  let seq = 0;
  async function sendRequest(
    command: string,
    args?: unknown,
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const res: server.protocol.Response = await server.message({
      seq: seq++,
      type: 'request',
      command,
      arguments: args,
    });
    if (!res.success) {
      throw new Error(`Expected success response, got ${JSON.stringify(res)}`);
    }
    return res;
  }

  return {
    sendUpdateOpen: async (args) => sendRequest(ts.server.protocol.CommandTypes.UpdateOpen, args),
    sendConfigure: async (args) => sendRequest(ts.server.protocol.CommandTypes.Configure, args),
    sendDefinitionAndBoundSpan: async (args) => {
      const res: server.protocol.DefinitionInfoAndBoundSpanResponse = await sendRequest(
        ts.server.protocol.CommandTypes.DefinitionAndBoundSpan,
        args,
      );
      return normalizeDefinitions(res.body?.definitions ?? []);
    },
    sendReferences: async (args) => {
      const res: server.protocol.ReferencesResponse = await sendRequest(
        ts.server.protocol.CommandTypes.References,
        args,
      );
      return normalizeFileSpans(res.body?.refs ?? []);
    },
    sendRename: async (args) => {
      const res: server.protocol.RenameResponse = await sendRequest(ts.server.protocol.CommandTypes.Rename, args);
      if (res.body === undefined) throw new Error('Expected rename response to have a body');
      return { info: res.body.info, locs: normalizeRenameLocations(res.body.locs) };
    },
    sendSemanticDiagnosticsSync: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.SemanticDiagnosticsSync, args),
    sendSyntacticDiagnosticsSync: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.SyntacticDiagnosticsSync, args),
    sendGetEditsForFileRename: async (args) => sendRequest(ts.server.protocol.CommandTypes.GetEditsForFileRename, args),
    sendGetApplicableRefactors: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.GetApplicableRefactors, args),
    sendGetEditsForRefactor: async (args) => sendRequest(ts.server.protocol.CommandTypes.GetEditsForRefactor, args),
    sendCompletionInfo: async (args) => {
      const res: server.protocol.CompletionInfoResponse = await sendRequest(
        ts.server.protocol.CommandTypes.CompletionInfo,
        args,
      );
      return normalizeCompletionEntries(res.body?.entries ?? []);
    },
    sendCompletionDetails: async (args) => {
      const res: server.protocol.CompletionDetailsResponse = await sendRequest(
        ts.server.protocol.CommandTypes.CompletionDetails,
        args,
      );
      return normalizeCompletionDetails(res.body ?? []);
    },
    sendGetCodeFixes: async (args) => {
      const res: server.protocol.CodeFixResponse = await sendRequest(
        ts.server.protocol.CommandTypes.GetCodeFixes,
        args,
      );
      return normalizeCodeFixActions(res.body ?? []);
    },
  };
}

export function formatPath(path: string) {
  // In windows, tsserver returns paths with '/' instead of '\\'.
  return path.replaceAll('\\', '/');
}

function compareFileSpans(a: FileSpan, b: FileSpan): number {
  return a.file.localeCompare(b.file) || a.start.line - b.start.line || a.start.offset - b.start.offset;
}

function normalizeDefinitions(definitions: readonly server.protocol.DefinitionInfo[]): FileSpanWithContext[] {
  return definitions
    .map((definition) => ({
      file: formatPath(definition.file),
      start: definition.start,
      end: definition.end,
      ...('contextStart' in definition ? { contextStart: definition.contextStart } : {}),
      ...('contextEnd' in definition ? { contextEnd: definition.contextEnd } : {}),
    }))
    .toSorted(compareFileSpans);
}

function normalizeFileSpans(spans: readonly server.protocol.FileSpan[]): FileSpan[] {
  return spans
    .map((span) => ({ file: formatPath(span.file), start: span.start, end: span.end }))
    .toSorted(compareFileSpans);
}

function normalizeRenameLocations(spanGroups: readonly server.protocol.SpanGroup[]): RenameLocation[] {
  return spanGroups
    .flatMap((group) =>
      group.locs.map((loc) => ({
        file: formatPath(group.file),
        start: loc.start,
        end: loc.end,
        ...('prefixText' in loc ? { prefixText: loc.prefixText } : {}),
        ...('suffixText' in loc ? { suffixText: loc.suffixText } : {}),
      })),
    )
    .toSorted(compareFileSpans);
}

function normalizeCompletionEntries(entries: readonly server.protocol.CompletionEntry[]): CompletionEntry[] {
  return entries
    .map((entry) => ({
      name: entry.name,
      sortText: entry.sortText,
      ...('source' in entry ? { source: entry.source } : {}),
      ...('insertText' in entry ? { insertText: entry.insertText } : {}),
    }))
    .toSorted(
      (a, b) =>
        a.sortText.localeCompare(b.sortText) ||
        (a.source ?? '').localeCompare(b.source ?? '') ||
        a.name.localeCompare(b.name),
    );
}

function normalizeCompletionDetails(entries: readonly server.protocol.CompletionEntryDetails[]): CompletionDetails[] {
  return entries.map((entry) =>
    entry.codeActions ? { codeActions: entry.codeActions.map((action) => ({ changes: action.changes })) } : {},
  );
}

function normalizeCodeFixActions(actions: readonly server.protocol.CodeFixAction[]): CodeFixAction[] {
  return actions
    .map((action) => ({ fixName: action.fixName, changes: action.changes }))
    .toSorted((a, b) => a.fixName.localeCompare(b.fixName));
}
