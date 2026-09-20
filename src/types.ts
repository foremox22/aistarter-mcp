export type ExperienceLevel = "total-beginner" | "some-experience" | "experienced";
export type AiTool = "claude-code" | "codex" | "cursor" | "other";

export type Stage =
  | "scoping"
  | "ready_for_scope"
  | "architecture"
  | "schema"
  | "roadmap"
  | "done";

export interface Classification {
  experience_level: ExperienceLevel;
  ai_tool: AiTool;
}

export interface Answer {
  question_id: string;
  answer: string;
}

export interface Scope {
  one_liner?: string;
  primary_users?: string;
  platforms?: string[];
  needs_realtime?: boolean;
  needs_accounts?: boolean;
  needs_payments?: boolean;
  needs_admin_dashboard?: boolean;
  estimated_scale?: string;
  must_have_features?: string[];
  constraints?: string;
  [key: string]: unknown;
}

export interface Architecture {
  frontend?: string;
  backend?: string;
  database?: string;
  hosting?: string;
  rationale?: string;
  [key: string]: unknown;
}

export interface SchemaDraft {
  archetype?: string;
  collections?: Array<{ name: string; fields: string[] }>;
  security_notes?: string;
  [key: string]: unknown;
}

export interface Roadmap {
  sprints?: Array<{ name: string; goals: string[] }>;
  [key: string]: unknown;
}

export interface Session {
  session_id: string;
  created_at: string;
  updated_at: string;
  stage: Stage;
  classification?: Classification;
  answers: Answer[];
  scope?: Scope;
  architecture?: Architecture;
  schema?: SchemaDraft;
  roadmap?: Roadmap;
}
