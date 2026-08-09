// Type definitions for the content mapper protocol of TypeScript 7 (microsoft/typescript-go#4712).
// The wire format is JSON-RPC 2.0 with LSP-style `Content-Length` framing.

export const PROTOCOL_VERSION = 1;
export const DIAGNOSTIC_SOURCE = 'cmk';

export const METHOD_NOT_FOUND = -32601;

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
  protocolVersion: number;
  locale?: string;
  positionEncodings: PositionEncoding[];
}

export interface InitializeResult {
  protocolVersion: number;
  positionEncoding: PositionEncoding;
  diagnosticSource?: string;
}

export interface TransformParams {
  fileName: string;
  content: string;
  options?: unknown;
  projectHandle?: string;
  compilerOptions: Record<string, unknown>;
}

export interface TransformResult {
  text: string;
  /** How `text` should be parsed. A value of `ts.ScriptKind`. Defaults to TypeScript if omitted. */
  scriptKind?: number;
  mappings?: SpanMapping[];
  diagnostics?: MapperDiagnostic[];
}

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
  SourceDefinition: 1 << 6,
  References: 1 << 7,
  DocumentHighlights: 1 << 8,
  Rename: 1 << 9,
  CallHierarchy: 1 << 10,
  CodeActions: 1 << 11,
  Formatting: 1 << 12,
  InlayHints: 1 << 13,
  SemanticTokens: 1 << 14,
  FoldingRanges: 1 << 15,
  SelectionRanges: 1 << 16,
  LinkedEditing: 1 << 17,
  AutoInsert: 1 << 18,
  DocumentSymbols: 1 << 19,
  CodeLens: 1 << 20,
  All: (1 << 21) - 1,
} as const;

/** A diagnostic reported by the mapper. `start` and `length` are positions in the original file. */
export interface MapperDiagnostic {
  messageText: string;
  start: number;
  length: number;
  code?: number;
}
