export type DiagnosticCategory = 'error';

export interface DiagnosticPosition {
  /** The line number in the source file. It is 1-based. */
  line: number;
  /** The column number in the source file. It is 1-based. */
  column: number;
}

export type Diagnostic = SystemDiagnostic | SemanticDiagnostic | SyntacticDiagnostic;

interface DiagnosticBase {
  /** Text of diagnostic message. */
  text: string;
  /** The category of the diagnostic message. */
  category: DiagnosticCategory;
}

export interface SystemDiagnostic extends DiagnosticBase {
  type: 'system';
  cause?: unknown;
}

export interface SemanticDiagnostic extends DiagnosticBase {
  type: 'semantic';
  /** The filename of the file in which the diagnostic occurred */
  filename?: string;
  /** Starting file position at which text applies. It is inclusive. */
  start?: DiagnosticPosition;
  /**  The last file position at which the text applies. It is exclusive. */
  end?: DiagnosticPosition;
}

export interface SyntacticDiagnostic extends DiagnosticBase {
  type: 'syntactic';
  /** The filename of the file in which the diagnostic occurred */
  filename: string;
  /** Starting file position at which text applies. It is inclusive. */
  start: DiagnosticPosition;
  /**  The last file position at which the text applies. It is exclusive. */
  end?: DiagnosticPosition;
}
