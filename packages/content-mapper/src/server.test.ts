import { PassThrough } from 'node:stream';
import { expect, test } from 'vite-plus/test';
import type { NormalizedMapperOptions } from './options.js';
import { runServer } from './server.js';
import { transformCSSModule } from './transformer.js';

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
    params: { protocolVersion: 1, positionEncodings: ['utf-8', 'utf-16'] },
  };
}

function createInitializeResponse(id: number) {
  return {
    jsonrpc: '2.0',
    id,
    result: { protocolVersion: 1, positionEncoding: 'utf-16', diagnosticSource: 'cmk' },
  };
}

function createTransformRequest(id: number, content: string) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'transform',
    params: { fileName: '/a.module.css', content, compilerOptions: {} },
  };
}

function createTransformResponse(id: number, content: string) {
  const { text, mappings, diagnostics } = transformCSSModule('/a.module.css', content, defaultMapperOptions);
  return {
    jsonrpc: '2.0',
    id,
    result: {
      text,
      ...(mappings.length > 0 ? { mappings } : {}),
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    },
  };
}

test('responds to initialize with protocol version 1, utf-16 encoding, and cmk diagnostic source', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createInitializeRequest(1));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    {
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: 1, positionEncoding: 'utf-16', diagnosticSource: 'cmk' },
    },
  ]);
});

test('responds to transform with generated text and span mappings', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, createInitializeRequest(1));
  writeFrame(input, createTransformRequest(2, '.a1 { color: red; }'));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    createInitializeResponse(1),
    createTransformResponse(2, '.a1 { color: red; }'),
  ]);
});

test('applies mapper options from transform params', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, {
    jsonrpc: '2.0',
    id: 1,
    method: 'transform',
    params: { fileName: '/a.module.css', content: '', options: { namedExports: true }, compilerOptions: {} },
  });
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    { jsonrpc: '2.0', id: 1, result: { text: 'declare const styles: {};\nexport default styles;\n' } },
  ]);
});

test('reports option normalization errors as diagnostics at the file head', async () => {
  const content = '.a1 { color: red; }';
  const { input, output, done } = startServer();
  writeFrame(input, {
    jsonrpc: '2.0',
    id: 1,
    method: 'transform',
    params: { fileName: '/a.module.css', content, options: { animation: 'yes' }, compilerOptions: {} },
  });
  input.end();
  await done;
  const expected = transformCSSModule('/a.module.css', content, defaultMapperOptions);
  expect(readResponses(output)).toEqual([
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        text: expected.text,
        mappings: expected.mappings,
        diagnostics: [{ messageText: '`animation` must be a boolean.', start: 0, length: 0 }],
      },
    },
  ]);
});

test('responds with method-not-found error to unknown methods', async () => {
  const { input, output, done } = startServer();
  writeFrame(input, { jsonrpc: '2.0', id: 1, method: 'openProject', params: {} });
  input.end();
  await done;
  expect(readResponses(output)).toEqual([
    { jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found: openProject' } },
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
  writeFrame(input, createTransformRequest(1, content));
  writeFrame(input, createInitializeRequest(2));
  input.end();
  await done;
  expect(readResponses(output)).toEqual([createTransformResponse(1, content), createInitializeResponse(2)]);
});

test('resolves when input ends', async () => {
  const { input, done } = startServer();
  input.end();
  await expect(done).resolves.toBeUndefined();
});
