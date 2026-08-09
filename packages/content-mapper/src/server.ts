import type { Readable, Writable } from 'node:stream';
import { ProtocolError } from './error.js';
import { normalizeMapperOptions } from './options.js';
import type {
  InitializeResult,
  MapperDiagnostic,
  RequestMessage,
  ResponseMessage,
  TransformParams,
  TransformResult,
} from './protocol.js';
import { DIAGNOSTIC_SOURCE, METHOD_NOT_FOUND, PROTOCOL_VERSION } from './protocol.js';
import { transformCSSModule } from './transformer.js';

const HEADER_TERMINATOR = new Uint8Array([0x0d, 0x0a, 0x0d, 0x0a]); // '\r\n\r\n'

interface FrameDecoder {
  push(chunk: Uint8Array): string[];
}

function createFrameDecoder(): FrameDecoder {
  let buffer: Uint8Array = new Uint8Array(0);
  let contentLength: number | undefined;
  return {
    push(chunk: Uint8Array): string[] {
      buffer = concatBytes(buffer, chunk);
      const frames: string[] = [];
      while (true) {
        if (contentLength === undefined) {
          const headerEnd = indexOfHeaderTerminator(buffer);
          if (headerEnd === -1) break;
          const header = new TextDecoder().decode(buffer.subarray(0, headerEnd));
          contentLength = parseContentLength(header);
          buffer = buffer.subarray(headerEnd + HEADER_TERMINATOR.length);
        }
        if (buffer.length < contentLength) break;
        frames.push(new TextDecoder().decode(buffer.subarray(0, contentLength)));
        buffer = buffer.subarray(contentLength);
        contentLength = undefined;
      }
      return frames;
    },
  };
}

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

/**
 * @throws {ProtocolError} When the header lacks a valid `Content-Length` field.
 */
function parseContentLength(header: string): number {
  const match = /^Content-Length:\s*(\d+)\s*$/mu.exec(header);
  if (match === null) throw new ProtocolError(`Invalid header: ${JSON.stringify(header)}`);
  return Number(match[1]);
}

function isRequestMessage(message: unknown): message is RequestMessage {
  return typeof message === 'object' && message !== null && 'method' in message && 'id' in message;
}

function createResponse(request: RequestMessage): ResponseMessage {
  switch (request.method) {
    case 'initialize': {
      const result: InitializeResult = {
        protocolVersion: PROTOCOL_VERSION,
        positionEncoding: 'utf-16',
        diagnosticSource: DIAGNOSTIC_SOURCE,
      };
      return { jsonrpc: '2.0', id: request.id, result };
    }
    case 'transform': {
      const params = request.params as TransformParams;
      const { options, errors } = normalizeMapperOptions(params.options);
      const output = transformCSSModule(params.fileName, params.content, options);
      const diagnostics: MapperDiagnostic[] = [
        ...errors.map((message) => ({ messageText: message, start: 0, length: 0 })),
        ...output.diagnostics,
      ];
      const result: TransformResult = {
        text: output.text,
        ...(output.mappings.length > 0 ? { mappings: output.mappings } : {}),
        ...(diagnostics.length > 0 ? { diagnostics } : {}),
      };
      return { jsonrpc: '2.0', id: request.id, result };
    }
    default:
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: METHOD_NOT_FOUND, message: `Method not found: ${request.method}` },
      };
  }
}

function encodeFrame(message: ResponseMessage): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(message));
  const header = new TextEncoder().encode(`Content-Length: ${body.length}\r\n\r\n`);
  return concatBytes(header, body);
}

/**
 * Reads content mapper protocol requests from `input` and writes responses to `output`.
 * @returns A promise that resolves when `input` ends, and rejects on a malformed frame.
 */
export async function runServer(input: Readable, output: Writable): Promise<void> {
  return new Promise((resolve, reject) => {
    const decoder = createFrameDecoder();
    input.on('data', (chunk: Uint8Array) => {
      try {
        for (const frame of decoder.push(chunk)) {
          const message: unknown = JSON.parse(frame);
          if (isRequestMessage(message)) {
            output.write(encodeFrame(createResponse(message)));
          }
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    input.on('end', () => resolve());
    input.on('error', reject);
  });
}
