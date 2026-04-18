import type { CodeInformation, Mapping } from '@volar/language-core';
import { SourceMap } from '@volar/language-core';

export class CustomSourceMap extends SourceMap<CodeInformation> {
  override *toSourceRange(
    start: number,
    end: number,
    fallbackToAnyMatch: boolean,
    filter?: (data: CodeInformation) => boolean,
  ): Generator<[number, number, Mapping<CodeInformation>, Mapping<CodeInformation>]> {
    let matched = false;
    for (const result of super.toSourceRange(start, end, fallbackToAnyMatch, filter)) {
      matched = true;
      yield result;
    }
    if (matched) return;

    // When a single-quote-wrapped range (e.g. `'a_1'` in the generated .d.ts) is passed,
    // the mapping registers only the inner token name without the quotes, so the direct
    // lookup fails. Retry with the range stripped of its outer characters to recover the
    // inner token name's source range.
    if (end - start >= 2) {
      yield* super.toSourceRange(start + 1, end - 1, fallbackToAnyMatch, filter);
    }
  }
}
