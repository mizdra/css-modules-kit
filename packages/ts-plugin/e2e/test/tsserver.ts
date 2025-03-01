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
  sendGetCodeFixes(args: server.protocol.CodeFixRequest['arguments']): Promise<server.protocol.GetCodeFixesResponse>;
}

export function launchTsserver(): Tsserver {
  const server = serverHarness.launchServer(
    require.resolve('typescript/lib/tsserver.js'),
    ['--disableAutomaticTypingAcquisition'],
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
