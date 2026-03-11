export type PrincipalType = "HUMAN" | "SERVICE" | "WORKFORCE";
export type PrincipalStatus = "ACTIVE" | "DISABLED";
export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED";
export type RoleKind = "MANAGED" | "CUSTOM";
export type TeamRole = "MEMBER" | "ADMIN";
export type TeamProvisioningSource = "MANUAL" | "SAML" | "SCIM" | "GITHUB_SYNC";
export type TeamMembershipProvisionedBy = "USER" | "SERVICE_ACCOUNT" | "SAML_MAPPING" | "SCIM";
export type ServiceAccountStatus = "ACTIVE" | "DISABLED";
export type SCIMJITPrecedence = "SCIM_FIRST" | "JIT_FIRST";

export interface Organization {
  org_id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  membership_id: string;
  org_id: string;
  principal_id: string;
  status: MembershipStatus;
  joined_at?: string;
  created_at: string;
  roles?: string[];
}

export interface MemberRecord {
  membership_id: string;
  principal_id: string;
  email: string;
  display_name?: string;
  status: MembershipStatus;
  joined_at?: string;
  roles: string[];
}

export interface Invitation {
  invitation_id: string;
  org_id: string;
  email: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  cancelled_at?: string;
  resent_count: number;
  created_at: string;
}

export interface Role {
  role_id: string;
  org_id?: string;
  name: string;
  slug: string;
  role_kind: RoleKind;
  is_system: boolean;
  permissions: string[];
}

export interface Team {
  team_id: string;
  org_id: string;
  name: string;
  handle: string;
  description?: string;
  is_managed: boolean;
  provisioning_source: TeamProvisioningSource;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  team_membership_id: string;
  team_id: string;
  membership_id: string;
  team_role: TeamRole;
  provisioned_by: TeamMembershipProvisionedBy;
  provisioned_by_id?: string;
  created_at: string;
}

export interface TeamSettings {
  org_id: string;
  allow_user_team_create: boolean;
  allow_membership_self_manage: boolean;
  updated_at: string;
}

export interface ServiceAccount {
  service_account_id: string;
  org_id: string;
  name: string;
  description?: string;
  status: ServiceAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceAccountTokenIssue {
  token_id: string;
  token: string;
  token_preview: string;
  service_account_id: string;
  created_at: string;
  expires_at?: string;
}

export interface OrgLoginMethods {
  org_id: string;
  password_enabled: boolean;
  google_oidc_enabled: boolean;
  saml_enabled: boolean;
  saml_strict: boolean;
  allow_user_override: boolean;
  jit_provisioning_enabled: boolean;
  workforce_exchange_enabled: boolean;
  workforce_allowed_idps: string[];
  scim_jit_precedence: SCIMJITPrecedence;
  updated_at: string;
}

export interface WorkforceAccessPolicy {
  org_id: string;
  policy_name: string;
  enabled: boolean;
  allowed_idps: string[];
  allowed_email_domains: string[];
  required_group_rules_json?: unknown;
  required_endpoint_signals_json?: Record<string, unknown>;
  default_role_id?: string;
  session_ttl_minutes: number;
  max_session_ttl_minutes: number;
  token_binding_mode: "DISABLED" | "OPTIONAL" | "REQUIRED";
  updated_at: string;
}

export interface WorkforceGroupMapping {
  mapping_id: string;
  org_id: string;
  external_group: string;
  target_role_id?: string;
  target_team_id?: string;
  priority: number;
  deny_on_match: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkforceSubject {
  principal_id: string;
  org_id: string;
  external_subject: string;
  external_idp: string;
  email?: string;
  display_name?: string;
  status: "ACTIVE" | "DISABLED";
  last_seen_at?: string;
  group_snapshot_json?: unknown;
  created_at: string;
  updated_at: string;
}

export interface WorkforceTokenSession {
  session_id: string;
  org_id: string;
  principal_id: string;
  authn_source: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  ip?: string;
  user_agent?: string;
  device_id?: string;
}

export interface SAMLConfig {
  org_id: string;
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_cert_pem?: string;
  sp_entity_id?: string;
  attribute_mappings_json?: unknown;
  default_role_id?: string;
  enabled: boolean;
  updated_at: string;
}

export interface AuthNMapping {
  mapping_id: string;
  org_id: string;
  attribute_key: string;
  attribute_value: string;
  target_role_id: string;
  target_team_id?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SCIMToken {
  token_id: string;
  org_id: string;
  service_account_principal_id: string;
  status: string;
  created_at: string;
  revoked_at?: string;
  token_preview?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
  session_id: string;
  org_id: string;
  tenant_id: string;
  membership_id: string;
  permissions: string[];
  roles: string[];
}

export interface AuthMe {
  user_id: string;
  email: string;
  display_name?: string;
  principal_type: PrincipalType;
  org_id: string;
  membership_id: string;
  roles: string[];
  permissions: string[];
  memberships: Membership[];
}
