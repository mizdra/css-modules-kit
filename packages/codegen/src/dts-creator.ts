import type { CSSModuleFile } from './parser/css-module-parser.js';
import type { Resolver } from './resolver.js';
import { getPosixRelativePath } from './util.js';

export interface CreateDtsOptions {
  resolver: Resolver;
  isExternalFile: (filename: string) => boolean;
}

interface Mapping {
  /** The source offsets of the tokens in the *.module.css file. */
  sourceOffsets: number[];
  /** The generated offsets of the tokens in the *.d.ts file. */
  generatedOffsets: number[];
  /** The lengths of the tokens in the *.module.css file. */
  lengths: number[];
}

interface LinkedCodeMapping extends Mapping {
  generatedLengths: number[];
}

function createMapping(): Mapping {
  return { sourceOffsets: [], generatedOffsets: [], lengths: [] };
}

function createLinkedCodeMapping(): LinkedCodeMapping {
  return { sourceOffsets: [], generatedOffsets: [], lengths: [], generatedLengths: [] };
}

/**
 * Create a d.ts file from a CSS module file.
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
 * declare const styles: Readonly<
 *   & { local1: string }
 *   & { local2: string }
 *   & (typeof import('./a.module.css'))['default']
 *   & { imported1: (typeof import('./c.module.css'))['default']['imported1'] }
 *   & { aliasedImported2: (typeof import('./d.module.css'))['default']['imported2'] }
 * >;
 * export default styles;
 * ```
 *
 * @throws {ResolveError} When the resolver throws an error.
 */
export function createDts(
  { filename, localTokens, tokenImporters: _tokenImporters }: CSSModuleFile,
  options: CreateDtsOptions,
): { code: string; mapping: Mapping; linkedCodeMapping: LinkedCodeMapping } {
  // Resolve and filter external files
  const tokenImporters: CSSModuleFile['tokenImporters'] = [];
  for (const tokenImporter of _tokenImporters) {
    const resolved = options.resolver(tokenImporter.from, { request: filename });
    if (resolved !== undefined && !options.isExternalFile(resolved)) {
      tokenImporters.push({ ...tokenImporter, from: resolved });
    }
  }
  const mapping = createMapping();
  const linkedCodeMapping = createLinkedCodeMapping();

  // If the CSS module file has no tokens, return an .d.ts file with an empty object.
  if (localTokens.length === 0 && tokenImporters.length === 0) {
    return {
      code: `declare const styles = {};\nexport default styles;\n`,
      mapping,
      linkedCodeMapping,
    };
  }

  let code = 'declare const styles = {\n';
  for (const token of localTokens) {
    code += `  `;
    mapping.sourceOffsets.push(token.loc.start.offset);
    mapping.generatedOffsets.push(code.length);
    mapping.lengths.push(token.name.length);
    code += `${token.name}: '' as readonly string,\n`;
  }
  for (const tokenImporter of tokenImporters) {
    const specifier = getPosixRelativePath(filename, tokenImporter.from);
    if (tokenImporter.type === 'import') {
      code += `  ...(await import('${specifier}')).default,\n`;
    } else {
      if (tokenImporter.localName === undefined || tokenImporter.localLoc === undefined) {
        code += `  `;
        mapping.sourceOffsets.push(tokenImporter.loc.start.offset);
        mapping.generatedOffsets.push(code.length);
        mapping.lengths.push(tokenImporter.name.length);
        code += `${tokenImporter.name}: (await import('${specifier}')).default.${tokenImporter.name},\n`;
      } else {
        code += `  `;

        mapping.sourceOffsets.push(tokenImporter.localLoc.start.offset);
        mapping.generatedOffsets.push(code.length);
        mapping.lengths.push(tokenImporter.localName.length);
        linkedCodeMapping.generatedOffsets.push(code.length);
        linkedCodeMapping.generatedLengths.push(tokenImporter.localName.length);

        code += `${tokenImporter.localName}: (await import('${specifier}')).default.`;

        mapping.sourceOffsets.push(tokenImporter.loc.start.offset);
        mapping.generatedOffsets.push(code.length);
        mapping.lengths.push(tokenImporter.name.length);
        linkedCodeMapping.sourceOffsets.push(code.length);
        linkedCodeMapping.lengths.push(tokenImporter.name.length);

        code += `${tokenImporter.name},\n`;
      }
    }
  }
  code += '};\nexport default styles;\n';
  return { code, mapping, linkedCodeMapping };
}
