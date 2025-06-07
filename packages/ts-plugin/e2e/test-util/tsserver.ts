import serverHarness from '@typescript/server-harness';
import type { server } from 'typescript';
import ts from 'typescript';

interface Tsserver {
  sendUpdateOpen(args: server.protocol.UpdateOpenRequest['arguments']): Promise<server.protocol.Response>;
  sendConfigure(args: server.protocol.ConfigureRequest['arguments']): Promise<server.protocol.ConfigureResponse>;
  sendDefinitionAndBoundSpan(
    args: server.protocol.FileLocationRequestArgs,
  ): Promise<server.protocol.DefinitionInfoAndBoundSpanResponse>;
  sendReferences(args: server.protocol.ReferencesRequest['arguments']): Promise<server.protocol.ReferencesResponse>;
  sendRename(args: server.protocol.RenameRequest['arguments']): Promise<server.protocol.RenameResponse>;
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
  sendCompletionInfo(
    args: server.protocol.CompletionsRequest['arguments'],
  ): Promise<server.protocol.CompletionInfoResponse>;
  sendGetCodeFixes(args: server.protocol.CodeFixRequest['arguments']): Promise<server.protocol.CodeFixResponse>;
}

export function launchTsserver(): Tsserver {
  const server = serverHarness.launchServer(
    require.resolve('typescript/lib/tsserver.js'),
    [
      '--disableAutomaticTypingAcquisition',
      '--globalPlugins',
      '@css-modules-kit/ts-plugin',
      '--pluginProbeLocations',
      __dirname,
    ],
    [],
  );
  let seq = 0;
  async function sendRequest(
    command: string,
    args?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    sendDefinitionAndBoundSpan: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.DefinitionAndBoundSpan, args),
    sendReferences: async (args) => sendRequest(ts.server.protocol.CommandTypes.References, args),
    sendRename: async (args) => sendRequest(ts.server.protocol.CommandTypes.Rename, args),
    sendSemanticDiagnosticsSync: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.SemanticDiagnosticsSync, args),
    sendSyntacticDiagnosticsSync: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.SyntacticDiagnosticsSync, args),
    sendGetEditsForFileRename: async (args) => sendRequest(ts.server.protocol.CommandTypes.GetEditsForFileRename, args),
    sendGetApplicableRefactors: async (args) =>
      sendRequest(ts.server.protocol.CommandTypes.GetApplicableRefactors, args),
    sendGetEditsForRefactor: async (args) => sendRequest(ts.server.protocol.CommandTypes.GetEditsForRefactor, args),
    sendCompletionInfo: async (args) => sendRequest(ts.server.protocol.CommandTypes.CompletionInfo, args),
    sendGetCodeFixes: async (args) => sendRequest(ts.server.protocol.CommandTypes.GetCodeFixes, args),
  };
}

export function formatPath(path: string) {
  // In windows, tsserver returns paths with '/' instead of '\\'.
  return path.replaceAll('\\', '/');
}

export function simplifyDefinitions(definitions: readonly ts.server.protocol.DefinitionInfo[]) {
  return definitions.map((definition) => {
    return {
      file: formatPath(definition.file),
      start: definition.start,
      end: definition.end,
    };
  });
}
export function sortDefinitions(definitions: readonly ts.server.protocol.DefinitionInfo[]) {
  return definitions.toSorted((a, b) => {
    return a.file.localeCompare(b.file) || a.start.line - b.start.line || a.start.offset - b.start.offset;
  });
}

type SimplifiedSpanGroup = {
  file: string;
  locs: ts.server.protocol.TextSpan[];
};

export function simplifySpanGroups(spanGroups: readonly ts.server.protocol.SpanGroup[]): SimplifiedSpanGroup[] {
  return spanGroups.map((loc) => {
    return {
      file: formatPath(loc.file),
      locs: loc.locs.map((loc) => ({
        start: loc.start,
        end: loc.end,
        ...('prefixText' in loc ? { prefixText: loc.prefixText } : {}),
        ...('suffixText' in loc ? { suffixText: loc.suffixText } : {}),
      })),
    };
  });
}

export function sortSpanGroups(spanGroups: SimplifiedSpanGroup[]): SimplifiedSpanGroup[] {
  const sortedLocs = spanGroups.toSorted((a, b) => {
    return a.file.localeCompare(b.file);
  });
  for (const loc of sortedLocs) {
    loc.locs.sort((a, b) => {
      return a.start.line - b.start.line || a.start.offset - b.start.offset;
    });
  }
  return sortedLocs;
}

type SimplifiedReferencesResponseItem = {
  file: string;
  start: ts.server.protocol.Location;
  end: ts.server.protocol.Location;
};

export function simplifyRefItems(
  refs: readonly ts.server.protocol.ReferencesResponseItem[],
): SimplifiedReferencesResponseItem[] {
  return refs.map((ref) => {
    return {
      file: formatPath(ref.file),
      start: ref.start,
      end: ref.end,
    };
  });
}

export function sortRefItems(refs: readonly SimplifiedReferencesResponseItem[]) {
  return refs.toSorted((a, b) => {
    return a.file.localeCompare(b.file) || a.start.line - b.start.line || a.start.offset - b.start.offset;
  });
}

export function mergeSpanGroups(fileSpans: ts.server.protocol.FileSpan[]): SimplifiedSpanGroup[] {
  const spanGroups: SimplifiedSpanGroup[] = [];
  for (const fileSpan of fileSpans) {
    const existingGroup = spanGroups.find((group) => group.file === fileSpan.file);
    if (existingGroup) {
      existingGroup.locs.push({ start: fileSpan.start, end: fileSpan.end });
    } else {
      spanGroups.push({
        file: fileSpan.file,
        locs: [{ start: fileSpan.start, end: fileSpan.end }],
      });
    }
  }
  return spanGroups;
}

type SimplifiedCompletionEntry = {
  name: string;
  sortText: string;
  source?: string;
  insertText?: string;
};

export function simplifyCompletionEntry(
  entries: readonly ts.server.protocol.CompletionEntry[],
): SimplifiedCompletionEntry[] {
  return entries.map((entry) => {
    return {
      name: entry.name,
      sortText: entry.sortText,
      ...('source' in entry ? { source: entry.source } : {}),
      ...('insertText' in entry ? { insertText: entry.insertText } : {}),
    };
  });
}

export function compareCompletionEntries(a: SimplifiedCompletionEntry, b: SimplifiedCompletionEntry) {
  return (
    a.sortText?.localeCompare(b.sortText ?? '') ||
    a.source?.localeCompare(b.source ?? '') ||
    a.name.localeCompare(b.name)
  );
}

type SimplifiedCodeFixAction = {
  fixName: string;
  changes: ts.server.protocol.FileCodeEdits[];
};

export function simplifyCodeFixActions(
  actions: readonly ts.server.protocol.CodeFixAction[],
): SimplifiedCodeFixAction[] {
  return actions.map((action) => {
    return {
      fixName: action.fixName,
      changes: action.changes,
    };
  });
}

export function sortCodeFixActions(actions: readonly SimplifiedCodeFixAction[]): SimplifiedCodeFixAction[] {
  return actions.toSorted((a, b) => {
    return a.fixName.localeCompare(b.fixName);
  });
}
