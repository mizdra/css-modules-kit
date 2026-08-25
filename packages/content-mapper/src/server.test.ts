import { PassThrough } from 'node:stream';
import { expect, test } from 'vite-plus/test';
import type { NormalizedMapperOptions } from './options.js';
import { runServer } from './server.js';
import { transformCSS } from './transformer.js';

const defaultMapperOptions: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};

function startServer() {
  const input = new PassThrough();
  const output = new PassThrough();
  const done = runServer(input, output);
  return { input, output, done };
}

function encodeFrame(message: unknown): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(message));
  const header = new TextEncoder().encode(`Content-Length: ${body.length}\r\n\r\n`);
  const frame = new Uint8Array(header.length + body.length);
  frame.set(header, 0);
  frame.set(body, header.length);
  return frame;
}

function writeFrame(input: PassThrough, message: unknown): void {
  input.write(encodeFrame(message));
}

// The server responses in tests are ASCII-only, so string offsets equal byte offsets.
function readResponses(output: PassThrough): unknown[] {
  const data = (output.read() as Uint8Array | null) ?? new Uint8Array(0);
  let rest = new TextDecoder().decode(data);
  const responses: unknown[] = [];
  while (rest.length > 0) {
    const match = /^Content-Length: (\d+)\r\n\r\n/u.exec(rest);
    if (match === null) throw new Error(`Malformed response: ${JSON.stringify(rest)}`);
    const bodyStart = match[0].length;
    const bodyEnd = bodyStart + Number(match[1]);
    responses.push(JSON.parse(rest.slice(bodyStart, bodyEnd)));
    rest = rest.slice(bodyEnd);
  }
  return responses;
}

function createInitializeRequest(id: number) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: { positionEncodings: ['utf-8', 'utf-16'] },
  };
}

function createInitializeResponse(id: number) {
  return {
    jsonrpc: '2.0',
    id,
    result: { positionEncoding: 'utf-16', diagnosticSource: 'cmk' },
  };
}

function createOpenProjectRequest(id: number, projectHandle: string, options?: unknown) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'openProject',
    params: {
      configFileName: '/tsconfig.json',
      projectHandle,
      ...(options === undefined ? {} : { options }),
      compilerOptions: {},
    },
  };
}

function createOpenProjectResponse(id: number) {
  return { jsonrpc: '2.0', id, result: {} };
}

function createTransformRequest(id: number, content: string, projectHandle = 'p1') {
  return {
    jsonrpc: '2.0',
    id,
    method: 'transform',
    params: { fileName: '/a.module.css', content, projectHandle },
  };
}

function createTransformResponse(id: number, content: string, options: NormalizedMapperOptions = defaultMapperOptions) {
  const { text, mappings, diagnostics } = transformCSS('/a.module.css', content, options);
  return {
    jsonrpc: '2.0',
    id,
    result: {
      text,
      extension: '.ts',
      ...(mappings.length > 0 ? { mappings } : {}),
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    },
  };
}

test('responds to initialize with utf-16 encoding and cmk diagnostic source', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createInitializeRequest(1));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([createInitializeResponse(1)]);
});

test('responds to transform with generated text, extension, and span mappings', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createInitializeRequest(1));
  writeFrame(input, createOpenProjectRequest(2, 'p1'));
  writeFrame(input, createTransformRequest(3, '.a1 { color: red; }'));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    createInitializeResponse(1),
    createOpenProjectResponse(2),
    createTransformResponse(3, '.a1 { color: red; }'),
  ]);
});

test('applies the mapper options of the project referenced by the transform', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createOpenProjectRequest(1, 'p1'));
  writeFrame(input, createOpenProjectRequest(2, 'p2', { namedExports: true }));
  writeFrame(input, createTransformRequest(3, '', 'p1'));
  writeFrame(input, createTransformRequest(4, '', 'p2'));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    createOpenProjectResponse(1),
    createOpenProjectResponse(2),
    createTransformResponse(3, ''),
    createTransformResponse(4, '', { ...defaultMapperOptions, namedExports: true }),
  ]);
});

test('reports invalid mapper options as optionDiagnostics in the openProject response', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createOpenProjectRequest(1, 'p1', { animation: 'yes' }));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        optionDiagnostics: [{ path: ['animation'], messageText: '`animation` must be a boolean.', code: 1002 }],
      },
    },
  ]);
});

test('responds with an invalid-params error to a transform with an unopened project handle', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createTransformRequest(1, ''));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    { jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Unknown project handle: p1' } },
  ]);
});

test('releases the project options on closeProject', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createOpenProjectRequest(1, 'p1'));
  writeFrame(input, { jsonrpc: '2.0', id: 2, method: 'closeProject', params: { projectHandle: 'p1' } });
  writeFrame(input, createTransformRequest(3, ''));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    createOpenProjectResponse(1),
    { jsonrpc: '2.0', id: 2, result: null },
    { jsonrpc: '2.0', id: 3, error: { code: -32602, message: 'Unknown project handle: p1' } },
  ]);
});

test('responds with method-not-found error to unknown methods', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, { jsonrpc: '2.0', id: 1, method: 'shutdown', params: {} });
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    { jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found: shutdown' } },
  ]);
});

test('parses a frame split across multiple chunks', async () => {
  const { input, output, done } = startServer();
  const frame = encodeFrame(createInitializeRequest(1));
  input.write(frame.subarray(0, 10));
  input.write(frame.subarray(10, 20));
  input.write(frame.subarray(20));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([createInitializeResponse(1)]);
});

test('parses multiple frames arriving in a single chunk', async () => {
  const { input, output, done } = startServer();
  const frame1 = encodeFrame(createInitializeRequest(1));
  const frame2 = encodeFrame(createInitializeRequest(2));
  const chunk = new Uint8Array(frame1.length + frame2.length);
  chunk.set(frame1, 0);
  chunk.set(frame2, frame1.length);
  input.write(chunk);
  input.end();
  await done;
  expect(readResponses(output)).toEqual([createInitializeResponse(1), createInitializeResponse(2)]);
});

test('reads frame bodies by UTF-8 byte length', async () => {
  const { input, output, done } = startServer();
  // `あ` is 1 UTF-16 code unit but 3 UTF-8 bytes. If the server measured the body in UTF-16
  // code units, the boundary of the second frame would be misaligned. The `あ` is placed in
  // a comment so that the response stays ASCII-only for `readResponses`.
  const content = '/* あ */ .a1 { color: red; }';
  writeFrame(input, createOpenProjectRequest(1, 'p1'));
  writeFrame(input, createTransformRequest(2, content));
  writeFrame(input, createInitializeRequest(3));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    createOpenProjectResponse(1),
    createTransformResponse(2, content),
    createInitializeResponse(3),
  ]);
});

test('resolves when input ends', async () => {
  const { input, done } = startServer();
  input.end();
  await expect(done).resolves.toBeUndefined();
});
