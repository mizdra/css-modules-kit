import type { Readable, Writable } from 'node:stream';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import type { InitializeResult } from './protocol.js';
import { CloseProjectRequest, InitializeRequest, OpenProjectRequest, TransformRequest } from './protocol.js';
import { transformCSS } from './transformer.js';

/**
 * Starts a server that responds to the content mapper protocol.
 * @returns A promise that resolves when `input` closes, and rejects on a malformed message or a write failure.
 */
export async function runServer(input: Readable, output: Writable): Promise<void> {
  const connection = createMessageConnection(new StreamMessageReader(input), new StreamMessageWriter(output));

  connection.onRequest(InitializeRequest, (): InitializeResult => ({
    positionEncoding: 'utf-16',
    diagnosticSource: 'cmk',
  }));
  connection.onRequest(OpenProjectRequest, () => ({}));
  connection.onRequest(CloseProjectRequest, () => null);
  connection.onRequest(TransformRequest, (params) => ({
    ...transformCSS(params.fileName, params.content),
    extension: '.ts',
  }));

  const { promise, resolve, reject } = Promise.withResolvers<void>();
  connection.onClose(() => resolve());
  connection.onError(([error]) => reject(error));
  connection.listen();
  return promise;
}
