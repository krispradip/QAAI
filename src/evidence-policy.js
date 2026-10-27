/**
 * QA evidence provenance policy.
 * The transcript-only prototype does not receive trusted audio, CRM, Genesys
 * lifecycle events, verified customer identity or an approved policy corpus.
 * These checkpoints must never be accepted as MET/MISSED merely because
 * Gemini or its independent reviewer cites a transcript line.
 *
 * Extend the provenance contract when approved source integrations are added.
 */
const SOURCE_REQUIREMENTS = Object.freeze({
  interruption: "audio overlap / turn-end timestamps",
  pace: "recorded audio or verified speech-rate analysis",
  tone: "recorded audio / prosody",
  verification: "approved verification SOP and verified customer/CRM events",
  systems: "CRM and Genesys action records",
  solution: "approved and versioned policy / knowledge evidence",
  disconnect: "Genesys disconnection and recording events",
  hold: "Genesys hold event records",
  name: "verified customer preferred name / profile"
});
export function requiredEvidence(criterionId, checkpointId) {
  if (criterionId === "deadAir" && checkpointId === "deadAir-1")
    return "audio/silence events";
  if (criterionId === "callback" && checkpointId === "callback-2")
    return "verified callback completion events";
  return SOURCE_REQUIREMENTS[criterionId] || null;
}

export function enforceEvidencePolicy(findings) {
  return findings.map(f => ({
    ...f,
    anchors: (f.anchors || []).map(a => {
      const requirement = requiredEvidence(f.id, a.id);
      if (!requirement) return a;
      // For now these sources are not present in the transcript-only AI
      // request. Even a suggested NA cannot establish missing event history.
      return {
        ...a,
        state: "UNKNOWN",
        evidence: [],
        validation: {
          status: "UNVERIFIED",
          originalState: a.state,
          finalState: "UNKNOWN",
          reason: "Requires " + requirement + "; transcript dialogue alone is insufficient"
        }
      };
    })
  }));
}
