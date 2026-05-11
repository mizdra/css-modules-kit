import { basename } from './path.js';
import type { CSSModule, Token, TokenImporter, TokenReference } from './type.js';
import type { ValidateTokenNameOptions } from './util.js';
import { isURLSpecifier, validateTokenName } from './util.js';

export const STYLES_EXPORT_NAME = 'styles';

export interface GenerateDtsOptions {
  namedExports: boolean;
  prioritizeNamedImports: boolean;
  /** Generate .d.ts for ts-plugin */
  forTsPlugin: boolean;
}

interface CodeMapping {
  /** The source offsets of the tokens in the *.module.css file. */
  sourceOffsets: number[];
  /** The lengths of the tokens in the *.module.css file. */
  lengths: number[];
  /** The generated offsets of the tokens in the *.d.ts file. */
  generatedOffsets: number[];
  /** The lengths of the tokens in the *.d.ts file. If not provided, it is assumed to be the same as `lengths`. */
  generatedLengths?: number[];
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

export interface GenerateDtsResult {
  text: string;
  mapping: CodeMapping;
  linkedCodeMapping: LinkedCodeMapping;
}

/**
 * Generate .d.ts from `CSSModule`.
 */
export function generateDts(cssModule: CSSModule, options: GenerateDtsOptions): GenerateDtsResult {
  // Exclude invalid tokens
  const localTokens = cssModule.localTokens.filter((token) => isValidTokenName(token.name, options));
  const tokenReferences = cssModule.tokenReferences.filter((ref) => isValidTokenName(ref.name, options));
  const tokenImporters = cssModule.tokenImporters
    // Exclude invalid imported tokens
    .map((tokenImporter) => {
      if (tokenImporter.type === 'named') {
        return {
          ...tokenImporter,
          entries: tokenImporter.entries.filter(
            (entry) =>
              isValidTokenName(entry.name, options) &&
              (entry.localName === undefined || isValidTokenName(entry.localName, options)),
          ),
        };
      } else {
        return tokenImporter;
      }
    })
    .filter((tokenImporter) => {
      /**
       * In principle, token importers with specifiers that cannot be resolved are still included in the type
       * definitions. For example, consider the following:
       *
       * ```css
       * // src/a.module.css
       * @import './unresolved.module.css';
       * @import './unmatched.css';
       * .a_1 { color: red; }
       * ```
       *
       * In this case, CSS Modules Kit generates the following type definitions:
       *
       * ```ts
       * // generated/src/a.module.css.d.ts
       * // @ts-nocheck
       * declare const styles = {
       *   a_1: '' as string,
       *   ...(await import('./unresolved.module.css')).default,
       *   ...(await import('./unmatched.css')).default,
       * } as const;
       * ```
       *
       * Even if `./unresolved.module.css` or `./unmatched.css` does not exist, the same type definitions are
       * generated. It is important that the generated type definitions do not change depending on whether the
       * files exist. This provides the following benefits:
       *
       * - Simplifies the watch mode implementation
       *   - Only the type definitions for changed files need to be regenerated
       * - Makes it easier to parallelize code generation
       *   - Type definitions can be generated independently per file
       *
       * However, as an exception, URL specifiers are not included in the type definitions, because URL
       * specifiers are typically resolved at runtime.
       */
      return !isURLSpecifier(tokenImporter.from);
    });

  if (options.namedExports) {
    return generateNamedExportsDts(cssModule.fileName, localTokens, tokenImporters, tokenReferences, options);
  } else {
    return generateDefaultExportDts(localTokens, tokenImporters, tokenReferences, options);
  }
}

/** Generate a d.ts file with named exports. */
function generateNamedExportsDts(
  fileName: string,
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  tokenReferences: TokenReference[],
  options: GenerateDtsOptions,
): { text: string; mapping: CodeMapping; linkedCodeMapping: LinkedCodeMapping } {
  const mapping: Required<CodeMapping> = {
    sourceOffsets: [],
    lengths: [],
    generatedOffsets: [],
    generatedLengths: [],
  };
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

  const groupedLocalTokens = Object.groupBy(localTokens, (token) => token.name);
  for (const [index, [name, tokens]] of Object.entries(groupedLocalTokens).entries()) {
    if (tokens === undefined || tokens.length === 0) continue;
    const internalName = `_token_${index}`;
    for (const token of tokens) {
      text += `var `;
      mapping.sourceOffsets.push(token.loc.start.offset);
      mapping.lengths.push(name.length);
      mapping.generatedOffsets.push(text.length);
      mapping.generatedLengths.push(internalName.length);
      text += `${internalName}: string;\n`;
    }
    text += `export { `;
    linkedCodeMapping.sourceOffsets.push(text.length);
    linkedCodeMapping.lengths.push(internalName.length);
    text += `${internalName} as `;
    linkedCodeMapping.generatedOffsets.push(text.length);
    linkedCodeMapping.generatedLengths.push(name.length + 2);
    text += `'${name}' };\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all') {
      text += `export * from `;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      mapping.generatedLengths.push(tokenImporter.from.length + 2);
      text += `'${tokenImporter.from}';\n`;
    } else {
      text += `export {\n`;
      for (const entry of tokenImporter.entries) {
        const localName = entry.localName ?? entry.name;
        const localLoc = entry.localLoc ?? entry.loc;
        text += `  `;
        linkedCodeMapping.sourceOffsets.push(text.length);
        linkedCodeMapping.lengths.push(entry.name.length + 2);
        text += `'`;
        if ('localName' in entry) {
          mapping.sourceOffsets.push(entry.loc.start.offset);
          mapping.lengths.push(entry.name.length);
          mapping.generatedOffsets.push(text.length);
          mapping.generatedLengths.push(entry.name.length);
        }
        text += `${entry.name}' as `;
        linkedCodeMapping.generatedOffsets.push(text.length);
        linkedCodeMapping.generatedLengths.push(localName.length + 2);
        text += `'`;
        mapping.sourceOffsets.push(localLoc.start.offset);
        mapping.lengths.push(localName.length);
        mapping.generatedOffsets.push(text.length);
        mapping.generatedLengths.push(localName.length);
        text += `${localName}',\n`;
      }
      text += `} from `;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      mapping.generatedLengths.push(tokenImporter.from.length + 2);
      text += `'${tokenImporter.from}';\n`;
    }
  }

  // Ensure the generated file is treated as a module even when no other
  // top-level export/import is emitted (e.g. an empty CSS Module file).
  const noModuleSyntax = localTokens.length === 0 && tokenImporters.length === 0;
  if (noModuleSyntax) {
    text += 'export {};\n';
  }

  if (options.forTsPlugin && tokenReferences.length > 0) {
    text += `declare const __self: typeof import('./${basename(fileName)}');\n`;
    for (const ref of tokenReferences) {
      text += `__self['`;
      mapping.sourceOffsets.push(ref.loc.start.offset);
      mapping.lengths.push(ref.name.length);
      mapping.generatedOffsets.push(text.length);
      mapping.generatedLengths.push(ref.name.length);
      text += `${ref.name}'];\n`;
    }
  }
  if (options.forTsPlugin && !options.prioritizeNamedImports) {
    // Export `styles` to appear in code completion suggestions
    text += 'declare const styles: {};\nexport default styles;\n';
  }
  return { text, mapping, linkedCodeMapping };
}

/** Generate a d.ts file with a default export. */
function generateDefaultExportDts(
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  tokenReferences: TokenReference[],
  options: GenerateDtsOptions,
): {
  text: string;
  mapping: CodeMapping;
  linkedCodeMapping: LinkedCodeMapping;
} {
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

  // This is a workaround to avoid the issue described as a "Drawbacks" in https://github.com/mizdra/css-modules-kit/pull/302.
  // It uses the technique from https://stackoverflow.com/a/55541672 to fall back from `any` to `{}`.
  // However, the import type for an unresolvable specifier becomes a special `any` type called `errorType`.
  // The technique from https://stackoverflow.com/a/55541672 does not work with `errorType`.
  // Therefore, this combines it with the approach from https://github.com/microsoft/TypeScript/issues/62972.
  if (tokenImporters.some((importer) => importer.type === 'all')) {
    text += `function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;\n`;
  }

  text += `declare const ${STYLES_EXPORT_NAME} = {\n`;
  for (const token of localTokens) {
    text += `  '`;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.lengths.push(token.name.length);
    mapping.generatedOffsets.push(text.length);
    text += `${token.name}': '' as string,\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all') {
      text += `  ...blockErrorType((await import(`;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      text += `'${tokenImporter.from}')).default),\n`;
    } else {
      // oxlint-disable-next-line no-loop-func
      tokenImporter.entries.forEach((entry, i) => {
        const localName = entry.localName ?? entry.name;
        const localLoc = entry.localLoc ?? entry.loc;

        text += `  '`;
        mapping.sourceOffsets.push(localLoc.start.offset);
        mapping.lengths.push(localName.length);
        mapping.generatedOffsets.push(text.length);
        linkedCodeMapping.sourceOffsets.push(text.length - 1);
        linkedCodeMapping.lengths.push(localName.length + 2);
        text += `${localName}': (await import(`;
        if (i === 0) {
          mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
          mapping.lengths.push(tokenImporter.from.length + 2);
          mapping.generatedOffsets.push(text.length);
        }
        text += `'${tokenImporter.from}')).default['`;
        if ('localName' in entry) {
          mapping.sourceOffsets.push(entry.loc.start.offset);
          mapping.lengths.push(entry.name.length);
          mapping.generatedOffsets.push(text.length);
        }
        linkedCodeMapping.generatedOffsets.push(text.length - 1);
        linkedCodeMapping.generatedLengths.push(entry.name.length + 2);
        text += `${entry.name}'],\n`;
      });
    }
  }
  text += `} as const;\n`;

  if (options.forTsPlugin) {
    for (const ref of tokenReferences) {
      text += `${STYLES_EXPORT_NAME}['`;
      mapping.sourceOffsets.push(ref.loc.start.offset);
      mapping.lengths.push(ref.name.length);
      mapping.generatedOffsets.push(text.length);
      text += `${ref.name}'];\n`;
    }
  }
  text += `export default ${STYLES_EXPORT_NAME};\n`;
  return { text, mapping, linkedCodeMapping };
}

function isValidTokenName(name: string, options: ValidateTokenNameOptions): boolean {
  return validateTokenName(name, options) === undefined;
}
