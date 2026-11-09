import { PassThrough } from 'node:stream';
import { expect, test } from 'vite-plus/test';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { InitializeRequest, TransformRequest } from './protocol.js';
import { runServer } from './server.js';

function startServer() {
  const input = new PassThrough();
  const output = new PassThrough();
  const done = runServer(input, output);
  const client = createMessageConnection(new StreamMessageReader(output), new StreamMessageWriter(input));
  client.listen();
  return { client, input, done };
}

test('responds to initialize with utf-16 encoding and cmk diagnostic source', async () => {
  const { client } = startServer();
  const result = await client.sendRequest(InitializeRequest, { positionEncodings: ['utf-8', 'utf-16'] });
  expect(result).toStrictEqual({ positionEncoding: 'utf-16', diagnosticSource: 'cmk' });
});

test('responds to transform with the transformed text', async () => {
  const { client } = startServer();
  const result = await client.sendRequest(TransformRequest, {
    fileName: '/a.css',
    content: '.a1 { color: red; }',
    projectHandle: 'p1',
  });
  expect(result).toStrictEqual({ text: 'export {};\n', mappings: [], diagnostics: [], extension: '.ts' });
});

test('resolves when input ends', async () => {
  const { input, done } = startServer();
  input.end();
  await expect(done).resolves.toBeUndefined();
});

test('rejects when a malformed message is received', async () => {
  const { input, done } = startServer();
  input.write('Content-Type: application/json\r\n\r\n');
  await expect(done).rejects.toThrow();
});
