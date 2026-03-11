import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppContext } from "../../src/bootstrap/context.js";

export async function createTempContext() {
  const root = await mkdtemp(join(tmpdir(), "roleosbc-"));
  const context = await createAppContext(root);
  return { root, context };
}
