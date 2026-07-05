import type { Declaration } from 'postcss';
import type { Location } from '../type.js';

/**
 * Calculate the location of a range in the value of a declaration.
 * @param sourceIndex The index of the range in the declaration value.
 * @param length The length of the range.
 */
export function calcDeclValueLoc(decl: Declaration, sourceIndex: number, length: number): Location {
  const baseLength = decl.prop.length + decl.raws.between!.length;
  const startIndex = baseLength + sourceIndex;
  return {
    start: decl.positionBy({ index: startIndex }),
    end: decl.positionBy({ index: startIndex + length }),
  };
}

// A valid CSS identifier, including `<dashed-ident>`. Excludes `<time>` (`3s`), `<number>` (`2`),
// and other non-ident words. We don't validate `hex digits`, because it is the job of linters.
export const VALID_IDENT_RE =
  /^-?([a-zA-Z\u0080-\uFFFF_]|(\\[^\r\n\f])|-(?![0-9]))((\\[^\r\n\f])|[a-zA-Z\u0080-\uFFFF_0-9-])*$/u;
