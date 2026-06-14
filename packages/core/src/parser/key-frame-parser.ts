import type { Atrule, Raw } from 'css-tree';
import type { DiagnosticWithDetachedLocation, Location } from '../type.js';
import { toLocation } from './csstree.js';

interface KeyframeDeclaration {
  name: string;
  loc: Location;
  /**
   * The location of the declaration of the keyframe in the source file.
   * @example `@keyframes fadeIn { ... }` has `declarationLoc` as the entire at-rule location.
   */
  declarationLoc: Location;
}

interface ParseAtKeyframesResult {
  keyframe?: KeyframeDeclaration;
  diagnostics: DiagnosticWithDetachedLocation[];
}

/**
 * Parse the `@keyframes` rule to extract keyframe name.
 *
 * CSS Modules treat keyframes as local tokens by default, similar to class names.
 * This parser extracts the keyframe name and its location for type generation.
 */
export function parseAtKeyframes(atKeyframes: Atrule): ParseAtKeyframesResult {
  const prelude = atKeyframes.prelude;
  // Ignore empty keyframe names.
  if (prelude === null) return { diagnostics: [] };

  const declarationLoc = toLocation(atKeyframes.loc!);

  // css-tree leaves `:local(...)`/`:global(...)` wrappers unparsed as a `Raw` prelude.
  if (prelude.type === 'Raw') {
    return parseWrappedName(prelude);
  }

  const nameNode = prelude.children.first;
  if (nameNode === null || nameNode.type !== 'Identifier') return { diagnostics: [] };
  return {
    keyframe: { name: nameNode.name, loc: toLocation(nameNode.loc!), declarationLoc },
    diagnostics: [],
  };
}

function parseWrappedName(prelude: Raw): ParseAtKeyframesResult {
  const name = prelude.value;
  const loc = prelude.loc!;
  if (name.startsWith(':local(') && name.endsWith(')')) {
    // For simplicity of implementation, css-modules-kit does not support `:local(...)`.
    return {
      diagnostics: [
        {
          category: 'error',
          start: { line: loc.start.line, column: loc.start.column },
          length: name.length,
          text: `css-modules-kit does not support \`:local()\` wrapper for keyframes. Use \`@keyframes ${name} {...}\` instead.`,
        },
      ],
    };
  }
  // Ignore keyframes wrapped in `:global()` and any other unparsed prelude.
  return { diagnostics: [] };
}
