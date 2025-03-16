/** The position of the node in the source file. */
export interface Position {
  /**
   * The line number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  line: number;
  /**
   * The column number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  column: number;
  /** The offset in the source file. It is 0-based. */
  offset: number;
}

/** The location of the node in the source file. */
export interface Location {
  /**
   * The starting position of the node. It is inclusive.
   * This is compatible with postcss and tsserver.
   */
  start: Position;
  /**
   * The ending position of the node. It is exclusive.
   * This is compatible with tsserver, but not postcss.
   */
  end: Position;
}

export type DiagnosticCategory = 'error' | 'warning';

export interface DiagnosticPosition {
  /** The line number in the source file. It is 1-based. */
  line: number;
  /** The column number in the source file. It is 1-based. */
  column: number;
}

export type Diagnostic = SemanticDiagnostic | SyntacticDiagnostic;
interface DiagnosticBase {
  /** Text of diagnostic message. */
  text: string;
  /** The category of the diagnostic message. */
  category: DiagnosticCategory;
}

export interface SemanticDiagnostic extends DiagnosticBase {
  /** The filename of the file in which the diagnostic occurred */
  fileName?: string;
  /** Starting file position at which text applies. It is inclusive. */
  start?: DiagnosticPosition;
  /**  The last file position at which the text applies. It is exclusive. */
  end?: DiagnosticPosition;
}

export interface SyntacticDiagnostic extends DiagnosticBase {
  /** The filename of the file in which the diagnostic occurred */
  fileName: string;
  /** Starting file position at which text applies. It is inclusive. */
  start: DiagnosticPosition;
  /**  The last file position at which the text applies. It is exclusive. */
  end?: DiagnosticPosition;
}
