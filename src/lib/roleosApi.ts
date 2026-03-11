export interface WorkspaceInfo {
  id: string;
  name: string;
}

export interface PlanInfo {
  code: string;
  name: string;
  monthlyPriceUsd: number;
  monthlyRunLimit: number;
  includedCostUsd: number;
  overageMultiplier: number;
  isActive: boolean;
}

export interface BillingModeInfo {
  id: "api_token" | "compute_token";
  title: string;
  description: string;
}

export interface MarketCatalog {
  kind: string;
  specVersion: string;
  updatedAt: string;
  bPackages: Array<{
    code: string;
    name: string;
    description: string;
    deliveryModes: string[];
    entryPoints: string[];
  }>;
  billingModes: BillingModeInfo[];
  cPlans: Array<{
    planCode: string;
    title: string;
    recommendedBillingModes: Array<"api_token" | "compute_token">;
  }>;
}

export interface WorkspaceSubscription {
  workspaceId: string;
  planCode: string;
  status: "active" | "past_due" | "paused" | "canceled";
  startsAt: string;
  renewsAt: string;
  cancelAtPeriodEnd: boolean;
  plan: PlanInfo;
}

export interface CloudUsageSummary {
  month: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  totalUsageCostUsd: number;
  totalVariableRevenueUsd: number;
  mrrUsd: number;
  totalEstimatedRevenueUsd: number;
}

export interface RunRecordView {
  id: string;
  workspaceId: string;
  source: "self-hosted" | "cloud";
  roleId: string;
  kitId: string;
  teamId?: string;
  input: string;
  output: string;
  status: "success" | "failed";
  retryCount: number;
  cost: number;
  trace: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  workspaceId: string;
  planCode: string;
  provider: string;
  providerOrderId: string;
  amountUsd: number;
  status: "pending" | "paid" | "failed" | "expired";
  checkoutUrl: string;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelfHostedEntitlement {
  id: string;
  workspaceId: string;
  packageCode: string;
  status: "inactive" | "active" | "revoked";
  orderId?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelfHostedArtifact {
  id: string;
  name: string;
  relativePath: string;
  platform: "windows" | "linux" | "macos" | "all";
  kind: "installer" | "script" | "package";
  sizeBytes: number;
  updatedAt: string;
  downloadUrl: string;
}

export interface WorkspaceDashboard {
  workspace: {
    id: string;
    name: string;
    createdAt?: string;
  };
  state: {
    workspaceId: string;
    defaultRoleId: string;
    defaultKitId: string;
    defaultTeamId: string;
    activeKitId: string;
    modelPolicyName: string;
  } | null;
  subscription: WorkspaceSubscription | null;
  usage: CloudUsageSummary;
  selfHostedEntitlement: SelfHostedEntitlement | null;
  recentRuns: RunRecordView[];
  recentOrders: PaymentOrder[];
  auditEvents: Array<{
    id: string;
    workspaceId: string;
    type: string;
    message: string;
    metadataJson?: string;
    createdAt: string;
  }>;
}

interface ApiError {
  ok?: false;
  message?: string;
}

function resolveApiBase(): string {
  const envBase = (import.meta.env.VITE_ROLEOS_API_BASE_URL ?? "").trim();
  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "";
  }

  const host = window.location.hostname;
  const isLocalhost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local");

  if (isLocalhost) {
    return "";
  }

  // Use same-origin proxy in production deployments to avoid cross-origin failures.
  return "/api";
}

const API_BASE = resolveApiBase();
const STORAGE_TOKEN_KEY = "roleosToken";
const STORAGE_WORKSPACES_KEY = "roleosWorkspaces";

function makeUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY) ?? "";
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(makeUrl(path), {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }
  return payload;
}

async function requestBinary(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY) ?? "";
  const headers = new Headers(init?.headers ?? {});
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(makeUrl(path), {
    ...init,
    headers
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }
  return response;
}

function parseJsonFromJwt(token: string): { email?: string } {
  if (!token || token.split(".").length < 2) {
    return {};
  }
  try {
    return JSON.parse(atob(token.split(".")[1])) as { email?: string };
  } catch {
    return {};
  }
}

export function saveSession(token: string, workspaces: WorkspaceInfo[]): void {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_WORKSPACES_KEY, JSON.stringify(workspaces));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_WORKSPACES_KEY);
}

export function readSession(): {
  token: string;
  workspaces: WorkspaceInfo[];
  email: string;
} {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY) ?? "";
  const rawWorkspaces = localStorage.getItem(STORAGE_WORKSPACES_KEY) ?? "[]";
  let workspaces: WorkspaceInfo[] = [];
  try {
    workspaces = JSON.parse(rawWorkspaces) as WorkspaceInfo[];
  } catch {
    workspaces = [];
  }
  const email = parseJsonFromJwt(token).email ?? "";
  return { token, workspaces, email };
}

export async function register(input: {
  email: string;
  password: string;
  workspaceName: string;
}): Promise<{
  ok: true;
  token: string;
  user: { id: string; email: string };
  workspace: WorkspaceInfo;
}> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{
  ok: true;
  token: string;
  user: { id: string; email: string };
  workspaces: WorkspaceInfo[];
}> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchMe(): Promise<{
  ok: true;
  user: { id: string; email: string; createdAt?: string };
  workspaces: WorkspaceInfo[];
  workspaceStatuses: Array<{
    workspaceId: string;
    workspaceName: string;
    subscription: { planCode: string; status: string } | null;
    selfHosted: { status: string; packageCode: string } | null;
  }>;
}> {
  return request("/auth/me");
}

export async function fetchPlans(): Promise<{ ok: true; plans: PlanInfo[] }> {
  return request("/plans");
}

export async function fetchMarketCatalog(): Promise<{ ok: true; catalog: MarketCatalog }> {
  return request("/market/catalog");
}

export async function fetchWorkspaceRoles(workspaceId: string): Promise<{
  ok: true;
  roles: Array<{ id: string; title: string; purpose: string }>;
}> {
  return request(`/workspaces/${workspaceId}/roles`);
}

export async function fetchWorkspaceDashboard(
  workspaceId: string,
  month?: string
): Promise<{ ok: true } & WorkspaceDashboard> {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return request(`/workspaces/${workspaceId}/dashboard${query}`);
}

export async function activateKit(
  workspaceId: string,
  kitId: string
): Promise<{
  ok: true;
  state: unknown;
  kit: unknown;
}> {
  return request(`/workspaces/${workspaceId}/kits/${encodeURIComponent(kitId)}/activate`, {
    method: "POST"
  });
}

export async function runTeam(
  workspaceId: string,
  intent: string
): Promise<{
  ok: boolean;
  run: RunRecordView;
  delivery?: unknown;
  billing?: unknown;
}> {
  return request(`/workspaces/${workspaceId}/team/run`, {
    method: "POST",
    body: JSON.stringify({ intent })
  });
}

export async function fetchRuns(
  workspaceId: string,
  limit = 20
): Promise<{
  ok: true;
  runs: RunRecordView[];
}> {
  return request(`/workspaces/${workspaceId}/runs?limit=${encodeURIComponent(String(limit))}`);
}

export async function fetchRun(workspaceId: string, runId: string): Promise<{
  ok: true;
  run: RunRecordView;
}> {
  return request(`/workspaces/${workspaceId}/runs/${encodeURIComponent(runId)}`);
}

export async function fetchSubscription(workspaceId: string): Promise<{
  ok: true;
  subscription: WorkspaceSubscription;
}> {
  return request(`/workspaces/${workspaceId}/subscription`);
}

export async function switchSubscription(
  workspaceId: string,
  planCode: string
): Promise<{
  ok: true;
  subscription: WorkspaceSubscription;
}> {
  return request(`/workspaces/${workspaceId}/subscription`, {
    method: "POST",
    body: JSON.stringify({ planCode })
  });
}

export async function fetchUsage(workspaceId: string): Promise<{
  ok: true;
  usage: CloudUsageSummary;
  subscription?: WorkspaceSubscription;
}> {
  return request(`/workspaces/${workspaceId}/billing/usage`);
}

export async function createCheckout(
  workspaceId: string,
  planCode: string,
  billingMode: "api_token" | "compute_token"
): Promise<{
  ok: true;
  order: PaymentOrder;
}> {
  return request(`/workspaces/${workspaceId}/billing/checkout`, {
    method: "POST",
    body: JSON.stringify({ planCode, billingMode })
  });
}

export async function fetchPaymentOrders(
  workspaceId: string
): Promise<{
  ok: true;
  orders: PaymentOrder[];
}> {
  return request(`/workspaces/${workspaceId}/payment-orders`);
}

export async function fetchSelfHostedEntitlement(
  workspaceId: string
): Promise<{
  ok: true;
  entitlement: SelfHostedEntitlement | null;
}> {
  return request(`/workspaces/${workspaceId}/self-hosted/entitlement`);
}

export async function fetchSelfHostedOrders(
  workspaceId: string
): Promise<{
  ok: true;
  orders: PaymentOrder[];
}> {
  return request(`/workspaces/${workspaceId}/self-hosted/orders`);
}

export async function createSelfHostedCheckout(
  workspaceId: string,
  input?: { successUrl?: string; cancelUrl?: string }
): Promise<{
  ok: true;
  order: PaymentOrder;
}> {
  return request(`/workspaces/${workspaceId}/self-hosted/checkout`, {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}

export async function fetchSelfHostedArtifacts(
  workspaceId: string
): Promise<{
  ok: true;
  entitlement: SelfHostedEntitlement;
  artifacts: SelfHostedArtifact[];
}> {
  return request(`/workspaces/${workspaceId}/self-hosted/artifacts`);
}

function fileNameFromContentDisposition(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return plainMatch?.[1];
}

export async function downloadSelfHostedArtifact(
  workspaceId: string,
  artifactId: string
): Promise<void> {
  const response = await requestBinary(
    `/workspaces/${workspaceId}/self-hosted/artifacts/${encodeURIComponent(artifactId)}/download`
  );
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition");
  const name = fileNameFromContentDisposition(contentDisposition) ?? `roleos-${artifactId}`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

export async function generateSelfHostedConfigTemplate(
  workspaceId: string,
  input: {
    deploymentTarget: "windows" | "linux" | "macos" | "cloud-vm";
    modelApiKey: string;
    modelBaseUrl?: string;
    openClawEndpoint: string;
    openClawApiKey?: string;
    feishuWebhookUrl?: string;
    starterKitId: string;
  }
): Promise<{
  ok: true;
  configTemplate: Record<string, string>;
  envText: string;
  installCommand: string;
}> {
  return request(`/workspaces/${workspaceId}/self-hosted/config-template`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

async function adminRequest<T>(
  path: string,
  adminKey: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("x-roleos-admin-key", adminKey);
  return request<T>(path, {
    ...init,
    headers
  });
}

export async function fetchAdminOverview(
  adminKey: string,
  month?: string
): Promise<{
  ok: true;
  overview: {
    month: string;
    users: number;
    workspaces: number;
    activeSubscriptions: number;
    runs: number;
    runSuccessRate: number;
    usageCostUsd: number;
    variableRevenueUsd: number;
    mrrUsd: number;
    totalEstimatedRevenueUsd: number;
  };
}> {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return adminRequest(`/admin/ops/overview${query}`, adminKey);
}

export async function fetchAdminUsers(
  adminKey: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  ok: true;
  users: Array<{ id: string; email: string; createdAt?: string }>;
}> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return adminRequest(`/admin/users${query}`, adminKey);
}

export async function fetchAdminWorkspaces(
  adminKey: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  ok: true;
  workspaces: Array<{
    id: string;
    name: string;
    createdAt: string;
    subscription: { planCode: string; status: string } | null;
    selfHostedEntitlement: { packageCode: string; status: string } | null;
  }>;
}> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return adminRequest(`/admin/workspaces${query}`, adminKey);
}

export async function fetchAdminOrders(
  adminKey: string,
  options?: { limit?: number; offset?: number; workspaceId?: string; status?: string }
): Promise<{
  ok: true;
  orders: PaymentOrder[];
}> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }
  if (options?.workspaceId) {
    params.set("workspaceId", options.workspaceId);
  }
  if (options?.status) {
    params.set("status", options.status);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return adminRequest(`/admin/orders${query}`, adminKey);
}

export async function fetchAdminRuns(
  adminKey: string,
  options?: { limit?: number; offset?: number; workspaceId?: string }
): Promise<{
  ok: true;
  runs: RunRecordView[];
}> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options?.offset === "number") {
    params.set("offset", String(options.offset));
  }
  if (options?.workspaceId) {
    params.set("workspaceId", options.workspaceId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return adminRequest(`/admin/runs${query}`, adminKey);
}

export async function fetchAdminWorkspaceOverview(
  adminKey: string,
  workspaceId: string,
  month?: string
): Promise<{
  ok: true;
  workspace: { id: string; name: string; createdAt: string };
  state: unknown;
  subscription: WorkspaceSubscription | null;
  usage: CloudUsageSummary;
  selfHostedEntitlement: SelfHostedEntitlement | null;
  runs: RunRecordView[];
  orders: PaymentOrder[];
  audits: Array<{
    id: string;
    workspaceId: string;
    type: string;
    message: string;
    metadataJson?: string;
    createdAt: string;
  }>;
}> {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return adminRequest(`/admin/workspaces/${workspaceId}/overview${query}`, adminKey);
}

export async function updateAdminSelfHostedEntitlement(
  adminKey: string,
  workspaceId: string,
  input: { packageCode: string; status: "inactive" | "active" | "revoked" }
): Promise<{
  ok: true;
  entitlement: SelfHostedEntitlement;
}> {
  return adminRequest(`/admin/workspaces/${workspaceId}/self-hosted/entitlement`, adminKey, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function updateAdminSubscription(
  adminKey: string,
  workspaceId: string,
  input: { planCode?: string; status?: "active" | "past_due" | "paused" | "canceled" }
): Promise<{
  ok: true;
  subscription: WorkspaceSubscription;
}> {
  return adminRequest(`/admin/workspaces/${workspaceId}/subscription`, adminKey, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}
