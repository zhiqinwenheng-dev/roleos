import { join } from "node:path";
import { z } from "zod";
import { readJsonFile } from "../utils/fs.js";

const catalogSchema = z.object({
  kind: z.literal("market-catalog"),
  specVersion: z.literal("v1"),
  updatedAt: z.string(),
  bPackages: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      deliveryModes: z.array(z.string()),
      entryPoints: z.array(z.string())
    })
  ),
  billingModes: z.array(
    z.object({
      id: z.enum(["api_token", "compute_token"]),
      title: z.string(),
      description: z.string()
    })
  ),
  cPlans: z.array(
    z.object({
      planCode: z.string(),
      title: z.string(),
      recommendedBillingModes: z.array(z.enum(["api_token", "compute_token"]))
    })
  )
});

export type MarketCatalogV1 = z.infer<typeof catalogSchema>;

export function getMarketCatalogPath(registryRoot: string): string {
  return join(registryRoot, "market", "catalog.v1.json");
}

export async function loadMarketCatalog(registryRoot: string): Promise<MarketCatalogV1> {
  const path = getMarketCatalogPath(registryRoot);
  const raw = await readJsonFile<unknown>(path);
  return catalogSchema.parse(raw);
}

