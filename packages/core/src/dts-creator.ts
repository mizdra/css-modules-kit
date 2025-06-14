import type { CSSModule, MatchesPattern, Resolver, Token, TokenImporter } from './type.js';

export const STYLES_EXPORT_NAME = 'styles';

export interface CreateDtsHost {
  resolver: Resolver;
  matchesPattern: MatchesPattern;
}

export interface CreateDtsOptions {
  namedExports: boolean;
}

interface CodeMapping {
  /** The source offsets of the tokens in the *.module.css file. */
  sourceOffsets: number[];
  /** The lengths of the tokens in the *.module.css file. */
  lengths: number[];
  /** The generated offsets of the tokens in the *.d.ts file. */
  generatedOffsets: number[];
}

/** The map linking the two codes in *.d.ts */
// NOTE: `sourceOffsets` and `generatedOffsets` are interchangeable. Exchanging code assignments does not change the behavior.
interface LinkedCodeMapping extends CodeMapping {
  /** The offset of the first code to be linked. */
  sourceOffsets: number[];
  /** The length of the first code to be linked. */
  lengths: number[];
  /** The offset of the second code to be linked. */
  generatedOffsets: number[];
  /** The length of the second code to be linked. */
  generatedLengths: number[];
}

interface CreateDtsResult {
  text: string;
  mapping: CodeMapping;
  linkedCodeMapping: LinkedCodeMapping;
}

/**
 * Create a d.ts file.
 */
export function createDts(cssModules: CSSModule, host: CreateDtsHost, options: CreateDtsOptions): CreateDtsResult {
  // Filter external files
  const tokenImporters = cssModules.tokenImporters.filter((tokenImporter) => {
    const resolved = host.resolver(tokenImporter.from, { request: cssModules.fileName });
    return resolved !== undefined && host.matchesPattern(resolved);
  });
  if (options.namedExports) {
    return createNamedExportsDts(cssModules.localTokens, tokenImporters);
  } else {
    return createDefaultExportDts(cssModules.localTokens, tokenImporters);
  }
}

/**
 * Create a d.ts file with named exports.
 * @example
 * If the CSS module file is:
 * ```css
 * @import './a.module.css';
 * @value local1: string;
 * @value imported1, imported2 as aliasedImported2 from './b.module.css';
 * .local2 { color: red }
 * ```
 * The d.ts file would be:
 * ```ts
 * // @ts-nocheck
 * export var local1: string;
 * export var local2: string;
 * export * from './a.module.css';
 * export {
 *   imported1,
 *   imported2 as aliasedImported2,
 * } from './b.module.css';
 * ```
 */
function createNamedExportsDts(
  localTokens: Token[],
  tokenImporters: TokenImporter[],
): { text: string; mapping: CodeMapping; linkedCodeMapping: LinkedCodeMapping } {
  const mapping: CodeMapping = { sourceOffsets: [], lengths: [], generatedOffsets: [] };
  const linkedCodeMapping: LinkedCodeMapping = {
    sourceOffsets: [],
    lengths: [],
    generatedOffsets: [],
    generatedLengths: [],
  };

  // MEMO: Depending on the TypeScript compilation options, the generated type definition file contains compile errors.
  // For example, it contains `Top-level 'await' expressions are only allowed when the 'module' option is set to ...` error.
  //
  // If `--skipLibCheck` is false, those errors will be reported by `tsc`. However, these are negligible errors.
  // Therefore, `@ts-nocheck` is added to the generated type definition file.
  let text = `// @ts-nocheck\n`;

  for (const token of localTokens) {
    text += `export var `;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.generatedOffsets.push(text.length);
    mapping.lengths.push(token.name.length);
    text += `${token.name}: string;\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'import') {
      text += `export * from `;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      text += `'${tokenImporter.from}';\n`;
    } else {
      text += `export {\n`;
      // eslint-disable-next-line no-loop-func
      tokenImporter.values.forEach((value) => {
        const localName = value.localName ?? value.name;
        const localLoc = value.localLoc ?? value.loc;
        text += `  `;
        if ('localName' in value) {
          mapping.sourceOffsets.push(value.loc.start.offset);
          mapping.lengths.push(value.name.length);
          mapping.generatedOffsets.push(text.length);
          linkedCodeMapping.generatedOffsets.push(text.length);
          linkedCodeMapping.generatedLengths.push(value.name.length);
          text += `${value.name} as `;
          mapping.sourceOffsets.push(localLoc.start.offset);
          mapping.lengths.push(localName.length);
          mapping.generatedOffsets.push(text.length);
          linkedCodeMapping.sourceOffsets.push(text.length);
          linkedCodeMapping.lengths.push(localName.length);
          text += `${localName},\n`;
        } else {
          mapping.sourceOffsets.push(value.loc.start.offset);
          mapping.lengths.push(value.name.length);
          mapping.generatedOffsets.push(text.length);
          text += `${value.name},\n`;
        }
      });
      text += `} from `;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      text += `'${tokenImporter.from}';\n`;
    }
  }
  return { text, mapping, linkedCodeMapping };
}

/**
 * Create a d.ts file with a default export.
 * @example
 * If the CSS module file is:
 * ```css
 * @import './a.module.css';
 * @value local1: string;
 * @value imported1, imported2 as aliasedImported2 from './b.module.css';
 * .local2 { color: red }
 * ```
 * The d.ts file would be:
 * ```ts
 * // @ts-nocheck
 * const styles = {
 *   local1: '' as readonly string,
 *   local2: '' as readonly string,
 *   ...(await import('./a.module.css')).default,
 *   imported1: (await import('./b.module.css')).default.imported1,
 *   aliasedImported2: (await import('./b.module.css')).default.imported2,
 * };
 * export default styles;
 * ```
 */
function createDefaultExportDts(
  localTokens: Token[],
  tokenImporters: TokenImporter[],
): { text: string; mapping: CodeMapping; linkedCodeMapping: LinkedCodeMapping } {
  const mapping: CodeMapping = { sourceOffsets: [], lengths: [], generatedOffsets: [] };
  const linkedCodeMapping: LinkedCodeMapping = {
    sourceOffsets: [],
    lengths: [],
    generatedOffsets: [],
    generatedLengths: [],
  };

  // MEMO: Depending on the TypeScript compilation options, the generated type definition file contains compile errors.
  // For example, it contains `Top-level 'await' expressions are only allowed when the 'module' option is set to ...` error.
  //
  // If `--skipLibCheck` is false, those errors will be reported by `tsc`. However, these are negligible errors.
  // Therefore, `@ts-nocheck` is added to the generated type definition file.
  let text = `// @ts-nocheck\ndeclare const ${STYLES_EXPORT_NAME} = {\n`;

  for (const token of localTokens) {
    text += `  `;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.generatedOffsets.push(text.length);
    mapping.lengths.push(token.name.length);
    text += `${token.name}: '' as readonly string,\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'import') {
      text += `  ...(await import(`;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      text += `'${tokenImporter.from}')).default,\n`;
    } else {
      // eslint-disable-next-line no-loop-func
      tokenImporter.values.forEach((value, i) => {
        const localName = value.localName ?? value.name;
        const localLoc = value.localLoc ?? value.loc;

        text += `  `;
        mapping.sourceOffsets.push(localLoc.start.offset);
        mapping.lengths.push(localName.length);
        mapping.generatedOffsets.push(text.length);
        linkedCodeMapping.sourceOffsets.push(text.length);
        linkedCodeMapping.lengths.push(localName.length);
        text += `${localName}: (await import(`;
        if (i === 0) {
          mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
          mapping.lengths.push(tokenImporter.from.length + 2);
          mapping.generatedOffsets.push(text.length);
        }
        text += `'${tokenImporter.from}')).default.`;
        mapping.sourceOffsets.push(value.loc.start.offset);
        mapping.lengths.push(value.name.length);
        mapping.generatedOffsets.push(text.length);
        linkedCodeMapping.generatedOffsets.push(text.length);
        linkedCodeMapping.generatedLengths.push(value.name.length);
        text += `${value.name},\n`;
      });
    }
  }
  text += `};\nexport default ${STYLES_EXPORT_NAME};\n`;
  return { text, mapping, linkedCodeMapping };
}
