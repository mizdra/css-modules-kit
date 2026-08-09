import { SpanMapFeature, SpanMapKind } from '../protocol.js';
import type { TransformOutput } from '../transformer.js';

interface Marker {
  label: string;
  offset: number;
  length: number;
}

interface PositionedMarker extends Marker {
  line: number;
  column: number;
}

const KIND_NAMES: Record<SpanMapKind, string> = {
  [SpanMapKind.Verbatim]: 'Verbatim',
  [SpanMapKind.Atom]: 'Atom',
  [SpanMapKind.Alias]: 'Alias',
};

function formatFeatures(features: number | undefined): string {
  if (features === undefined) return '';
  const flags = Object.entries(SpanMapFeature).filter(([name]) => name !== 'All');
  const included = flags.filter(([, bit]) => (features & bit) !== 0).map(([name]) => name);
  const excluded = flags.filter(([, bit]) => (features & bit) === 0).map(([name]) => name);
  if (excluded.length === 0) return '(All)';
  if (excluded.length < included.length) return `(All~${excluded.join('~')})`;
  return `(${included.join('|')})`;
}

function renderMarkerLine(marker: PositionedMarker): string {
  const indent = ' '.repeat(marker.column);
  const carets = marker.length === 0 ? '¦' : '^'.repeat(marker.length);
  return `${indent}${carets} ${marker.label}`;
}

function offsetToPosition(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart };
}

function renderTextWithMarkers(text: string, markers: Marker[]): string {
  const positioned: PositionedMarker[] = markers.map((m) => {
    const { line, column } = offsetToPosition(text, m.offset);
    return { ...m, line, column };
  });

  const markersByLine = Map.groupBy(positioned, (m) => m.line);

  const result: string[] = [];
  const lines = text.split('\n');
  for (const [i, line] of lines.entries()) {
    result.push(line);
    const lineMarkers = (markersByLine.get(i + 1) ?? []).toSorted((a, b) => b.column - a.column);
    for (const marker of lineMarkers) {
      result.push(renderMarkerLine(marker));
    }
  }
  return result.join('\n');
}

export function renderTransformOutput(source: string, output: TransformOutput): string {
  const sourceMarkers: Marker[] = [
    ...output.mappings.map((mapping, i) => ({ label: `#${i}`, offset: mapping[2], length: mapping[3] })),
    ...output.diagnostics.map((diagnostic, i) => ({
      label: `diag#${i}`,
      offset: diagnostic.start,
      length: diagnostic.length,
    })),
  ];
  const generatedMarkers: Marker[] = output.mappings.map((mapping, i) => ({
    label: `#${i} ${KIND_NAMES[mapping[4]]}${formatFeatures(mapping[5])}`,
    offset: mapping[0],
    length: mapping[1],
  }));
  let result = `=== source ===\n${renderTextWithMarkers(source, sourceMarkers)}\n\n=== generated ===\n${renderTextWithMarkers(output.text, generatedMarkers)}`;
  if (output.diagnostics.length > 0) {
    result += `\n\n=== diagnostics ===\n${output.diagnostics.map((d, i) => `diag#${i}: ${d.messageText}`).join('\n')}`;
  }
  return result;
}
