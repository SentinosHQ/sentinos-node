import { KernelClient } from "./kernel.js";
import type { SentinosClient } from "../client.js";
import type {
  DecisionTrace,
  TraceExportJob,
  TraceArtifactLineageResponse,
  TraceLedgerVerification,
  TracePrivacyPolicy,
  TracePrivacyScanResult,
  TraceReplayExportResponse,
  TraceReplayMatrixResponse,
  TraceReplayResponse,
  TraceRetentionEnforcementRun,
  TraceRetentionPolicy,
  TraceSearchResult,
} from "../types.js";

type TraceScope = { tenantId?: string; orgId?: string };

type TraceSearchParams = {
  agent_id?: string;
  session_id?: string;
  policy_id?: string;
  decision?: string;
  data_class?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
} & TraceScope;

type TraceExportRequest = {
  agent_id?: string;
  policy_id?: string;
  decision?: string;
  data_class?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";
  from?: string;
  to?: string;
  limit?: number;
} & TraceScope;

export class TracesClient extends KernelClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, tenantId);
  }

  async getTrace(traceId: string): Promise<DecisionTrace> {
    return super.getTrace(traceId);
  }

  async listTraces(params: TraceSearchParams = {}): Promise<TraceSearchResult> {
    return super.traceSearch(params);
  }

  async verifyTrace(traceId: string): Promise<Record<string, unknown>> {
    return super.verifyTrace(traceId);
  }

  async ledgerVerify(traceId: string): Promise<TraceLedgerVerification> {
    return super.getTraceLedger(traceId);
  }

  async replayTrace(
    traceId: string,
    body?: {
      profile?: string;
      policy_keys?: string[];
      include_explain?: boolean;
      include_evidence_hints?: boolean;
      environment_assumptions?: Record<string, unknown>;
    } & TraceScope
  ): Promise<TraceReplayResponse> {
    return super.replayTrace(traceId, body);
  }

  async replayTraceMatrix(
    traceId: string,
    body?: {
      include_explain?: boolean;
      environment_assumptions?: Record<string, unknown>;
    } & TraceScope,
  ): Promise<TraceReplayMatrixResponse> {
    return super.replayTraceMatrix(traceId, body);
  }

  async exportReplayEvidence(
    traceId: string,
    body?: {
      profile?: string;
      policy_keys?: string[];
      include_explain?: boolean;
      include_evidence_hints?: boolean;
      environment_assumptions?: Record<string, unknown>;
    } & TraceScope,
  ): Promise<TraceReplayExportResponse> {
    return super.exportReplayEvidence(traceId, body);
  }

  async getTraceLineage(traceId: string, scope?: TraceScope): Promise<TraceArtifactLineageResponse> {
    return super.getTraceLineage(traceId, scope);
  }

  async getRetentionPolicy(scope?: TraceScope): Promise<TraceRetentionPolicy> {
    return super.getTraceRetentionPolicy(scope);
  }

  async updateRetentionPolicy(
    body: { trace_days?: number; export_days?: number; ledger_days?: number } & TraceScope
  ): Promise<TraceRetentionPolicy> {
    return super.updateTraceRetentionPolicy(body);
  }

  async getPrivacyPolicy(scope?: TraceScope): Promise<TracePrivacyPolicy> {
    return super.getTracePrivacyPolicy(scope);
  }

  async updatePrivacyPolicy(
    body: Record<string, unknown> & TraceScope,
  ): Promise<TracePrivacyPolicy> {
    return super.updateTracePrivacyPolicy(body);
  }

  async scanPrivacyPayload(
    body: Record<string, unknown> & TraceScope,
  ): Promise<TracePrivacyScanResult> {
    return super.scanTracePrivacyPayload(body);
  }

  async enforceRetention(
    request: { dry_run?: boolean } & TraceScope = {}
  ): Promise<TraceRetentionEnforcementRun> {
    return super.enforceTraceRetention(Boolean(request.dry_run), request);
  }

  async distributedTraceSummaries(
    limit = 50,
    scope?: TraceScope
  ): Promise<{ traces: Array<Record<string, unknown>> }> {
    return super.listDistributedTraceSummaries(limit, scope);
  }

  async exportTraces(request: TraceExportRequest): Promise<TraceExportJob> {
    return super.createTraceExportJob(request);
  }

  async getExportJob(jobId: string, scope?: TraceScope): Promise<TraceExportJob> {
    return super.getTraceExportJob(jobId, scope);
  }
}
