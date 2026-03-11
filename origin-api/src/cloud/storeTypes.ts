import type { RunRecord } from "../core/types.js";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  createdAt?: string;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceStateRow {
  workspaceId: string;
  defaultRoleId: string;
  defaultKitId: string;
  defaultTeamId: string;
  activeKitId: string;
  modelPolicyName: string;
}

export interface PlanRow {
  code: string;
  name: string;
  monthlyPriceUsd: number;
  monthlyRunLimit: number;
  includedCostUsd: number;
  overageMultiplier: number;
  isActive: boolean;
}

export interface WorkspaceSubscriptionRow {
  workspaceId: string;
  planCode: string;
  status: "active" | "past_due" | "paused" | "canceled";
  startsAt: string;
  renewsAt: string;
  cancelAtPeriodEnd: boolean;
}

export interface WorkspaceSubscriptionWithPlan extends WorkspaceSubscriptionRow {
  plan: PlanRow;
}

export interface MonthlyUsageSummary {
  month: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  totalUsageCostUsd: number;
  totalVariableRevenueUsd: number;
  mrrUsd: number;
  totalEstimatedRevenueUsd: number;
}

export interface OpsOverview {
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
}

export interface PaymentOrderRow {
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

export interface AuditEventRow {
  id: string;
  workspaceId: string;
  type: string;
  message: string;
  metadataJson?: string;
  createdAt: string;
}

export interface SelfHostedEntitlementRow {
  id: string;
  workspaceId: string;
  packageCode: string;
  status: "inactive" | "active" | "revoked";
  orderId?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaybePromise<T> = T | Promise<T>;

export interface CloudStoreLike {
  createUser(email: string, passwordHash: string): MaybePromise<UserRow>;
  getUserById(userId: string): MaybePromise<UserRow | undefined>;
  getUserByEmail(email: string): MaybePromise<UserRow | undefined>;
  listUsers(limit: number, offset: number): MaybePromise<UserRow[]>;

  createWorkspace(name: string): MaybePromise<{ id: string; name: string }>;
  getWorkspace(workspaceId: string): MaybePromise<WorkspaceRow | undefined>;
  listWorkspaces(limit: number, offset: number): MaybePromise<WorkspaceRow[]>;
  addWorkspaceMember(workspaceId: string, userId: string, role: string): MaybePromise<void>;
  isWorkspaceMember(workspaceId: string, userId: string): MaybePromise<boolean>;
  listWorkspacesForUser(userId: string): MaybePromise<Array<{ id: string; name: string }>>;

  setWorkspaceDefaults(
    workspaceId: string,
    defaults: {
      roleId: string;
      kitId: string;
      teamId: string;
      modelPolicyName: string;
    }
  ): MaybePromise<void>;
  getWorkspaceState(workspaceId: string): MaybePromise<WorkspaceStateRow | undefined>;
  activateKit(workspaceId: string, kitId: string): MaybePromise<WorkspaceStateRow>;

  listPlans(): MaybePromise<PlanRow[]>;
  getPlan(code: string): MaybePromise<PlanRow | undefined>;
  ensureWorkspaceSubscription(
    workspaceId: string,
    defaultPlanCode: string
  ): MaybePromise<WorkspaceSubscriptionWithPlan>;
  getWorkspaceSubscription(
    workspaceId: string
  ): MaybePromise<WorkspaceSubscriptionWithPlan | undefined>;
  setWorkspaceSubscriptionPlan(
    workspaceId: string,
    planCode: string
  ): MaybePromise<WorkspaceSubscriptionWithPlan>;
  setWorkspaceSubscriptionStatus(
    workspaceId: string,
    status: WorkspaceSubscriptionRow["status"]
  ): MaybePromise<WorkspaceSubscriptionWithPlan>;
  setWorkspaceSubscriptionPlanAndStatus(
    workspaceId: string,
    planCode: string,
    status: WorkspaceSubscriptionRow["status"]
  ): MaybePromise<WorkspaceSubscriptionWithPlan>;

  insertRun(run: RunRecord): MaybePromise<void>;
  getRun(workspaceId: string, runId: string): MaybePromise<RunRecord | undefined>;
  listRunsForWorkspace(workspaceId: string, limit: number): MaybePromise<RunRecord[]>;
  listRuns(limit: number, offset: number, workspaceId?: string): MaybePromise<RunRecord[]>;
  findRunIdByIdempotencyKey(workspaceId: string, key: string): MaybePromise<string | undefined>;
  saveIdempotencyKey(workspaceId: string, key: string, runId: string): MaybePromise<void>;
  recordRunCharge(
    workspaceId: string,
    runId: string,
    usageCostUsd: number,
    variableRevenueUsd: number
  ): MaybePromise<void>;
  getMonthlyUsage(workspaceId: string, month: string): MaybePromise<MonthlyUsageSummary>;
  getOpsOverview(month: string): MaybePromise<OpsOverview>;

  createPaymentOrder(input: {
    workspaceId: string;
    planCode: string;
    provider: string;
    providerOrderId: string;
    amountUsd: number;
    checkoutUrl: string;
    metadata?: Record<string, string>;
  }): MaybePromise<PaymentOrderRow>;
  updatePaymentOrderStatus(
    orderId: string,
    status: PaymentOrderRow["status"],
    metadata?: Record<string, string>
  ): MaybePromise<PaymentOrderRow>;
  getPaymentOrder(orderId: string): MaybePromise<PaymentOrderRow | undefined>;
  listPaymentOrdersForWorkspace(
    workspaceId: string,
    limit: number
  ): MaybePromise<PaymentOrderRow[]>;
  listPaymentOrders(limit: number, offset: number): MaybePromise<PaymentOrderRow[]>;
  listPendingPaymentOrders(
    olderThanIso: string,
    limit: number
  ): MaybePromise<PaymentOrderRow[]>;

  getSelfHostedEntitlement(
    workspaceId: string
  ): MaybePromise<SelfHostedEntitlementRow | undefined>;
  upsertSelfHostedEntitlement(input: {
    workspaceId: string;
    packageCode: string;
    status: SelfHostedEntitlementRow["status"];
    orderId?: string;
  }): MaybePromise<SelfHostedEntitlementRow>;

  listAuditEvents(workspaceId: string, limit: number): MaybePromise<AuditEventRow[]>;
  addAuditEvent(
    workspaceId: string,
    type: string,
    message: string,
    metadata?: Record<string, string>
  ): MaybePromise<void>;
}

