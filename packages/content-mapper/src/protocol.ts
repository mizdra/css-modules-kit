// Type definitions for the content mapper protocol of TypeScript 7, as of 7.1.0-dev.20261030.1.
// https://github.com/microsoft/TypeScript/blob/0b0aeb31e416c280bcbef7d7734aa21e7d999cdd/tsc/internal/contentmapper/hostimpl.go#L34
// The wire format is JSON-RPC 2.0 with LSP-style `Content-Length` framing.

import type { SpanMapKind } from 'typescript/ast';

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
