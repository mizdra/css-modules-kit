import type { CSSModule, Token, TokenImporter } from './type.js';
import { isURLSpecifier, isValidAsJSIdentifier } from './util.js';

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
  /** The lengths of the tokens in the *.d.ts file. */
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

interface GenerateDtsResult {
  text: string;
  mapping: CodeMapping;
  linkedCodeMapping: LinkedCodeMapping;
}

/**
 * Generate .d.ts from `CSSModule`.
 */
export function generateDts(cssModule: CSSModule, options: GenerateDtsOptions): GenerateDtsResult {
  // Exclude invalid tokens
  const localTokens = cssModule.localTokens.filter((token) => isValidName(token.name, options));
  const tokenImporters = cssModule.tokenImporters
    // Exclude invalid imported tokens
    .map((tokenImporter) => {
      if (tokenImporter.type === 'value') {
        return {
          ...tokenImporter,
          values: tokenImporter.values.filter(
            (value) =>
              isValidName(value.name, options) &&
              (value.localName === undefined || isValidName(value.localName, options)),
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
       *   a_1: '' as readonly string,
       *   ...(await import('./unresolved.module.css')).default,
       *   ...(await import('./unmatched.css')).default,
       * };
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
    return generateNamedExportsDts(localTokens, tokenImporters, options);
  } else {
    return generateDefaultExportDts(localTokens, tokenImporters);
  }
}

/** Generate a d.ts file with named exports. */
function generateNamedExportsDts(
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  options: GenerateDtsOptions,
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
    /**
     * The mapping is created as follows:
     * a.module.css:
     * 1 | .a_1 { color: red; }
     *   |  ^ mapping.sourceOffsets[0]
     *   |
     * 2 | .a_2 { color: blue; }
     *   |  ^ mapping.sourceOffsets[1]
     *   |
     *
     * a.module.css.d.ts:
     * 1 | // @ts-nocheck
     * 2 | export var a_1: string;
     *   |            ^ mapping.generatedOffsets[0]
     *   |
     * 3 | export var a_2: string;
     *   |            ^ mapping.generatedOffsets[1]
     */

    text += `export var `;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.generatedOffsets.push(text.length);
    mapping.lengths.push(token.name.length);
    text += `${token.name}: string;\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'import') {
      /**
       * The mapping is created as follows:
       * a.module.css:
       * 1 | @import './b.module.css';
       *   |         ^ mapping.sourceOffsets[0]
       *   |
       * 2 | @import './c.module.css';
       *   |         ^ mapping.sourceOffsets[1]
       *   |
       *
       * a.module.css.d.ts:
       * 1 | // @ts-nocheck
       * 2 | export * from './b.module.css';
       *   |               ^ mapping.generatedOffsets[0]
       *   |
       * 3 | export * from './c.module.css';
       *   |               ^ mapping.generatedOffsets[1]
       *
       * NOTE: Not only the specifier but also the surrounding quotes are included in the mapping.
       */

      text += `export * from `;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      text += `'${tokenImporter.from}';\n`;
    } else {
      /**
       * The mapping is created as follows:
       * a.module.css:
       * 1 | @value b_1, b_2 from './b.module.css';
       *   |        ^    ^        ^ mapping.sourceOffsets[2]
       *   |        ^    ^ mapping.sourceOffsets[1]
       *   |        ^ mapping.sourceOffsets[0]
       *   |
       * 2 | @value c_1 as aliased_c_1 from './c.module.css';
       *   |        ^      ^                ^ mapping.sourceOffsets[5]
       *   |        ^      ^ mapping.sourceOffsets[4]
       *   |        ^ mapping.sourceOffsets[3]
       *   |
       *
       * a.module.css.d.ts:
       * 1 | // @ts-nocheck
       * 2 | export {
       * 3 |   b_1,
       *   |   ^ mapping.generatedOffsets[0]
       *   |
       * 4 |   b_2,
       *   |   ^ mapping.generatedOffsets[1]
       *   |
       * 5 | } from './b.module.css';
       *   |        ^ mapping.generatedOffsets[2]
       *   |
       * 6 | export {
       * 7 |   c_1 as aliased_c_1,
       *   |   ^      ^ mapping.generatedOffsets[4], linkedCodeMapping.sourceOffsets[0]
       *   |   ^ mapping.generatedOffsets[3], linkedCodeMapping.generatedOffsets[0]
       *   |
       * 8 | } from './c.module.css';
       *   |        ^ mapping.generatedOffsets[5]
       *
       * NOTE: Not only the specifier but also the surrounding quotes are included in the mapping.
       * NOTE: linkedCodeMapping is only generated for tokens that have a `localName` (i.e., aliased tokens).
       */

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
): { text: string; mapping: CodeMapping; linkedCodeMapping: LinkedCodeMapping } {
  const mapping: CodeMapping = { sourceOffsets: [], lengths: [], generatedOffsets: [], generatedLengths: [] };
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
  if (tokenImporters.some((importer) => importer.type === 'import')) {
    text += `function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;\n`;
  }

  text += `declare const ${STYLES_EXPORT_NAME} = {\n`;
  for (const token of localTokens) {
    /**
     * The mapping is created as follows:
     * a.module.css:
     * 1 | .a_1 { color: red; }
     *   |  ^ mapping.sourceOffsets[0]
     *   |
     * 2 | .a_2 { color: blue; }
     *   |  ^ mapping.sourceOffsets[1]
     *   |
     *
     * a.module.css.d.ts:
     * 1 | declare const styles = {
     * 2 |   a_1: '' as readonly string,
     *   |   ^ mapping.generatedOffsets[0]
     *   |
     * 3 |   a_2: '' as readonly string,
     *   |   ^ mapping.generatedOffsets[1]
     *   |
     * 4 | };
     */

    text += `  '`;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.lengths.push(token.name.length);
    mapping.generatedOffsets.push(text.length);
    mapping.generatedLengths!.push(token.name.length);
    text += `${token.name}': '' as readonly string,\n`;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'import') {
      /**
       * The mapping is created as follows:
       * a.module.css:
       * 1 | @import './b.module.css';
       *   |         ^ mapping.sourceOffsets[0]
       *   |
       * 2 | @import './c.module.css';
       *   |         ^ mapping.sourceOffsets[1]
       *   |
       *
       * a.module.css.d.ts:
       * 1 | declare const styles = {
       * 2 |   ...blockErrorType((await import('./b.module.css')).default),
       *   |                                   ^ mapping.generatedOffsets[0]
       *   |
       * 3 |   ...blockErrorType((await import('./c.module.css')).default),
       *   |                                   ^ mapping.generatedOffsets[1]
       *   |
       * 4 | };
       *
       * NOTE: Not only the specifier but also the surrounding quotes are included in the mapping.
       */

      text += `  ...blockErrorType((await import(`;
      mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
      mapping.lengths.push(tokenImporter.from.length + 2);
      mapping.generatedOffsets.push(text.length);
      mapping.generatedLengths!.push(tokenImporter.from.length + 2);
      text += `'${tokenImporter.from}')).default),\n`;
    } else {
      /**
       * The mapping is created as follows:
       * a.module.css:
       * 1 | @value b_1, b_2 from './b.module.css';
       *   |        ^    ^        ^ mapping.sourceOffsets[0]
       *   |        ^    ^ mapping.sourceOffsets[2]
       *   |        ^ mapping.sourceOffsets[1]
       *   |
       * 2 | @value c_1 as aliased_c_1 from './c.module.css';
       *   |        ^      ^                ^ mapping.sourceOffsets[4]
       *   |        ^      ^ mapping.sourceOffsets[3]
       *   |        ^ mapping.sourceOffsets[5]
       *   |
       *
       * a.module.css.d.ts:
       * 1 | declare const styles = {
       * 2 |   b_1: (await import('./b.module.css')).default.b_1,
       *   |   ^                  ^                          ^ linkedCodeMapping.generatedOffsets[0]
       *   |   ^                  ^ mapping.generatedOffsets[1]
       *   |   ^ mapping.generatedOffsets[0], linkedCodeMapping.sourceOffsets[0]
       *   |
       * 3 |   b_2: (await import('./b.module.css')).default.b_2,
       *   |   ^                                             ^ linkedCodeMapping.generatedOffsets[1]
       *   |   ^ mapping.generatedOffsets[2], linkedCodeMapping.sourceOffsets[1]
       *   |
       * 4 |   aliased_c_1: (await import('./c.module.css')).default.c_1,
       *   |   ^                          ^                          ^ mapping.generatedOffsets[5], linkedCodeMapping.generatedOffsets[2]
       *   |   ^                          ^ mapping.generatedOffsets[4]
       *   |   ^ mapping.generatedOffsets[3], linkedCodeMapping.sourceOffsets[2]
       *   |
       * 5 | };
       *
       * NOTE: Not only the specifier but also the surrounding quotes are included in the mapping.
       */

      // eslint-disable-next-line no-loop-func
      tokenImporter.values.forEach((value, i) => {
        const localName = value.localName ?? value.name;
        const localLoc = value.localLoc ?? value.loc;

        text += `  '`;
        mapping.sourceOffsets.push(localLoc.start.offset);
        mapping.lengths.push(localName.length);
        mapping.generatedOffsets.push(text.length);
        mapping.generatedLengths!.push(localName.length);
        linkedCodeMapping.sourceOffsets.push(text.length);
        linkedCodeMapping.lengths.push(localName.length);
        text += `${localName}': (await import(`;
        if (i === 0) {
          mapping.sourceOffsets.push(tokenImporter.fromLoc.start.offset - 1);
          mapping.lengths.push(tokenImporter.from.length + 2);
          mapping.generatedOffsets.push(text.length);
          mapping.generatedLengths!.push(tokenImporter.from.length + 2);
        }
        text += `'${tokenImporter.from}')).default`;
        text += `['`;
        mapping.sourceOffsets.push(value.loc.start.offset);
        mapping.lengths.push(value.name.length);
        mapping.generatedOffsets.push(text.length);
        mapping.generatedLengths!.push(value.name.length);
        linkedCodeMapping.generatedOffsets.push(text.length);
        linkedCodeMapping.generatedLengths.push(value.name.length);
        text += `${value.name}'],\n`;
      });
    }
  }
  text += `};\nexport default ${STYLES_EXPORT_NAME};\n`;
  return { text, mapping, linkedCodeMapping };
}

function isValidName(name: string, options: GenerateDtsOptions): boolean {
  if (options.namedExports && !isValidAsJSIdentifier(name)) return false;
  if (name === '__proto__') return false;
  if (options.namedExports && name === 'default') return false;
  return true;
}
