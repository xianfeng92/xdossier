export type AsciiDiagramNode = {
  label: string;
  lines: string[];
};

export type AsciiDiagramEdge = {
  from: number;
  to: number;
  label?: string;
};

export type AsciiDiagram = {
  nodes: AsciiDiagramNode[];
  edges: AsciiDiagramEdge[];
};

type BoxMatch = {
  start: number;
  end: number;
  labelLines: string[];
};

export function parseAsciiDiagram(text: string): AsciiDiagram | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd());
  const framedStack = parseFramedStack(lines);
  if (framedStack) return framedStack;

  const boxes: BoxMatch[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (!isBoxTop(line)) {
      if (boxes.length === 0 || !isConnectorLine(line)) return null;
      index += 1;
      continue;
    }

    const boxStart = index;
    const labelLines: string[] = [];
    index += 1;
    while (index < lines.length && !isBoxBottom(lines[index] ?? "")) {
      const content = parseBoxContent(lines[index] ?? "");
      if (content === null) return null;
      if (content.trim()) labelLines.push(content.trim());
      index += 1;
    }
    if (index >= lines.length || !isBoxBottom(lines[index] ?? "")) return null;
    if (labelLines.length === 0) return null;
    boxes.push({ start: boxStart, end: index, labelLines });
    index += 1;
  }

  if (boxes.length < 2) return null;

  const edges: AsciiDiagramEdge[] = [];
  for (let boxIndex = 0; boxIndex < boxes.length - 1; boxIndex += 1) {
    const between = lines.slice(boxes[boxIndex].end + 1, boxes[boxIndex + 1].start);
    if (!between.length || !between.some((line) => /[↓↑]/.test(line))) return null;
    if (!between.every((line) => !line.trim() || isConnectorLine(line))) return null;
    edges.push({ from: boxIndex, to: boxIndex + 1 });
  }

  return {
    nodes: boxes.map((box) => ({
      label: box.labelLines.join(" "),
      lines: box.labelLines,
    })),
    edges,
  };
}

function parseFramedStack(lines: string[]): AsciiDiagram | null {
  const first = lines.findIndex((line) => line.trim());
  const last = findLastNonEmptyLine(lines);
  if (first < 0 || last < 0 || first >= last) return null;
  if (!isBoxTop(lines[first] ?? "") || !isBoxBottom(lines[last] ?? "")) return null;

  const segments: string[][] = [[]];
  for (const line of lines.slice(first + 1, last)) {
    if (isBoxSeparator(line)) {
      segments.push([]);
      continue;
    }
    if (/[┌└┐┘]/.test(line)) return null;
    const content = parseBoxContent(line);
    if (content === null) return null;
    segments[segments.length - 1]?.push(content);
  }

  const normalizedSegments = segments
    .map((segment) => segment.map((line) => line.trim()).filter(Boolean))
    .filter((segment) => segment.length > 0);
  if (normalizedSegments.length < 2) return null;
  if (!normalizedSegments.slice(0, -1).every((segment) => segment.some((line) => /[↓↑]/.test(line)))) {
    return null;
  }

  const nodes = normalizedSegments.map((segment) => {
    const labelLine = segment.find((line) => !isConnectorLabel(line) && !line.startsWith("•"));
    if (!labelLine) return null;
    return {
      label: labelLine,
      lines: [labelLine],
    };
  });
  if (nodes.some((node) => node === null)) return null;

  return {
    nodes: nodes as AsciiDiagramNode[],
    edges: normalizedSegments.slice(0, -1).map((_segment, index) => ({
      from: index,
      to: index + 1,
    })),
  };
}

function isBoxTop(line: string): boolean {
  const trimmed = line.trim();
  return /^┌─+┐$/.test(trimmed) || /^\+-+\+$/.test(trimmed);
}

function isBoxBottom(line: string): boolean {
  const trimmed = line.trim();
  return /^└─+┘$/.test(trimmed) || /^\+-+\+$/.test(trimmed);
}

function isBoxSeparator(line: string): boolean {
  return /^├─+┤$/.test(line.trim());
}

function parseBoxContent(line: string): string | null {
  const trimmed = line.trim();
  const boxDrawing = trimmed.match(/^│(.*)│$/);
  if (boxDrawing) return boxDrawing[1] ?? "";
  const ascii = trimmed.match(/^\|(.*)\|$/);
  if (ascii) return ascii[1] ?? "";
  return null;
}

function isConnectorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return /^[\s↓↑←→|\-+─│]*$/.test(line) && /[↓↑←→]/.test(line);
}

function isConnectorLabel(line: string): boolean {
  return /^[\s↓↑←→|\-+─│]*$/.test(line) && /[↓↑←→]/.test(line);
}

function findLastNonEmptyLine(lines: string[]): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if ((lines[index] ?? "").trim()) return index;
  }
  return -1;
}
