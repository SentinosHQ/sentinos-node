import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type ReplayClient = {
  traces: {
    replayTrace(traceId: string, body?: Record<string, unknown>): Promise<Record<string, any>>;
    replayTraceMatrix(traceId: string, body?: Record<string, unknown>): Promise<Record<string, any>>;
    exportReplayEvidence(traceId: string, body?: Record<string, unknown>): Promise<Record<string, any>>;
  };
};

type ReplayExamplePayload = {
  traceId: string;
  replayProfile?: string;
  replayDecision?: string;
  fidelity?: string;
  driftDetected?: boolean;
  matrixEntries?: number;
  replayExportJobId?: string;
  nextStep: string;
};

export async function runTraceReplayEvidenceExample(opts: {
  client?: ReplayClient;
  traceId?: string;
  output?: (payload: ReplayExamplePayload) => void;
} = {}): Promise<ReplayExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const traceId =
    opts.traceId ||
    process.env.SENTINOS_REPLAY_TRACE_ID ||
    process.env.SENTINOS_TRACE_ID;
  if (!traceId) {
    throw new Error(
      "Set SENTINOS_REPLAY_TRACE_ID or SENTINOS_TRACE_ID to a real trace id from your Sentinos workspace.",
    );
  }

  const replay = await client.traces.replayTrace(traceId, {
    profile: "original_policy_and_snapshot",
    include_explain: true,
    include_evidence_hints: true,
  });
  const matrix = await client.traces.replayTraceMatrix(traceId, {
    include_explain: true,
  });
  const exported = await client.traces.exportReplayEvidence(traceId, {
    profile: "original_policy_and_snapshot",
    include_explain: true,
    include_evidence_hints: true,
  });

  const payload = {
    traceId,
    replayProfile: String(replay.profile || ""),
    replayDecision: String(replay.replay?.decision || ""),
    fidelity: String(replay.fidelity || ""),
    driftDetected: Boolean(replay.drift_detected),
    matrixEntries: Array.isArray(matrix.entries) ? matrix.entries.length : 0,
    replayExportJobId: String(exported.export_job?.job_id || ""),
    nextStep:
      "Open Traces in the Sentinos console, run the same replay profile, and inspect the replay export job and fidelity details.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTraceReplayEvidenceExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
