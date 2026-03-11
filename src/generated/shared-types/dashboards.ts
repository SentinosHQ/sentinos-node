export type DashboardLayoutType = "ordered" | "free";
export type DashboardReflowType = "auto" | "fixed";

export type DashboardWidgetType =
  | "timeseries"
  | "query_value"
  | "toplist"
  | "table"
  | "pie"
  | "heatmap"
  | "treemap"
  | "change"
  | "scatterplot"
  | "event_stream";

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  min_w?: number;
  min_h?: number;
  max_w?: number;
  max_h?: number;
}

export interface WidgetQueryFilter {
  field: string;
  op: "=" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in" | "contains";
  value: string | number | boolean | Array<string | number | boolean>;
}

export interface WidgetQueryAST {
  query_id: string;
  source_service: "kernel" | "arbiter" | "chronos" | "controlplane";
  dataset: string;
  measure: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max" | "p50" | "p95" | "p99";
  filters?: WidgetQueryFilter[];
  group_by?: string[];
  rollup?: "1m" | "5m" | "15m" | "1h" | "6h" | "1d";
  timeshift?: string;
  limit?: number;
  sort?: "asc" | "desc";
  raw_query?: string;
}

export interface WidgetFormula {
  formula_id: string;
  expression: string;
  alias?: string;
}

export interface DashboardWidget {
  widget_id: string;
  type: DashboardWidgetType;
  title?: string;
  description?: string;
  layout: WidgetLayout;
  queries: WidgetQueryAST[];
  formulas?: WidgetFormula[];
  options?: Record<string, unknown>;
}

export interface TemplateVariable {
  name: string;
  label?: string;
  default?: string;
  options?: string[];
  multi?: boolean;
}

export interface TemplateVariablePreset {
  preset_id: string;
  name: string;
  values: Record<string, string | string[]>;
}

export interface DashboardDefinition {
  dashboard_id: string;
  org_id: string;
  title: string;
  description?: string;
  tags?: string[];
  layout_type: DashboardLayoutType;
  reflow_type?: DashboardReflowType;
  widgets: DashboardWidget[];
  template_variables?: TemplateVariable[];
  template_variable_presets?: TemplateVariablePreset[];
  restricted_roles?: string[];
  owner_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DashboardSavedView {
  view_id: string;
  dashboard_id: string;
  org_id: string;
  name: string;
  is_default: boolean;
  time_window?: string;
  variables?: Record<string, string | string[]>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardPermission {
  permission_id: string;
  dashboard_id: string;
  org_id: string;
  role_slug: string;
  can_view: boolean;
  can_edit: boolean;
  created_at: string;
}
