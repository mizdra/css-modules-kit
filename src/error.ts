export class ConfigNotFoundError extends Error {
  code = 'CONFIG_NOT_FOUND';
  constructor() {
    super('No config file found. Did you forget to create hcm.config.{js,mjs,cjs}?');
  }
}

export class ConfigImportError extends Error {
  code = 'CONFIG_IMPORT_ERROR';
  constructor(path: string, options: ErrorOptions) {
    super(`Failed to import config file (${path}).`, options);
  }
}
