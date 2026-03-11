import { z } from "zod";
import type { KitSpecV1, RegistryObject, RoleSpecV1, TeamSpecV1 } from "./types.js";

const lifecycleSchema = z.enum(["draft", "validated", "active", "deprecated"]);
const specVersionSchema = z.literal("v1");

const baseSpecSchema = z.object({
  id: z.string().min(1),
  specVersion: specVersionSchema,
  lifecycle: lifecycleSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  updatedAt: z.string().datetime()
});

const modelPolicySchema = z.object({
  name: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive()
});

export const roleSpecSchema = baseSpecSchema.extend({
  kind: z.literal("role"),
  purpose: z.string().min(1),
  inputs: z.array(z.string().min(1)).default([]),
  outputs: z.array(z.string().min(1)).default([]),
  constraints: z.array(z.string().min(1)).default([]),
  readinessChecks: z.array(z.string().min(1)).optional(),
  recommendedContexts: z.array(z.string().min(1)).optional(),
  failureBoundaries: z.array(z.string().min(1)).optional(),
  successInterpretation: z.string().min(1).optional(),
  escalationHints: z.array(z.string().min(1)).optional()
}) satisfies z.ZodType<RoleSpecV1>;

export const kitSpecSchema = baseSpecSchema.extend({
  kind: z.literal("kit"),
  requiredAssets: z.array(z.string().min(1)).default([]),
  installTarget: z.enum(["workspace", "tenant"]),
  modelPolicy: modelPolicySchema,
  docs: z.string().min(1),
  checks: z.array(z.string().min(1)).default([]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  roleRefs: z.array(z.string().min(1)).default([])
}) satisfies z.ZodType<KitSpecV1>;

export const teamSpecSchema = baseSpecSchema.extend({
  kind: z.literal("team"),
  participatingRoles: z.array(z.string().min(1)).min(1),
  requiredKits: z.array(z.string().min(1)).min(1),
  handoffOrder: z.array(z.string().min(1)).min(1),
  humanCheckpoints: z.array(z.string().min(1)).default([]),
  successCriteria: z.array(z.string().min(1)).min(1)
}) satisfies z.ZodType<TeamSpecV1>;

export const registryObjectSchema = z.discriminatedUnion("kind", [
  roleSpecSchema,
  kitSpecSchema,
  teamSpecSchema
]);

export function parseRegistryObject(input: unknown): RegistryObject {
  return registryObjectSchema.parse(input);
}
