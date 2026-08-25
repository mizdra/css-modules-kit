// Type definitions for the content mapper protocol of TypeScript 7
// (microsoft/typescript-go#4712, microsoft/TypeScript#63936).
// The wire format is JSON-RPC 2.0 with LSP-style `Content-Length` framing.

export const DIAGNOSTIC_SOURCE = 'cmk';

export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;

export interface RequestMessage {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface ResponseMessage {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: ResponseError;
}

export interface ResponseError {
  code: number;
  message: string;
  data?: unknown;
}

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
export interface OpenProjectResult {
  optionDiagnostics?: OptionDiagnostic[];
}

/** An invalid mapper option. `path` locates the value within the mapper entry's options object. */
export interface OptionDiagnostic {
  path: (string | number)[];
  messageText: string;
  code: number;
}

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

export const SpanMapKind = {
  /** Positions correspond 1:1 within the spans. */
  Verbatim: 0,
  /** The spans correspond only as a whole. */
  Atom: 1,
  /** Like `Atom`, but the spans have unrelated text (e.g. different names). */
  Alias: 2,
} as const;

export type SpanMapKind = (typeof SpanMapKind)[keyof typeof SpanMapKind];

/** Bit flags of language service features enabled for a span. Omitted means all features. */
export const SpanMapFeature = {
  Hover: 1 << 0,
  SignatureHelp: 1 << 1,
  Completion: 1 << 2,
  Definition: 1 << 3,
  TypeDefinition: 1 << 4,
  Implementation: 1 << 5,
  References: 1 << 6,
  DocumentHighlights: 1 << 7,
  Rename: 1 << 8,
  CallHierarchy: 1 << 9,
  CodeActions: 1 << 10,
  Formatting: 1 << 11,
  InlayHints: 1 << 12,
  SemanticTokens: 1 << 13,
  FoldingRanges: 1 << 14,
  SelectionRanges: 1 << 15,
  LinkedEditing: 1 << 16,
  AutoInsert: 1 << 17,
  DocumentSymbols: 1 << 18,
  CodeLens: 1 << 19,
  All: (1 << 20) - 1,
} as const;

/** A diagnostic reported by the mapper. `start` and `length` are positions in the original file. */
export interface MapperDiagnostic {
  messageText: string;
  start: number;
  length: number;
  code: number;
}
