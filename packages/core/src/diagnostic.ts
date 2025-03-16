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
