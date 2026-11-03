import { SpanMapFeature, SpanMapKind } from 'typescript/ast';
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

function formatFeatures(features: number | undefined): string {
  if (features === undefined) return '';
  // A numeric enum also has the entries of its reverse mapping.
  const flags = Object.entries(SpanMapFeature).filter(
    (entry): entry is [string, SpanMapFeature] =>
      typeof entry[1] === 'number' && entry[1] !== SpanMapFeature.None && entry[1] !== SpanMapFeature.All,
  );
  const included = flags.filter(([, bit]) => (features & bit) !== 0).map(([name]) => name);
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

/** Renders the source and the generated text, with a marker under each span of the mappings and the diagnostics. */
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
    label: `#${i} ${SpanMapKind[mapping[4]]}${formatFeatures(mapping[5])}`,
    offset: mapping[0],
    length: mapping[1],
  }));
  let result = `=== source ===\n${renderTextWithMarkers(source, sourceMarkers)}\n\n=== generated ===\n${renderTextWithMarkers(output.text, generatedMarkers)}`;
  if (output.diagnostics.length > 0) {
    result += `\n\n=== diagnostics ===\n${output.diagnostics.map((d, i) => `diag#${i}: ${d.messageText}`).join('\n')}`;
  }
  return result;
}
