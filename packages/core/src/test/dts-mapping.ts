import type { GenerateDtsResult } from '../dts-generator.js';

interface Marker {
  name: string;
  offset: number;
  length: number;
  index: number;
}

interface PositionedMarker extends Marker {
  line: number;
  column: number;
}

function renderMarkerLine(marker: PositionedMarker): string {
  const indent = ' '.repeat(marker.column);
  const carets = '^'.repeat(marker.length);
  const label = `${marker.name}[${marker.index}]`;
  return `${indent}${carets} ${label}`;
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

function createMarkers(name: string, offsets: number[], lengths: number[]): Marker[] {
  return offsets.map((offset, i) => ({ name, offset, length: lengths[i]!, index: i }));
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
    const markers = (markersByLine.get(i + 1) ?? []).toSorted((a, b) => b.column - a.column);
    for (const marker of markers) {
      result.push(renderMarkerLine(marker));
    }
  }
  return result.join('\n');
}

export function renderDtsResult(source: string, { text, mapping, linkedCodeMapping }: GenerateDtsResult): string {
  const sourceMarkers = createMarkers('mapping', mapping.sourceOffsets, mapping.lengths);
  const generatedMarkers = [
    ...createMarkers('mapping', mapping.generatedOffsets, mapping.generatedLengths ?? mapping.lengths),
    ...createMarkers('linkedCodeMapping', linkedCodeMapping.sourceOffsets, linkedCodeMapping.lengths),
    ...createMarkers('linkedCodeMapping', linkedCodeMapping.generatedOffsets, linkedCodeMapping.generatedLengths),
  ];
  const renderedSource = renderTextWithMarkers(source, sourceMarkers);
  const renderedGenerated = renderTextWithMarkers(text, generatedMarkers);
  return `=== source ===\n${renderedSource}\n\n=== generated ===\n${renderedGenerated}`;
}
