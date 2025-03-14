import { SystemError } from '@css-modules-kit/core';

export class WriteDtsFileError extends SystemError {
  constructor(fileName: string, cause: unknown) {
    super('WRITE_DTS_FILE_ERROR', `Failed to write .d.ts file ${fileName}.`, cause);
  }
}

export class ReadCSSModuleFileError extends SystemError {
  constructor(fileName: string, cause: unknown) {
    super('READ_CSS_MODULE_FILE_ERROR', `Failed to read CSS Module file ${fileName}.`, cause);
  }
}
