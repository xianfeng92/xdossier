import type { CoverArtifact, CoverEdge } from "./types.js";

export function buildCoverEdges(artifacts: CoverArtifact[]): CoverEdge[] {
  const byPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  const edges = new Map<string, CoverEdge>();

  for (const artifact of [...artifacts].sort((a, b) => a.path.localeCompare(b.path))) {
    for (const target of artifact.implements) {
      const targetArtifact = byPath.get(target);
      if (!targetArtifact) continue;
      addEdge(edges, {
        from: artifact.path,
        to: target,
        relation: "implements",
        source: "frontmatter",
        confidence: "high",
        label: `${artifact.title} implements ${targetArtifact.title}`,
        evidence: `frontmatter implements includes ${target}`,
      });
    }

    for (const target of artifact.reviews_target) {
      const targetArtifact = byPath.get(target);
      if (!targetArtifact) continue;
      addEdge(edges, {
        from: artifact.path,
        to: target,
        relation: "reviews",
        source: "frontmatter",
        confidence: "high",
        label: `${artifact.title} reviews ${targetArtifact.title}`,
        evidence: `frontmatter reviews_target includes ${target}`,
      });
    }

    for (const reviewPath of artifact.reviews) {
      const reviewArtifact = byPath.get(reviewPath);
      if (!reviewArtifact) continue;
      addEdge(edges, {
        from: reviewPath,
        to: artifact.path,
        relation: "reviews",
        source: "frontmatter",
        confidence: "high",
        label: `${reviewArtifact.title} reviews ${artifact.title}`,
        evidence: `frontmatter reviews includes ${reviewPath}`,
      });
    }
  }

  return [...edges.values()].sort((a, b) => {
    const relationCompare = a.relation.localeCompare(b.relation);
    if (relationCompare !== 0) return relationCompare;
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;
    return a.to.localeCompare(b.to);
  });
}

function addEdge(edges: Map<string, CoverEdge>, edge: CoverEdge): void {
  const key = `${edge.from}\u0000${edge.relation}\u0000${edge.to}`;
  if (!edges.has(key)) edges.set(key, edge);
}
