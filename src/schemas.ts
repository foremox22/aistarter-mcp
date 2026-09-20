import { z } from "zod";

export const ExperienceLevelSchema = z.enum(["total-beginner", "some-experience", "experienced"]);
export const AiToolSchema = z.enum(["claude-code", "codex", "cursor", "other"]);

export const ScopeSchema = z
  .object({
    one_liner: z.string().optional(),
    primary_users: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    needs_realtime: z.boolean().optional(),
    needs_accounts: z.boolean().optional(),
    needs_payments: z.boolean().optional(),
    needs_admin_dashboard: z.boolean().optional(),
    estimated_scale: z.string().optional(),
    must_have_features: z.array(z.string()).optional(),
    constraints: z.string().optional(),
  })
  .passthrough();

export const ArchitectureSchema = z
  .object({
    frontend: z.string().optional(),
    backend: z.string().optional(),
    database: z.string().optional(),
    hosting: z.string().optional(),
    rationale: z.string().optional(),
  })
  .passthrough();

export const SchemaDraftSchema = z
  .object({
    archetype: z.string().optional(),
    collections: z.array(z.object({ name: z.string(), fields: z.array(z.string()) })).optional(),
    security_notes: z.string().optional(),
  })
  .passthrough();

export const RoadmapSchema = z
  .object({
    sprints: z.array(z.object({ name: z.string(), goals: z.array(z.string()) })).optional(),
  })
  .passthrough();
