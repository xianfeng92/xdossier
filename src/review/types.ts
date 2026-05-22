import type { ArtifactRef } from "../cover/types.js";

export type ReviewFindingSeverity = "P0" | "P1" | "P2" | "P3";
export type ReviewFindingStatus = "open" | "fixed" | "accepted" | "deferred" | "wontfix";

export type ReviewFinding = {
  id: string;
  severity: ReviewFindingSeverity;
  title: string;
  status: ReviewFindingStatus;
  review_artifact: string;
  href: string;
  evidence?: string;
};

export type ReviewDocumentSummary = ArtifactRef & {
  verdict: string;
  status: string;
  finding_count: number;
  open_count: number;
};

export type ReviewLoopSummary = {
  review_count: number;
  finding_count: number;
  open_count: number;
  blocker_count: number;
  fixed_count: number;
  deferred_count: number;
  reviews: ReviewDocumentSummary[];
  findings: ReviewFinding[];
};

export type ReviewPacket = {
  markdown: string;
  suggestedReviewPath: string;
};
