import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { ensureDir, writeJsonFile } from "../utils/fs.js";

const defaultRole = {
  id: "content-operator",
  kind: "role",
  specVersion: "v1",
  lifecycle: "active",
  title: "Content Operator",
  description: "Create and refine user-facing content.",
  updatedAt: "2026-03-11T00:00:00.000Z",
  purpose: "Turn intent into publishable content.",
  inputs: ["user intent", "topic constraints"],
  outputs: ["draft content", "improvement notes"],
  constraints: ["follow tone guide", "avoid unsupported claims"],
  readinessChecks: ["intent is clear", "target audience is known"],
  recommendedContexts: ["marketing copy", "announcement drafts"],
  failureBoundaries: ["missing factual context"],
  successInterpretation: "Output is directly usable after minor edits.",
  escalationHints: ["ask for product facts when confidence is low"]
};

const defaultKit = {
  id: "content-starter-kit",
  kind: "kit",
  specVersion: "v1",
  lifecycle: "active",
  title: "Content Starter Kit",
  description: "Starter assets for content workflows.",
  updatedAt: "2026-03-11T00:00:00.000Z",
  requiredAssets: [
    "skills/content-rewriter",
    "skills/fact-checker",
    "skills/style-guard"
  ],
  installTarget: "workspace",
  modelPolicy: {
    name: "default-managed-model",
    temperature: 0.4,
    maxTokens: 4096
  },
  docs: "Use for structured content generation and revisions.",
  checks: ["skills loaded", "model policy available"],
  version: "1.0.0",
  roleRefs: ["content-operator"]
};

const defaultTeam = {
  id: "content-team-mvp",
  kind: "team",
  specVersion: "v1",
  lifecycle: "active",
  title: "Content Team MVP",
  description: "One-role team for cloud MVP orchestration.",
  updatedAt: "2026-03-11T00:00:00.000Z",
  participatingRoles: ["content-operator"],
  requiredKits: ["content-starter-kit"],
  handoffOrder: ["content-operator"],
  humanCheckpoints: ["review before publish"],
  successCriteria: ["output is publish-ready", "tone remains consistent"]
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDefaultRegistry(registryRoot: string): Promise<void> {
  const roleDir = join(registryRoot, "roles");
  const kitDir = join(registryRoot, "kits");
  const teamDir = join(registryRoot, "teams");
  const marketDir = join(registryRoot, "market");
  await Promise.all([ensureDir(roleDir), ensureDir(kitDir), ensureDir(teamDir), ensureDir(marketDir)]);

  const rolePath = join(roleDir, "content-operator.json");
  const kitPath = join(kitDir, "content-starter-kit.json");
  const teamPath = join(teamDir, "content-team-mvp.json");
  const marketCatalogPath = join(marketDir, "catalog.v1.json");

  if (!(await fileExists(rolePath))) {
    await writeJsonFile(rolePath, defaultRole);
  }
  if (!(await fileExists(kitPath))) {
    await writeJsonFile(kitPath, defaultKit);
  }
  if (!(await fileExists(teamPath))) {
    await writeJsonFile(teamPath, defaultTeam);
  }
  if (!(await fileExists(marketCatalogPath))) {
    await writeJsonFile(marketCatalogPath, {
      kind: "market-catalog",
      specVersion: "v1",
      updatedAt: "2026-03-11T00:00:00.000Z",
      bPackages: [
        {
          code: "b-selfhosted-standard",
          name: "B Self-Hosted Standard",
          description:
            "One-click deployment package for Linux, Windows, and macOS with RoleOS and optional OpenClaw sidecar.",
          deliveryModes: ["one-click-script", "cli-binary"],
          entryPoints: [
            "scripts/one-click-deploy.sh",
            "scripts/one-click-deploy.ps1",
            "release/*"
          ]
        }
      ],
      billingModes: [
        {
          id: "api_token",
          title: "API Token",
          description: "Metered by API token usage for model calls."
        },
        {
          id: "compute_token",
          title: "Compute Token",
          description: "Metered by runtime compute capacity and workload duration."
        }
      ],
      cPlans: [
        {
          planCode: "trial",
          title: "Trial",
          recommendedBillingModes: ["api_token"]
        },
        {
          planCode: "starter",
          title: "Starter",
          recommendedBillingModes: ["api_token", "compute_token"]
        },
        {
          planCode: "pro",
          title: "Pro",
          recommendedBillingModes: ["api_token", "compute_token"]
        },
        {
          planCode: "business",
          title: "Business",
          recommendedBillingModes: ["compute_token"]
        },
        {
          planCode: "enterprise",
          title: "Enterprise",
          recommendedBillingModes: ["compute_token"]
        }
      ]
    });
  }
}
