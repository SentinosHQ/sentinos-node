import { ServiceClient, cleanQuery, normalizeWorkforcePolicy } from "../base.js";
import type {
  AuthSessionRecord,
  AuditEvent,
  AuditNotableEvent,
  AuditNotableRule,
  AuditSavedView,
  AuthMe,
  AuthTokens,
  BillingEntitlements,
  DashboardDefinition,
  DashboardPermission,
  DashboardSavedView,
  DashboardVersion,
  Invitation,
  MemberRecord,
  Membership,
  Organization,
  OrgLoginMethods,
  Role,
  SAMLConfig,
  SCIMToken,
  ServiceAccount,
  ServiceAccountTokenIssue,
  Team,
  TeamMembership,
  TeamSettings,
  UserLoginMethodOverrideResponse,
  AuthNMapping,
  WorkforceAccessPolicy,
  WorkforceGroupMapping,
  WorkforceRolloutStatus,
  WorkforceRolloutWave,
  WorkforceSubject,
  WorkforceTokenSession,
} from "../types.js";
import type { SentinosClient } from "../client.js";

export class ControlplaneClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "controlplane", tenantId);
  }

  async registerUser(body: { email: string; password: string; display_name?: string; invitation_token?: string }) {
    return this.request<{ tokens: AuthTokens; organization: Organization; membership: Membership }>("/v1/auth/register", {
      method: "POST",
      body,
      headers: { authorization: undefined },
    });
  }

  async loginPassword(body: { email: string; password: string; org_id?: string }) {
    return this.request<{ tokens: AuthTokens }>("/v1/auth/login/password", {
      method: "POST",
      body,
      headers: { authorization: undefined },
    });
  }

  async refreshAuth(refreshToken: string) {
    return this.request<AuthTokens>("/v1/auth/token/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      headers: { authorization: undefined },
    });
  }

  async logout() {
    return this.request<{ ok: true }>("/v1/auth/logout", { method: "POST", body: {} });
  }

  async authMe(): Promise<AuthMe> {
    return this.request("/v1/auth/me");
  }

  async listAuthSessions() {
    return this.request<{ sessions: AuthSessionRecord[] }>("/v1/auth/sessions");
  }

  async revokeAuthSession(sessionId: string) {
    return this.request<{ ok: true }>(`/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }

  async revokeOtherAuthSessions() {
    return this.request<{ ok: true; revoked: number }>("/v1/auth/sessions/revoke-others", {
      method: "POST",
      body: {},
    });
  }

  async listOrganizations() {
    return this.request<{ organizations: Organization[] }>("/v1/orgs");
  }

  async createOrganization(body: { name: string }) {
    return this.request<{ organization: Organization; membership: Membership }>("/v1/orgs", { method: "POST", body });
  }

  async getOrganization(orgId: string) {
    return this.request<Organization>(`/v1/orgs/${encodeURIComponent(orgId)}`);
  }

  async patchOrganization(orgId: string, body: { name: string }) {
    return this.request<Organization>(`/v1/orgs/${encodeURIComponent(orgId)}`, { method: "PATCH", body });
  }

  async switchOrgContext(orgId: string) {
    return this.request<{ tokens: AuthTokens }>(`/v1/orgs/${encodeURIComponent(orgId)}/switch-context-token`, {
      method: "POST",
      body: {},
    });
  }

  async listMembers(orgId: string) {
    return this.request<{ members: MemberRecord[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/members`);
  }

  async patchMember(orgId: string, membershipId: string, body: { status: string }) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`, {
      method: "PATCH",
      body,
    });
  }

  async removeMember(orgId: string, membershipId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`, {
      method: "DELETE",
    });
  }

  async createInvite(orgId: string, body: { email: string }) {
    return this.request<{ invitation: Invitation }>(`/v1/orgs/${encodeURIComponent(orgId)}/invites`, {
      method: "POST",
      body,
    });
  }

  async cancelInvite(orgId: string, invitationId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(invitationId)}/cancel`, {
      method: "POST",
      body: {},
    });
  }

  async listInvites(orgId: string) {
    return this.request<{ invites: Invitation[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/invites`);
  }

  async getInvite(orgId: string, invitationId: string) {
    return this.request<{ invitation: Invitation }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(invitationId)}`,
    );
  }

  async resendInvite(orgId: string, invitationId: string) {
    return this.request<{ invitation: Invitation }>(`/v1/orgs/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(invitationId)}/resend`, {
      method: "POST",
      body: {},
    });
  }

  async previewInvitation(token: string) {
    return this.request<{ invitation: Invitation }>(`/v1/invitations/preview`, {
      method: "POST",
      body: { token },
      headers: { authorization: undefined },
    });
  }

  async acceptInvitation(body: { token: string; display_name?: string; password?: string }) {
    return this.request<{ tokens: AuthTokens; organization: Organization; membership: Membership }>("/v1/invitations/accept", {
      method: "POST",
      body,
      headers: { authorization: undefined },
    });
  }

  async listPermissions() {
    return this.request<{ permissions: string[] }>("/v1/permissions");
  }

  async listRoles(orgId: string) {
    return this.request<{ roles: Role[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles`);
  }

  async createRole(orgId: string, body: { name: string; slug: string; permissions: string[] }) {
    return this.request<Role>(`/v1/orgs/${encodeURIComponent(orgId)}/roles`, { method: "POST", body });
  }

  async patchRolePermissions(orgId: string, roleId: string, body: { permissions: string[] }) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteRole(orgId: string, roleId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    });
  }

  async assignRole(orgId: string, roleId: string, membershipId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}/members/${encodeURIComponent(membershipId)}`, {
      method: "POST",
      body: {},
    });
  }

  async unassignRole(orgId: string, roleId: string, membershipId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}/members/${encodeURIComponent(membershipId)}`, {
      method: "DELETE",
    });
  }

  async getRolePermissions(orgId: string, roleId: string) {
    return this.request<{ permissions: string[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}/permissions`);
  }

  async putRolePermissions(orgId: string, roleId: string, body: { permissions: string[] }) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/roles/${encodeURIComponent(roleId)}/permissions`, {
      method: "PUT",
      body,
    });
  }

  async getLoginMethods(orgId: string) {
    return this.request<OrgLoginMethods>(`/v1/orgs/${encodeURIComponent(orgId)}/settings/login-methods`);
  }

  async patchLoginMethods(orgId: string, body: Partial<OrgLoginMethods>) {
    return this.request<OrgLoginMethods>(`/v1/orgs/${encodeURIComponent(orgId)}/settings/login-methods`, {
      method: "PATCH",
      body,
    });
  }

  async getUserLoginMethodOverride(orgId: string, userId: string) {
    return this.request<UserLoginMethodOverrideResponse>(
      `/v1/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/login-method-override`,
    );
  }

  async patchUserLoginMethodOverride(
    orgId: string,
    userId: string,
    body: {
      password_enabled?: boolean | null;
      google_oidc_enabled?: boolean | null;
      saml_enabled?: boolean | null;
    },
  ) {
    return this.request<UserLoginMethodOverrideResponse>(
      `/v1/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/login-method-override`,
      { method: "PATCH", body },
    );
  }

  async deleteUserLoginMethodOverride(orgId: string, userId: string) {
    return this.request<{ ok: true; effective: OrgLoginMethods }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/login-method-override`,
      { method: "DELETE" },
    );
  }

  async listTeams(orgId: string) {
    return this.request<{ teams: Team[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/teams`);
  }

  async createTeam(orgId: string, body: { name: string; handle?: string; description?: string }) {
    return this.request<Team>(`/v1/orgs/${encodeURIComponent(orgId)}/teams`, { method: "POST", body });
  }

  async patchTeam(orgId: string, teamId: string, body: { name?: string; description?: string }) {
    return this.request<Team>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteTeam(orgId: string, teamId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}`, {
      method: "DELETE",
    });
  }

  async listTeamMemberships(orgId: string, teamId: string) {
    return this.request<{ memberships: TeamMembership[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}/memberships`);
  }

  async addTeamMembership(
    orgId: string,
    teamId: string,
    body: {
      membership_id: string;
      team_role?: "MEMBER" | "ADMIN";
      provisioned_by?: "MANUAL" | "SCIM" | "WORKFORCE";
      provisioned_by_id?: string;
    }
  ) {
    return this.request<TeamMembership>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}/memberships`, {
      method: "POST",
      body: {
        membership_id: body.membership_id,
        team_role: body.team_role,
        provisioned_by: body.provisioned_by,
        provisioned_by_id: body.provisioned_by_id,
      },
    });
  }

  async removeTeamMembership(orgId: string, teamId: string, teamMembershipId: string) {
    return this.request<{ ok: true }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}/memberships/${encodeURIComponent(teamMembershipId)}`,
      { method: "DELETE" }
    );
  }

  async getTeamSettings(orgId: string) {
    return this.request<TeamSettings>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/settings`);
  }

  async patchTeamSettings(
    orgId: string,
    body: { allow_user_team_create: boolean; allow_membership_self_manage: boolean },
  ) {
    return this.request<TeamSettings>(`/v1/orgs/${encodeURIComponent(orgId)}/teams/settings`, {
      method: "PATCH",
      body,
    });
  }

  async listServiceAccounts(orgId: string) {
    return this.request<{ service_accounts: ServiceAccount[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/service-accounts`);
  }

  async createServiceAccount(orgId: string, body: { name: string; description?: string }) {
    return this.request<ServiceAccount>(`/v1/orgs/${encodeURIComponent(orgId)}/service-accounts`, { method: "POST", body });
  }

  async patchServiceAccount(orgId: string, serviceAccountId: string, body: { name?: string; description?: string; status?: string }) {
    return this.request<ServiceAccount>(
      `/v1/orgs/${encodeURIComponent(orgId)}/service-accounts/${encodeURIComponent(serviceAccountId)}`,
      { method: "PATCH", body }
    );
  }

  async createServiceAccountToken(
    orgId: string,
    serviceAccountId: string,
    body: { name?: string; expires_at?: string }
  ) {
    return this.request<ServiceAccountTokenIssue>(
      `/v1/orgs/${encodeURIComponent(orgId)}/service-accounts/${encodeURIComponent(serviceAccountId)}/tokens`,
      { method: "POST", body }
    );
  }

  async revokeServiceAccountToken(orgId: string, serviceAccountId: string, tokenId: string) {
    return this.request<{ ok: true }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/service-accounts/${encodeURIComponent(serviceAccountId)}/tokens/${encodeURIComponent(tokenId)}/revoke`,
      { method: "POST", body: {} }
    );
  }

  async getSAMLConfig(orgId: string) {
    return this.request<SAMLConfig>(`/v1/orgs/${encodeURIComponent(orgId)}/saml/config`);
  }

  async patchSAMLConfig(
    orgId: string,
    body: {
      idp_entity_id?: string;
      idp_sso_url?: string;
      idp_cert_pem?: string;
      sp_entity_id?: string;
      attribute_mappings_json?: unknown;
      default_role_id?: string;
      enabled: boolean;
    },
  ) {
    return this.request<SAMLConfig>(`/v1/orgs/${encodeURIComponent(orgId)}/saml/config`, {
      method: "PATCH",
      body,
    });
  }

  async getSAMLMetadata(orgId: string) {
    return this.request<Record<string, unknown>>(`/v1/orgs/${encodeURIComponent(orgId)}/saml/metadata`);
  }

  async postSamlAcs(orgId: string, body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/v1/orgs/${encodeURIComponent(orgId)}/saml/acs`, {
      method: "POST",
      body,
      headers: { authorization: undefined },
    });
  }

  async listAuthNMappings(orgId: string) {
    return this.request<{ mappings: AuthNMapping[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/authn-mappings`);
  }

  async createAuthNMapping(
    orgId: string,
    body: { attribute_key: string; attribute_value: string; target_role_id: string; target_team_id?: string; priority: number },
  ) {
    return this.request<AuthNMapping>(`/v1/orgs/${encodeURIComponent(orgId)}/authn-mappings`, {
      method: "POST",
      body,
    });
  }

  async patchAuthNMapping(
    orgId: string,
    mappingId: string,
    body: { attribute_key?: string; attribute_value?: string; target_role_id?: string; target_team_id?: string; priority?: number },
  ) {
    return this.request<AuthNMapping>(`/v1/orgs/${encodeURIComponent(orgId)}/authn-mappings/${encodeURIComponent(mappingId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteAuthNMapping(orgId: string, mappingId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/authn-mappings/${encodeURIComponent(mappingId)}`, {
      method: "DELETE",
    });
  }

  async getSCIMConfig(orgId: string) {
    return this.request<{ org_id: string; base_url: string; token_count: number; tokens: SCIMToken[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/scim/config`,
    );
  }

  async createSCIMToken(orgId: string, body: { service_account_id: string }) {
    return this.request<{ token_id: string; service_account_id: string; token: string; token_preview: string; created_at: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/scim/tokens`,
      { method: "POST", body },
    );
  }

  async deleteSCIMToken(orgId: string, tokenId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/scim/tokens/${encodeURIComponent(tokenId)}`, {
      method: "DELETE",
    });
  }

  async listScimUsers() {
    return this.request<Record<string, unknown>>("/scim/v2/Users");
  }

  async createScimUser(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/scim/v2/Users", {
      method: "POST",
      body,
    });
  }

  async getScimUser(id: string) {
    return this.request<Record<string, unknown>>(`/scim/v2/Users/${encodeURIComponent(id)}`);
  }

  async patchScimUser(id: string, body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/scim/v2/Users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteScimUser(id: string) {
    return this.request<Record<string, unknown>>(`/scim/v2/Users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async listScimGroups() {
    return this.request<Record<string, unknown>>("/scim/v2/Groups");
  }

  async createScimGroup(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/scim/v2/Groups", {
      method: "POST",
      body,
    });
  }

  async patchScimGroup(id: string, body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/scim/v2/Groups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteScimGroup(id: string) {
    return this.request<Record<string, unknown>>(`/scim/v2/Groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async workforceTokenExchange(body: Record<string, unknown>) {
    return this.request<AuthTokens>("/v1/workforce/token/exchange", {
      method: "POST",
      body,
      headers: { authorization: undefined },
    });
  }

  async workforceTokenRefresh(refreshToken: string) {
    return this.request<AuthTokens>("/v1/workforce/token/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      headers: { authorization: undefined },
    });
  }

  async revokeWorkforceTokenSession(sessionId?: string) {
    return this.request<{ ok: true }>("/v1/workforce/token/revoke", {
      method: "POST",
      body: sessionId ? { session_id: sessionId } : {},
    });
  }

  async getWorkforcePolicy(orgId: string): Promise<WorkforceAccessPolicy> {
    const raw = await this.request<WorkforceAccessPolicy>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/policy`);
    return normalizeWorkforcePolicy(raw);
  }

  async patchWorkforcePolicy(orgId: string, body: Partial<WorkforceAccessPolicy>): Promise<WorkforceAccessPolicy> {
    const raw = await this.request<WorkforceAccessPolicy>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/policy`, {
      method: "PATCH",
      body: {
        policy_name: body.policy_name,
        enabled: body.enabled,
        allowed_idps: body.allowed_idps,
        allowed_email_domains: body.allowed_email_domains,
        required_group_rules_json: body.required_group_rules_json,
        required_endpoint_signals_json: body.required_endpoint_signals_json,
        default_role_id: body.default_role_id,
        session_ttl_minutes: body.session_ttl_minutes,
        max_session_ttl_minutes: body.max_session_ttl_minutes,
        token_binding_mode: body.token_binding_mode,
      },
    });
    return normalizeWorkforcePolicy(raw);
  }

  async listWorkforceMappings(orgId: string) {
    return this.request<{ mappings: WorkforceGroupMapping[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/mappings`);
  }

  async createWorkforceMapping(orgId: string, body: Record<string, unknown>) {
    return this.request<WorkforceGroupMapping>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/mappings`, {
      method: "POST",
      body,
    });
  }

  async patchWorkforceMapping(orgId: string, mappingId: string, body: Record<string, unknown>) {
    return this.request<WorkforceGroupMapping>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/mappings/${encodeURIComponent(mappingId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteWorkforceMapping(orgId: string, mappingId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/mappings/${encodeURIComponent(mappingId)}`, {
      method: "DELETE",
    });
  }

  async listWorkforceSubjects(orgId: string, limit = 200) {
    return this.request<{ subjects: WorkforceSubject[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/subjects`, {
      query: { limit },
    });
  }

  async listWorkforceSessions(orgId: string, limit = 200) {
    return this.request<{ sessions: WorkforceTokenSession[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/sessions`, {
      query: { limit },
    });
  }

  async revokeWorkforceSession(orgId: string, sessionId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: "POST",
      body: {},
    });
  }

  async listWorkforceAudit(orgId: string, limit = 100) {
    return this.request<{ audit: Array<Record<string, unknown>> }>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/audit`, {
      query: { limit },
    });
  }

  async getWorkforceRolloutStatus(orgId: string) {
    return this.request<WorkforceRolloutStatus>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/rollout/status`);
  }

  async createWorkforceRolloutWave(
    orgId: string,
    body: {
      name: string;
      mode?: "CANARY" | "ENABLE";
      enabled?: boolean;
      percent?: number;
      allowed_email_domains?: string[];
      allowed_groups?: string[];
    },
  ) {
    return this.request<WorkforceRolloutWave>(`/v1/orgs/${encodeURIComponent(orgId)}/workforce/rollout/waves`, {
      method: "POST",
      body,
    });
  }

  async patchWorkforceRolloutWave(
    orgId: string,
    waveId: string,
    body: {
      name?: string;
      mode?: "CANARY" | "ENABLE";
      enabled?: boolean;
      percent?: number;
      allowed_email_domains?: string[];
      allowed_groups?: string[];
    },
  ) {
    return this.request<WorkforceRolloutWave>(
      `/v1/orgs/${encodeURIComponent(orgId)}/workforce/rollout/waves/${encodeURIComponent(waveId)}`,
      { method: "PATCH", body },
    );
  }

  async rollbackWorkforceRolloutWave(orgId: string, waveId: string) {
    return this.request<WorkforceRolloutWave>(
      `/v1/orgs/${encodeURIComponent(orgId)}/workforce/rollout/waves/${encodeURIComponent(waveId)}/rollback`,
      { method: "POST", body: {} },
    );
  }

  async dashboardQuery(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/dashboard/query", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listAuditEvents(orgId: string, params: Record<string, unknown> = {}) {
    return this.request<{ items: AuditEvent[]; next_cursor?: string }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/events`, {
      query: cleanQuery(params),
    });
  }

  async getAuditEvent(orgId: string, eventId: string) {
    return this.request<{ event: AuditEvent }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/events/${encodeURIComponent(eventId)}`);
  }

  async exportAuditEvents(orgId: string, body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/events/export`, {
      method: "POST",
      body,
    });
  }

  async listAuditSavedViews(orgId: string) {
    return this.request<{ views: AuditSavedView[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/saved-views`);
  }

  async createAuditSavedView(orgId: string, body: Record<string, unknown>) {
    return this.request<{ view: AuditSavedView }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/saved-views`, {
      method: "POST",
      body,
    });
  }

  async patchAuditSavedView(orgId: string, viewId: string, body: Record<string, unknown>) {
    return this.request<{ view: AuditSavedView }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/saved-views/${encodeURIComponent(viewId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteAuditSavedView(orgId: string, viewId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/saved-views/${encodeURIComponent(viewId)}`, {
      method: "DELETE",
    });
  }

  async createAuditNotableRule(orgId: string, body: { name: string; enabled?: boolean; definition?: Record<string, unknown> }) {
    return this.request<{ rule: AuditNotableRule }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/notable-rules`, {
      method: "POST",
      body,
    });
  }

  async listAuditNotableEvents(orgId: string, limit = 100) {
    return this.request<{ events: AuditNotableEvent[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/audit/notable-events`, {
      query: { limit },
    });
  }

  async listDashboards(orgId: string, params: Record<string, unknown> = {}) {
    return this.request<{ dashboards: DashboardDefinition[] }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards`, {
      query: cleanQuery(params),
    });
  }

  async createDashboard(orgId: string, body: Record<string, unknown>) {
    return this.request<{ dashboard: DashboardDefinition }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards`, {
      method: "POST",
      body,
    });
  }

  async getDashboard(orgId: string, dashboardId: string) {
    return this.request<{ dashboard: DashboardDefinition }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}`);
  }

  async patchDashboard(orgId: string, dashboardId: string, body: Record<string, unknown>) {
    return this.request<{ dashboard: DashboardDefinition }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}`, {
      method: "PATCH",
      body,
    });
  }

  async deleteDashboard(orgId: string, dashboardId: string) {
    return this.request<{ ok: true }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}`, {
      method: "DELETE",
    });
  }

  async cloneDashboard(orgId: string, dashboardId: string, body?: { name?: string }) {
    return this.request<{ dashboard: DashboardDefinition }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/clone`,
      { method: "POST", body: body || {} },
    );
  }

  async listDashboardVersions(orgId: string, dashboardId: string) {
    return this.request<{ versions: DashboardVersion[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/versions`,
    );
  }

  async restoreDashboardVersion(orgId: string, dashboardId: string, version: number) {
    return this.request<{ dashboard: DashboardDefinition }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/restore/${encodeURIComponent(String(version))}`,
      { method: "POST", body: {} },
    );
  }

  async listDashboardSavedViews(orgId: string, dashboardId: string) {
    return this.request<{ views: DashboardSavedView[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/saved-views`
    );
  }

  async createDashboardSavedView(orgId: string, dashboardId: string, body: Record<string, unknown>) {
    return this.request<{ view: DashboardSavedView }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/saved-views`,
      { method: "POST", body }
    );
  }

  async deleteDashboardSavedView(orgId: string, dashboardId: string, viewId: string) {
    return this.request<{ ok: true }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/saved-views/${encodeURIComponent(viewId)}`,
      { method: "DELETE" },
    );
  }

  async listDashboardPermissions(orgId: string, dashboardId: string) {
    return this.request<{ permissions: DashboardPermission[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/permissions`
    );
  }

  async putDashboardPermissions(orgId: string, dashboardId: string, body: { permissions: DashboardPermission[] }) {
    return this.request<{ permissions: DashboardPermission[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/permissions`,
      { method: "PUT", body }
    );
  }

  async toggleDashboardFavorite(orgId: string, dashboardId: string, favorite: boolean) {
    return this.request<{ ok: true }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/favorite`,
      { method: "POST", body: { favorite } },
    );
  }

  async importDashboard(
    orgId: string,
    body: {
      name?: string;
      description?: string;
      tags?: string[];
      layout_type?: "ordered" | "free";
      reflow_type?: "" | "auto" | "fixed";
      definition?: Record<string, unknown>;
      json?: Record<string, unknown>;
    },
  ) {
    return this.request<{ dashboard: DashboardDefinition }>(`/v1/orgs/${encodeURIComponent(orgId)}/dashboards/import`, {
      method: "POST",
      body,
    });
  }

  async exportDashboard(orgId: string, dashboardId: string) {
    return this.request<{ dashboard: DashboardDefinition; export: Record<string, unknown> }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/export`,
    );
  }

  async getBillingSubscription(orgId: string) {
    return this.request<Record<string, unknown>>(`/v1/orgs/${encodeURIComponent(orgId)}/billing/subscription`);
  }

  async patchBillingSubscription(orgId: string, body: Record<string, unknown>) {
    return this.request<BillingEntitlements>(`/v1/orgs/${encodeURIComponent(orgId)}/billing/subscription`, {
      method: "PATCH",
      body,
    });
  }

  async createBillingCheckoutSession(
    orgId: string,
    body: { price_id: string; success_url?: string; cancel_url?: string }
  ) {
    return this.request<{ url: string; session_id: string; subscription?: Record<string, unknown>; effective_plan?: Record<string, unknown> }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/billing/checkout-session`,
      {
      method: "POST",
      body,
      }
    );
  }

  async createBillingPortalSession(orgId: string, body: { return_url: string }) {
    return this.request<{ url: string; session_id: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/billing/customer-portal-session`,
      {
      method: "POST",
      body,
      }
    );
  }
}
