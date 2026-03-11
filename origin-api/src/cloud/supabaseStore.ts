import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunRecord } from "../core/types.js";
import { nowIso } from "../utils/time.js";
import type {
  AuditEventRow,
  CloudStoreLike,
  MonthlyUsageSummary,
  OpsOverview,
  PaymentOrderRow,
  PlanRow,
  SelfHostedEntitlementRow,
  UserRow,
  WorkspaceRow,
  WorkspaceStateRow,
  WorkspaceSubscriptionRow,
  WorkspaceSubscriptionWithPlan
} from "./storeTypes.js";

function addDaysIso(days: number): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function asMonth(iso: string): string {
  return iso.slice(0, 7);
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

function monthRange(month: string): { from: string; to: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error("Invalid month format, expected YYYY-MM.");
  }
  const year = Number(match[1]);
  const mon = Number(match[2]);
  const from = new Date(Date.UTC(year, mon - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, mon, 1)).toISOString();
  return { from, to };
}

function ensureNoError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function mapRunData(row: Record<string, unknown>): RunRecord {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    source: row.source as "self-hosted" | "cloud",
    roleId: row.role_id as string,
    kitId: row.kit_id as string,
    teamId: (row.team_id as string | null) ?? undefined,
    input: row.input as string,
    output: row.output as string,
    status: row.status as "success" | "failed",
    retryCount: Number(row.retry_count),
    cost: Number(row.cost),
    trace: (row.trace_json as string[]) ?? [],
    error: (row.error as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapPaymentOrderData(row: Record<string, unknown>): PaymentOrderRow {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    planCode: row.plan_code as string,
    provider: row.provider as string,
    providerOrderId: row.provider_order_id as string,
    amountUsd: Number(row.amount_usd),
    status: row.status as PaymentOrderRow["status"],
    checkoutUrl: row.checkout_url as string,
    metadataJson: (row.metadata_json as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

export class SupabaseCloudStore implements CloudStoreLike {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });
  }

  async createUser(email: string, passwordHash: string): Promise<UserRow> {
    const row = {
      id: randomUUID(),
      email,
      password_hash: passwordHash,
      created_at: nowIso()
    };
    ensureNoError(await this.client.from("users").insert(row));
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }

  async getUserById(userId: string): Promise<UserRow | undefined> {
    const result = await this.client
      .from("users")
      .select("id,email,password_hash,created_at")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      id: result.data.id as string,
      email: result.data.email as string,
      passwordHash: result.data.password_hash as string,
      createdAt: result.data.created_at as string
    };
  }

  async getUserByEmail(email: string): Promise<UserRow | undefined> {
    const result = await this.client
      .from("users")
      .select("id,email,password_hash,created_at")
      .eq("email", email)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      id: result.data.id as string,
      email: result.data.email as string,
      passwordHash: result.data.password_hash as string,
      createdAt: result.data.created_at as string
    };
  }

  async listUsers(limit: number, offset: number): Promise<UserRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const result = await this.client
      .from("users")
      .select("id,email,password_hash,created_at")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);
    const rows = ensureNoError(result) as Array<{
      id: string;
      email: string;
      password_hash: string;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    }));
  }

  async createWorkspace(name: string): Promise<{ id: string; name: string }> {
    const row = {
      id: randomUUID(),
      name,
      created_at: nowIso()
    };
    ensureNoError(await this.client.from("workspaces").insert(row));
    return {
      id: row.id,
      name: row.name
    };
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceRow | undefined> {
    const result = await this.client
      .from("workspaces")
      .select("id,name,created_at")
      .eq("id", workspaceId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      id: result.data.id as string,
      name: result.data.name as string,
      createdAt: result.data.created_at as string
    };
  }

  async listWorkspaces(limit: number, offset: number): Promise<WorkspaceRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const result = await this.client
      .from("workspaces")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);
    const rows = ensureNoError(result) as Array<{
      id: string;
      name: string;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at
    }));
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role: string): Promise<void> {
    ensureNoError(
      await this.client.from("workspace_members").upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          role,
          created_at: nowIso()
        },
        {
          onConflict: "workspace_id,user_id"
        }
      )
    );
  }

  async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const result = await this.client
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return Boolean(result.data);
  }

  async listWorkspacesForUser(userId: string): Promise<Array<{ id: string; name: string }>> {
    const members = await this.client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);
    const memberRows = ensureNoError(members) as Array<{ workspace_id: string }>;
    const ids = memberRows.map((row) => row.workspace_id);
    if (ids.length === 0) {
      return [];
    }

    const workspaces = await this.client.from("workspaces").select("id,name").in("id", ids);
    return (ensureNoError(workspaces) as Array<{ id: string; name: string }>).map((row) => ({
      id: row.id,
      name: row.name
    }));
  }

  async setWorkspaceDefaults(
    workspaceId: string,
    defaults: {
      roleId: string;
      kitId: string;
      teamId: string;
      modelPolicyName: string;
    }
  ): Promise<void> {
    ensureNoError(
      await this.client.from("workspace_state").upsert(
        {
          workspace_id: workspaceId,
          default_role_id: defaults.roleId,
          default_kit_id: defaults.kitId,
          default_team_id: defaults.teamId,
          active_kit_id: defaults.kitId,
          model_policy_name: defaults.modelPolicyName
        },
        {
          onConflict: "workspace_id"
        }
      )
    );
  }

  async getWorkspaceState(workspaceId: string): Promise<WorkspaceStateRow | undefined> {
    const result = await this.client
      .from("workspace_state")
      .select(
        "workspace_id,default_role_id,default_kit_id,default_team_id,active_kit_id,model_policy_name"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      workspaceId: result.data.workspace_id as string,
      defaultRoleId: result.data.default_role_id as string,
      defaultKitId: result.data.default_kit_id as string,
      defaultTeamId: result.data.default_team_id as string,
      activeKitId: result.data.active_kit_id as string,
      modelPolicyName: result.data.model_policy_name as string
    };
  }

  async activateKit(workspaceId: string, kitId: string): Promise<WorkspaceStateRow> {
    ensureNoError(
      await this.client
        .from("workspace_state")
        .update({
          active_kit_id: kitId
        })
        .eq("workspace_id", workspaceId)
    );
    const state = await this.getWorkspaceState(workspaceId);
    if (!state) {
      throw new Error("Workspace state not found.");
    }
    return state;
  }

  async listPlans(): Promise<PlanRow[]> {
    const result = await this.client
      .from("plans")
      .select(
        "code,name,monthly_price_usd,monthly_run_limit,included_cost_usd,overage_multiplier,is_active"
      )
      .order("monthly_price_usd", { ascending: true });
    const rows = ensureNoError(result) as Array<{
      code: string;
      name: string;
      monthly_price_usd: number;
      monthly_run_limit: number;
      included_cost_usd: number;
      overage_multiplier: number;
      is_active: boolean | number;
    }>;
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      monthlyPriceUsd: Number(row.monthly_price_usd),
      monthlyRunLimit: Number(row.monthly_run_limit),
      includedCostUsd: Number(row.included_cost_usd),
      overageMultiplier: Number(row.overage_multiplier),
      isActive: row.is_active === true || row.is_active === 1
    }));
  }

  async getPlan(code: string): Promise<PlanRow | undefined> {
    const result = await this.client
      .from("plans")
      .select(
        "code,name,monthly_price_usd,monthly_run_limit,included_cost_usd,overage_multiplier,is_active"
      )
      .eq("code", code)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      code: result.data.code as string,
      name: result.data.name as string,
      monthlyPriceUsd: Number(result.data.monthly_price_usd),
      monthlyRunLimit: Number(result.data.monthly_run_limit),
      includedCostUsd: Number(result.data.included_cost_usd),
      overageMultiplier: Number(result.data.overage_multiplier),
      isActive: result.data.is_active === true || result.data.is_active === 1
    };
  }

  async ensureWorkspaceSubscription(
    workspaceId: string,
    defaultPlanCode: string
  ): Promise<WorkspaceSubscriptionWithPlan> {
    const existing = await this.getWorkspaceSubscription(workspaceId);
    if (existing) {
      return existing;
    }
    const plan = await this.getPlan(defaultPlanCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Default plan ${defaultPlanCode} is unavailable.`);
    }
    const now = nowIso();
    ensureNoError(
      await this.client.from("workspace_subscriptions").insert({
        workspace_id: workspaceId,
        plan_code: plan.code,
        status: "active",
        starts_at: now,
        renews_at: addDaysIso(30),
        cancel_at_period_end: false,
        created_at: now,
        updated_at: now
      })
    );
    const created = await this.getWorkspaceSubscription(workspaceId);
    if (!created) {
      throw new Error("Workspace subscription creation failed.");
    }
    return created;
  }

  async setWorkspaceSubscriptionPlan(
    workspaceId: string,
    planCode: string
  ): Promise<WorkspaceSubscriptionWithPlan> {
    const plan = await this.getPlan(planCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Plan ${planCode} is unavailable.`);
    }
    ensureNoError(
      await this.client
        .from("workspace_subscriptions")
        .update({
          plan_code: planCode,
          status: "active",
          updated_at: nowIso()
        })
        .eq("workspace_id", workspaceId)
    );
    const updated = await this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Subscription not found.");
    }
    return updated;
  }

  async setWorkspaceSubscriptionStatus(
    workspaceId: string,
    status: WorkspaceSubscriptionRow["status"]
  ): Promise<WorkspaceSubscriptionWithPlan> {
    ensureNoError(
      await this.client
        .from("workspace_subscriptions")
        .update({
          status,
          updated_at: nowIso()
        })
        .eq("workspace_id", workspaceId)
    );
    const updated = await this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Subscription not found.");
    }
    return updated;
  }

  async setWorkspaceSubscriptionPlanAndStatus(
    workspaceId: string,
    planCode: string,
    status: WorkspaceSubscriptionRow["status"]
  ): Promise<WorkspaceSubscriptionWithPlan> {
    const plan = await this.getPlan(planCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Plan ${planCode} is unavailable.`);
    }
    ensureNoError(
      await this.client
        .from("workspace_subscriptions")
        .update({
          plan_code: planCode,
          status,
          updated_at: nowIso()
        })
        .eq("workspace_id", workspaceId)
    );
    const updated = await this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Subscription not found.");
    }
    return updated;
  }

  async getWorkspaceSubscription(
    workspaceId: string
  ): Promise<WorkspaceSubscriptionWithPlan | undefined> {
    const result = await this.client
      .from("workspace_subscriptions")
      .select("workspace_id,plan_code,status,starts_at,renews_at,cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    const plan = await this.getPlan(result.data.plan_code as string);
    if (!plan) {
      throw new Error(`Plan missing for subscription: ${String(result.data.plan_code)}`);
    }
    return {
      workspaceId: result.data.workspace_id as string,
      planCode: result.data.plan_code as string,
      status: result.data.status as WorkspaceSubscriptionRow["status"],
      startsAt: result.data.starts_at as string,
      renewsAt: result.data.renews_at as string,
      cancelAtPeriodEnd:
        result.data.cancel_at_period_end === true || result.data.cancel_at_period_end === 1,
      plan
    };
  }

  async insertRun(run: RunRecord): Promise<void> {
    ensureNoError(
      await this.client.from("runs").insert({
        id: run.id,
        workspace_id: run.workspaceId,
        source: run.source,
        role_id: run.roleId,
        kit_id: run.kitId,
        team_id: run.teamId ?? null,
        input: run.input,
        output: run.output,
        status: run.status,
        retry_count: run.retryCount,
        cost: run.cost,
        trace_json: run.trace,
        error: run.error ?? null,
        created_at: run.createdAt,
        updated_at: run.updatedAt
      })
    );
  }

  async getRun(workspaceId: string, runId: string): Promise<RunRecord | undefined> {
    const result = await this.client
      .from("runs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", runId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return mapRunData(result.data as Record<string, unknown>);
  }

  async listRunsForWorkspace(workspaceId: string, limit: number): Promise<RunRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const result = await this.client
      .from("runs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    const rows = ensureNoError(result) as Array<Record<string, unknown>>;
    return rows.map((row) => mapRunData(row));
  }

  async listRuns(limit: number, offset: number, workspaceId?: string): Promise<RunRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    let query = this.client
      .from("runs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const result = await query;
    const rows = ensureNoError(result) as Array<Record<string, unknown>>;
    return rows.map((row) => mapRunData(row));
  }

  async findRunIdByIdempotencyKey(workspaceId: string, key: string): Promise<string | undefined> {
    const result = await this.client
      .from("idempotency_keys")
      .select("run_id")
      .eq("workspace_id", workspaceId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data?.run_id as string | undefined) ?? undefined;
  }

  async saveIdempotencyKey(workspaceId: string, key: string, runId: string): Promise<void> {
    ensureNoError(
      await this.client.from("idempotency_keys").upsert(
        {
          workspace_id: workspaceId,
          idempotency_key: key,
          run_id: runId,
          created_at: nowIso()
        },
        {
          onConflict: "workspace_id,idempotency_key"
        }
      )
    );
  }

  async recordRunCharge(
    workspaceId: string,
    runId: string,
    usageCostUsd: number,
    variableRevenueUsd: number
  ): Promise<void> {
    ensureNoError(
      await this.client.from("billing_charges").insert({
        id: randomUUID(),
        workspace_id: workspaceId,
        run_id: runId,
        charge_month: asMonth(nowIso()),
        usage_cost_usd: roundUsd(usageCostUsd),
        variable_revenue_usd: roundUsd(variableRevenueUsd),
        charged_at: nowIso()
      })
    );
  }

  async getMonthlyUsage(workspaceId: string, month: string): Promise<MonthlyUsageSummary> {
    const range = monthRange(month);
    const runsResult = await this.client
      .from("runs")
      .select("status,cost")
      .eq("workspace_id", workspaceId)
      .gte("created_at", range.from)
      .lt("created_at", range.to);
    const runs = ensureNoError(runsResult) as Array<{ status: string; cost: number }>;

    const chargesResult = await this.client
      .from("billing_charges")
      .select("variable_revenue_usd")
      .eq("workspace_id", workspaceId)
      .eq("charge_month", month);
    const charges = ensureNoError(chargesResult) as Array<{ variable_revenue_usd: number }>;

    const totalRuns = runs.length;
    const successRuns = runs.filter((item) => item.status === "success").length;
    const failedRuns = runs.filter((item) => item.status === "failed").length;
    const totalUsageCostUsd = roundUsd(
      runs.reduce((sum, item) => sum + Number(item.cost ?? 0), 0)
    );
    const totalVariableRevenueUsd = roundUsd(
      charges.reduce((sum, item) => sum + Number(item.variable_revenue_usd ?? 0), 0)
    );

    const subscription = await this.getWorkspaceSubscription(workspaceId);
    const mrrUsd = subscription?.status === "active" ? subscription.plan.monthlyPriceUsd : 0;
    const totalEstimatedRevenueUsd = roundUsd(mrrUsd + totalVariableRevenueUsd);

    return {
      month,
      totalRuns,
      successRuns,
      failedRuns,
      totalUsageCostUsd,
      totalVariableRevenueUsd,
      mrrUsd,
      totalEstimatedRevenueUsd
    };
  }

  async getOpsOverview(month: string): Promise<OpsOverview> {
    const usersCountRes = await this.client.from("users").select("*", { count: "exact", head: true });
    if (usersCountRes.error) {
      throw new Error(usersCountRes.error.message);
    }
    const workspacesCountRes = await this.client
      .from("workspaces")
      .select("*", { count: "exact", head: true });
    if (workspacesCountRes.error) {
      throw new Error(workspacesCountRes.error.message);
    }
    const activeSubscriptionsRes = await this.client
      .from("workspace_subscriptions")
      .select("plan_code", { count: "exact" })
      .eq("status", "active");
    const activeSubscriptionsRows = ensureNoError(activeSubscriptionsRes) as Array<{ plan_code: string }>;

    let mrrUsd = 0;
    if (activeSubscriptionsRows.length > 0) {
      const codes = Array.from(new Set(activeSubscriptionsRows.map((item) => item.plan_code)));
      const plansRes = await this.client
        .from("plans")
        .select("code,monthly_price_usd")
        .in("code", codes);
      const plans = ensureNoError(plansRes) as Array<{ code: string; monthly_price_usd: number }>;
      const priceMap = new Map(plans.map((plan) => [plan.code, Number(plan.monthly_price_usd)]));
      mrrUsd = activeSubscriptionsRows.reduce(
        (sum, item) => sum + (priceMap.get(item.plan_code) ?? 0),
        0
      );
    }

    const range = monthRange(month);
    const runsRes = await this.client
      .from("runs")
      .select("status,cost")
      .gte("created_at", range.from)
      .lt("created_at", range.to);
    const runs = ensureNoError(runsRes) as Array<{ status: string; cost: number }>;

    const chargesRes = await this.client
      .from("billing_charges")
      .select("variable_revenue_usd")
      .eq("charge_month", month);
    const charges = ensureNoError(chargesRes) as Array<{ variable_revenue_usd: number }>;

    const totalRuns = runs.length;
    const successRuns = runs.filter((item) => item.status === "success").length;
    const usageCostUsd = roundUsd(runs.reduce((sum, item) => sum + Number(item.cost ?? 0), 0));
    const variableRevenueUsd = roundUsd(
      charges.reduce((sum, item) => sum + Number(item.variable_revenue_usd ?? 0), 0)
    );
    const runSuccessRate =
      totalRuns === 0 ? 0 : Number(((successRuns / totalRuns) * 100).toFixed(2));
    const roundedMrr = roundUsd(mrrUsd);
    const totalEstimatedRevenueUsd = roundUsd(roundedMrr + variableRevenueUsd);

    return {
      month,
      users: usersCountRes.count ?? 0,
      workspaces: workspacesCountRes.count ?? 0,
      activeSubscriptions: activeSubscriptionsRes.count ?? 0,
      runs: totalRuns,
      runSuccessRate,
      usageCostUsd,
      variableRevenueUsd,
      mrrUsd: roundedMrr,
      totalEstimatedRevenueUsd
    };
  }

  async createPaymentOrder(input: {
    workspaceId: string;
    planCode: string;
    provider: string;
    providerOrderId: string;
    amountUsd: number;
    checkoutUrl: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentOrderRow> {
    const row = {
      id: randomUUID(),
      workspace_id: input.workspaceId,
      plan_code: input.planCode,
      provider: input.provider,
      provider_order_id: input.providerOrderId,
      amount_usd: input.amountUsd,
      status: "pending",
      checkout_url: input.checkoutUrl,
      metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    ensureNoError(await this.client.from("payment_orders").insert(row));
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      planCode: row.plan_code,
      provider: row.provider,
      providerOrderId: row.provider_order_id,
      amountUsd: row.amount_usd,
      status: row.status as PaymentOrderRow["status"],
      checkoutUrl: row.checkout_url,
      metadataJson: row.metadata_json ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updatePaymentOrderStatus(
    orderId: string,
    status: PaymentOrderRow["status"],
    metadata?: Record<string, string>
  ): Promise<PaymentOrderRow> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: nowIso()
    };
    if (metadata) {
      updates.metadata_json = JSON.stringify(metadata);
    }
    ensureNoError(
      await this.client.from("payment_orders").update(updates).eq("id", orderId)
    );
    const order = await this.getPaymentOrder(orderId);
    if (!order) {
      throw new Error("Payment order not found.");
    }
    return order;
  }

  async getPaymentOrder(orderId: string): Promise<PaymentOrderRow | undefined> {
    const result = await this.client.from("payment_orders").select("*").eq("id", orderId).maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return mapPaymentOrderData(result.data as Record<string, unknown>);
  }

  async listPaymentOrdersForWorkspace(
    workspaceId: string,
    limit: number
  ): Promise<PaymentOrderRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const result = await this.client
      .from("payment_orders")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    const rows = ensureNoError(result) as Array<Record<string, unknown>>;
    return rows.map((row) => mapPaymentOrderData(row));
  }

  async listPaymentOrders(limit: number, offset: number): Promise<PaymentOrderRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const result = await this.client
      .from("payment_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);
    const rows = ensureNoError(result) as Array<Record<string, unknown>>;
    return rows.map((row) => mapPaymentOrderData(row));
  }

  async listPendingPaymentOrders(
    olderThanIso: string,
    limit: number
  ): Promise<PaymentOrderRow[]> {
    const result = await this.client
      .from("payment_orders")
      .select("*")
      .eq("status", "pending")
      .lte("created_at", olderThanIso)
      .order("created_at", { ascending: true })
      .limit(limit);
    const rows = ensureNoError(result) as Array<Record<string, unknown>>;
    return rows.map((row) => mapPaymentOrderData(row));
  }

  async getSelfHostedEntitlement(
    workspaceId: string
  ): Promise<SelfHostedEntitlementRow | undefined> {
    const result = await this.client
      .from("self_hosted_entitlements")
      .select(
        "id,workspace_id,package_code,status,order_id,activated_at,created_at,updated_at"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      return undefined;
    }
    return {
      id: result.data.id as string,
      workspaceId: result.data.workspace_id as string,
      packageCode: result.data.package_code as string,
      status: result.data.status as SelfHostedEntitlementRow["status"],
      orderId: (result.data.order_id as string | null) ?? undefined,
      activatedAt: (result.data.activated_at as string | null) ?? undefined,
      createdAt: result.data.created_at as string,
      updatedAt: result.data.updated_at as string
    };
  }

  async upsertSelfHostedEntitlement(input: {
    workspaceId: string;
    packageCode: string;
    status: SelfHostedEntitlementRow["status"];
    orderId?: string;
  }): Promise<SelfHostedEntitlementRow> {
    const now = nowIso();
    const existing = await this.getSelfHostedEntitlement(input.workspaceId);
    const activatedAt =
      input.status === "active" ? existing?.activatedAt ?? now : existing?.activatedAt ?? null;

    if (!existing) {
      const row = {
        id: randomUUID(),
        workspace_id: input.workspaceId,
        package_code: input.packageCode,
        status: input.status,
        order_id: input.orderId ?? null,
        activated_at: activatedAt,
        created_at: now,
        updated_at: now
      };
      ensureNoError(await this.client.from("self_hosted_entitlements").insert(row));
    } else {
      ensureNoError(
        await this.client
          .from("self_hosted_entitlements")
          .update({
            package_code: input.packageCode,
            status: input.status,
            order_id: input.orderId ?? existing.orderId ?? null,
            activated_at: activatedAt,
            updated_at: now
          })
          .eq("workspace_id", input.workspaceId)
      );
    }

    const updated = await this.getSelfHostedEntitlement(input.workspaceId);
    if (!updated) {
      throw new Error("Failed to persist self-hosted entitlement.");
    }
    return updated;
  }

  async listAuditEvents(workspaceId: string, limit: number): Promise<AuditEventRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const result = await this.client
      .from("audit_events")
      .select("id,workspace_id,type,message,metadata_json,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    const rows = ensureNoError(result) as Array<{
      id: string;
      workspace_id: string;
      type: string;
      message: string;
      metadata_json: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      type: row.type,
      message: row.message,
      metadataJson: row.metadata_json ?? undefined,
      createdAt: row.created_at
    }));
  }

  async addAuditEvent(
    workspaceId: string,
    type: string,
    message: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    ensureNoError(
      await this.client.from("audit_events").insert({
        id: randomUUID(),
        workspace_id: workspaceId,
        type,
        message,
        metadata_json: metadata ? JSON.stringify(metadata) : null,
        created_at: nowIso()
      })
    );
  }
}
