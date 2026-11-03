// Type definitions for the content mapper protocol of TypeScript 7
// (microsoft/typescript-go#4712, microsoft/TypeScript#63936).
// The wire format is JSON-RPC 2.0 with LSP-style `Content-Length` framing.

import type { SpanMapKind } from 'typescript/ast';
import { RequestType } from 'vscode-jsonrpc/node';

export const DIAGNOSTIC_SOURCE = 'cmk';

export const InitializeRequest = new RequestType<InitializeParams, InitializeResult, void>('initialize');
export const OpenProjectRequest = new RequestType<OpenProjectParams, OpenProjectResult, void>('openProject');
export const CloseProjectRequest = new RequestType<CloseProjectParams, null, void>('closeProject');
export const TransformRequest = new RequestType<TransformParams, TransformResult, void>('transform');

export type PositionEncoding = 'utf-8' | 'utf-16';

export interface InitializeParams {
  locale?: string;
  positionEncodings: PositionEncoding[];
}

export interface InitializeResult {
  positionEncoding: PositionEncoding;
  /** The prefix of mapper-authored diagnostic codes. Must not collide with other diagnostic sources. */
  diagnosticSource: string;
}

export interface OpenProjectParams {
  /** The absolute path of the project's tsconfig, or an empty string for an inferred project. */
  configFileName: string;
  /** An opaque handle assigned by the host. Subsequent transforms reference it. */
  projectHandle: string;
  /** The mapper entry's `options` from the project's `contentMappers` configuration. */
  options?: unknown;
  compilerOptions: Record<string, unknown>;
}

/**
 * The response to an openProject request. `configIdentity` and `watchedFiles` may only be
 * returned by mappers that declare `dynamicConfig`, so cmk omits them.
 */
export type OpenProjectResult = Record<string, never>;

export interface CloseProjectParams {
  projectHandle: string;
}

export interface TransformParams {
  fileName: string;
  content: string;
  /** The handle of an opened project whose options apply to this transform. */
  projectHandle: string;
}

export interface TransformResult {
  text: string;
  /** Determines how `text` is parsed. */
  extension: VirtualExtension;
  mappings?: SpanMapping[];
  diagnostics?: MapperDiagnostic[];
}

export type VirtualExtension = '.js' | '.jsx' | '.mjs' | '.cjs' | '.ts' | '.tsx' | '.mts' | '.cts' | '.json';

/** A mapping between a span in the generated text and a span in the original file. */
export type SpanMapping = [
  generatedStart: number,
  generatedLength: number,
  originalStart: number,
  originalLength: number,
  kind: SpanMapKind,
  features?: number,
];

/** A diagnostic reported by the mapper. `start` and `length` are positions in the original file. */
export interface MapperDiagnostic {
  messageText: string;
  start: number;
  length: number;
  code: number;
}
