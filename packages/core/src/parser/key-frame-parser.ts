import type { AtRule } from 'postcss';
import type { DiagnosticWithDetachedLocation, Location } from '../type.js';
import { JS_IDENTIFIER_PATTERN } from '../util.js';

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
 *
 * @param atKeyframes The @keyframes at-rule to parse
 * @returns Parsed keyframe information and diagnostics
 */
export function parseAtKeyframes(atKeyframes: AtRule): ParseAtKeyframesResult {
  // Extract keyframe name from params
  // e.g., "@keyframes fadeIn { ... }" -> keyframeName = "fadeIn"
  // e.g., "@keyframes :local(slideOut) { ... }" -> keyframeName = ":local(slideOut)"
  const keyframeName = atKeyframes.params;

  // Ignore empty keyframe names
  if (keyframeName === '') {
    return { diagnostics: [] };
  }

  const keyframeNameLoc = {
    start: atKeyframes.positionBy({ index: `@keyframes${atKeyframes.raws.afterName!}`.length }),
    end: atKeyframes.positionBy({ index: `@keyframes${atKeyframes.raws.afterName!}${keyframeName}`.length }),
  };

  // Handle :local() and :global() wrappers
  if (keyframeName.startsWith(':local(') && keyframeName.endsWith(')')) {
    // For simplicity of implementation, css-modules-kit does not support `:local(...)`.
    return {
      diagnostics: [
        {
          category: 'error',
          start: keyframeNameLoc.start,
          length: keyframeName.length,
          text: `css-modules-kit does not support \`:local()\` wrapper for keyframes. Use \`@keyframes ${keyframeName} {...}\` instead.`,
        },
      ],
    };
  } else if (keyframeName.startsWith(':global(') && keyframeName.endsWith(')')) {
    // Ignore keyframes wrapped in :global()
    return { diagnostics: [] };
  }

  // Validate the keyframe name
  if (!JS_IDENTIFIER_PATTERN.test(keyframeName)) {
    return {
      diagnostics: [
        {
          start: keyframeNameLoc.start,
          length: keyframeName.length,
          text: `css-modules-kit does not support non-JavaScript identifier as keyframe names.`,
          category: 'error',
        },
      ],
    };
  }

  return {
    keyframe: {
      name: keyframeName,
      loc: keyframeNameLoc,
      declarationLoc: {
        start: atKeyframes.source!.start!,
        end: atKeyframes.positionBy({
          index: atKeyframes.toString().length,
        }),
      },
    },
    diagnostics: [],
  };
}
