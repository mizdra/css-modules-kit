import { PassThrough } from 'node:stream';
import { expect, test } from 'vite-plus/test';
import { createMessageConnection, ErrorCodes, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { CloseProjectRequest, InitializeRequest, OpenProjectRequest, TransformRequest } from './protocol.js';
import { runServer } from './server.js';

function startServer() {
  const input = new PassThrough();
  const output = new PassThrough();
  const done = runServer(input, output);
  const client = createMessageConnection(new StreamMessageReader(output), new StreamMessageWriter(input));
  client.listen();
  return { client, input, done };
}

const openProjectParams = { configFileName: '/tsconfig.json', projectHandle: 'p1', compilerOptions: {} };
const transformParams = { fileName: '/a.module.css', content: '.a1 { color: red; }', projectHandle: 'p1' };
const unknownProjectError = { code: ErrorCodes.InvalidParams, message: 'Unknown project handle: p1' };

test('responds to initialize with utf-16 encoding and cmk diagnostic source', async () => {
  const { client } = startServer();
  const result = await client.sendRequest(InitializeRequest, { positionEncodings: ['utf-8', 'utf-16'] });
  expect(result).toStrictEqual({ positionEncoding: 'utf-16', diagnosticSource: 'cmk' });
});

test('responds to transform with an empty module', async () => {
  const { client } = startServer();
  await client.sendRequest(OpenProjectRequest, openProjectParams);
  const result = await client.sendRequest(TransformRequest, transformParams);
  expect(result).toStrictEqual({ text: 'export {};\n', extension: '.ts' });
});

test('responds with an invalid-params error to a transform with an unopened project handle', async () => {
  const { client } = startServer();
  await expect(client.sendRequest(TransformRequest, transformParams)).rejects.toMatchObject(unknownProjectError);
});

test('releases the project on closeProject', async () => {
  const { client } = startServer();
  await client.sendRequest(OpenProjectRequest, openProjectParams);
  await client.sendRequest(CloseProjectRequest, { projectHandle: 'p1' });
  await expect(client.sendRequest(TransformRequest, transformParams)).rejects.toMatchObject(unknownProjectError);
});

test('resolves when input ends', async () => {
  const { input, done } = startServer();
  input.end();
  await expect(done).resolves.toBeUndefined();
});

test('rejects when a message lacks the Content-Length header', async () => {
  const { input, done } = startServer();
  input.write('Content-Type: application/json\r\n\r\n');
  await expect(done).rejects.toThrow('Header must provide a Content-Length property');
});
