// Type definitions for the content mapper protocol of TypeScript 7, as of 7.1.0-dev.20261030.1.
// https://github.com/microsoft/TypeScript/blob/0b0aeb31e416c280bcbef7d7734aa21e7d999cdd/tsc/internal/contentmapper/hostimpl.go#L34
// The wire format is JSON-RPC 2.0 with LSP-style `Content-Length` framing.

import type { SpanMapKind } from 'typescript/ast';
import { RequestType } from 'vscode-jsonrpc/node';

export const InitializeRequest = new RequestType<InitializeParams, InitializeResult, void>('initialize');
export const OpenProjectRequest = new RequestType<OpenProjectParams, OpenProjectResult, void>('openProject');
export const CloseProjectRequest = new RequestType<CloseProjectParams, null, void>('closeProject');
export const TransformRequest = new RequestType<TransformParams, TransformResult, void>('transform');

/** The unit in which a mapper expresses the offsets of its mappings and diagnostics. */
export type PositionEncoding = 'utf-8' | 'utf-16';

/** The parameters of the `initialize` request. */
export interface InitializeParams {
  /** The BCP 47 locale for the messages of diagnostics authored by the mapper, if one is configured. */
  locale?: string;
  /** The position encodings that the host can handle. */
  positionEncodings: PositionEncoding[];
}

/** The response to the `initialize` request. */
export interface InitializeResult {
  /** The position encoding used by every mapping and diagnostic of this mapper. */
  positionEncoding: PositionEncoding;
  /** The prefix given to the code of every diagnostic authored by the mapper. */
  diagnosticSource: string;
}

/** The parameters of the `openProject` request. */
export interface OpenProjectParams {
  /** The absolute path of the project's configuration file. Empty if the project has none. */
  configFileName: string;
  /** An opaque handle, assigned by the host, that is only meaningful within this process. */
  projectHandle: string;
  /** The `options` of the mapper's entry in the project's `contentMappers`. */
  options?: unknown;
  /** The compiler options in effect for the project. */
  compilerOptions: Record<string, unknown>;
}

/**
 * The response to the `openProject` request. `configIdentity` and `watchedFiles` are reserved for
 * mappers that declare `dynamicConfig`. This mapper does not declare it, so it returns an empty object.
 */
export type OpenProjectResult = Record<string, never>;

/** The parameters of the `closeProject` request. */
export interface CloseProjectParams {
  projectHandle: string;
}

/** The parameters of the `transform` request. */
export interface TransformParams {
  /** The absolute path of the source file to transform. */
  fileName: string;
  /** The text of the source file to transform. */
  content: string;
  /** The handle of the opened project whose configuration applies to this transform. */
  projectHandle: string;
}

/** The response to the `transform` request. */
export interface TransformResult {
  /** The virtual JavaScript or TypeScript text. */
  text: string;
  /** Decides the syntax with which the virtual text is parsed. */
  extension: VirtualExtension;
  /**
   * The span map in tuple form, with offsets in the selected position encoding. If it is absent or
   * empty, no part of the virtual text corresponds to the source file.
   */
  mappings?: SpanMapping[];
  /** The errors authored by the mapper, located in the source file. */
  diagnostics?: MapperDiagnostic[];
}

export type VirtualExtension = '.js' | '.jsx' | '.mjs' | '.cjs' | '.ts' | '.tsx' | '.mts' | '.cts' | '.json';

/**
 * A segment of the span map, in the tuple form that the host decodes. Without `features`, the segment
 * takes part in all features. With it, the given mask is kept as is, even if it is empty.
 * @see https://github.com/microsoft/TypeScript/blob/0b0aeb31e416c280bcbef7d7734aa21e7d999cdd/tsc/internal/spanmap/spanmap.go#L773
 */
export type SpanMapping = [
  generatedStart: number,
  generatedLength: number,
  originalStart: number,
  originalLength: number,
  kind: SpanMapKind,
  features?: number,
];

/** An error authored by the mapper, located in the source file. */
export interface MapperDiagnostic {
  messageText: string;
  /** The offset of the error in the source file, in the selected position encoding. `length` uses the same unit. */
  start: number;
  length: number;
  code: number;
}
