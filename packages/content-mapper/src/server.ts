import type { Readable, Writable } from 'node:stream';
import {
  createMessageConnection,
  ErrorCodes,
  ResponseError,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node';
import type { InitializeResult } from './protocol.js';
import {
  CloseProjectRequest,
  DIAGNOSTIC_SOURCE,
  InitializeRequest,
  OpenProjectRequest,
  TransformRequest,
} from './protocol.js';

/**
 * Reads content mapper protocol requests from `input` and writes responses to `output`.
 * @returns A promise that resolves when `input` closes, and rejects on a malformed message or a write failure.
 */
export async function runServer(input: Readable, output: Writable): Promise<void> {
  const connection = createMessageConnection(new StreamMessageReader(input), new StreamMessageWriter(output));
  const projects = new Set<string>();

  connection.onRequest(InitializeRequest, (): InitializeResult => ({
    positionEncoding: 'utf-16',
    diagnosticSource: DIAGNOSTIC_SOURCE,
  }));
  connection.onRequest(OpenProjectRequest, (params) => {
    projects.add(params.projectHandle);
    return {};
  });
  connection.onRequest(CloseProjectRequest, (params) => {
    projects.delete(params.projectHandle);
    return null;
  });
  connection.onRequest(TransformRequest, (params) => {
    if (!projects.has(params.projectHandle)) {
      return new ResponseError(ErrorCodes.InvalidParams, `Unknown project handle: ${params.projectHandle}`);
    }
    // TODO: Transform CSS Modules into TypeScript code. For now, every file becomes an empty module.
    return { text: 'export {};\n', extension: '.ts' };
  });

  return new Promise((resolve, reject) => {
    connection.onClose(() => resolve());
    connection.onError(([error]) => reject(error));
    connection.listen();
  });
}
