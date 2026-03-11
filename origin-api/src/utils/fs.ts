import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await ensureDir(dirname(filePath));
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureParentDir(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const data = await readFile(path, "utf8");
  return JSON.parse(data) as T;
}

export async function listJsonFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
}
