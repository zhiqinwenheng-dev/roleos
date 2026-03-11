import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
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

interface RunRow {
  id: string;
  workspace_id: string;
  source: "self-hosted" | "cloud";
  role_id: string;
  kit_id: string;
  team_id: string | null;
  input: string;
  output: string;
  status: "success" | "failed";
  retry_count: number;
  cost: number;
  trace_json: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function mapRunRow(row: RunRow): RunRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    source: row.source,
    roleId: row.role_id,
    kitId: row.kit_id,
    teamId: row.team_id ?? undefined,
    input: row.input,
    output: row.output,
    status: row.status,
    retryCount: row.retry_count,
    cost: row.cost,
    trace: JSON.parse(row.trace_json) as string[],
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface PaymentOrderDbRow {
  id: string;
  workspace_id: string;
  plan_code: string;
  provider: string;
  provider_order_id: string;
  amount_usd: number;
  status: PaymentOrderRow["status"];
  checkout_url: string;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

function mapPaymentOrderRow(row: PaymentOrderDbRow): PaymentOrderRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    planCode: row.plan_code,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    amountUsd: row.amount_usd,
    status: row.status,
    checkoutUrl: row.checkout_url,
    metadataJson: row.metadata_json ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const defaultPlans: PlanRow[] = [
  {
    code: "trial",
    name: "Trial",
    monthlyPriceUsd: 0,
    monthlyRunLimit: 3,
    includedCostUsd: 0.2,
    overageMultiplier: 2,
    isActive: true
  },
  {
    code: "starter",
    name: "Starter",
    monthlyPriceUsd: 29,
    monthlyRunLimit: 800,
    includedCostUsd: 6,
    overageMultiplier: 1.6,
    isActive: true
  },
  {
    code: "pro",
    name: "Pro",
    monthlyPriceUsd: 199,
    monthlyRunLimit: 6000,
    includedCostUsd: 40,
    overageMultiplier: 1.4,
    isActive: true
  },
  {
    code: "business",
    name: "Business",
    monthlyPriceUsd: 799,
    monthlyRunLimit: 50000,
    includedCostUsd: 300,
    overageMultiplier: 1.25,
    isActive: true
  },
  {
    code: "enterprise",
    name: "Enterprise",
    monthlyPriceUsd: 2499,
    monthlyRunLimit: 500000,
    includedCostUsd: 1800,
    overageMultiplier: 1.1,
    isActive: true
  },
  {
    code: "rs-self-hosted",
    name: "RS Self-Hosted",
    monthlyPriceUsd: 199,
    monthlyRunLimit: 0,
    includedCostUsd: 0,
    overageMultiplier: 1,
    isActive: false
  }
];

export class CloudStore implements CloudStoreLike {
  constructor(private readonly db: DatabaseSync) {
    this.init();
    this.seedPlans();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, user_id)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_state (
        workspace_id TEXT PRIMARY KEY,
        default_role_id TEXT NOT NULL,
        default_kit_id TEXT NOT NULL,
        default_team_id TEXT NOT NULL,
        active_kit_id TEXT NOT NULL,
        model_policy_name TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_price_usd REAL NOT NULL,
        monthly_run_limit INTEGER NOT NULL,
        included_cost_usd REAL NOT NULL,
        overage_multiplier REAL NOT NULL,
        is_active INTEGER NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_subscriptions (
        workspace_id TEXT PRIMARY KEY,
        plan_code TEXT NOT NULL,
        status TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        renews_at TEXT NOT NULL,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        source TEXT NOT NULL,
        role_id TEXT NOT NULL,
        kit_id TEXT NOT NULL,
        team_id TEXT,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        cost REAL NOT NULL,
        trace_json TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS billing_charges (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        charge_month TEXT NOT NULL,
        usage_cost_usd REAL NOT NULL,
        variable_revenue_usd REAL NOT NULL,
        charged_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        workspace_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        run_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, idempotency_key)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        plan_code TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_order_id TEXT NOT NULL,
        amount_usd REAL NOT NULL,
        status TEXT NOT NULL,
        checkout_url TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS self_hosted_entitlements (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL UNIQUE,
        package_code TEXT NOT NULL,
        status TEXT NOT NULL,
        order_id TEXT,
        activated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_runs_workspace_created_at
      ON runs (workspace_id, created_at);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_billing_charges_workspace_month
      ON billing_charges (workspace_id, charge_month);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created_at
      ON payment_orders (status, created_at);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_self_hosted_entitlements_workspace
      ON self_hosted_entitlements (workspace_id);
    `);
  }

  private seedPlans(): void {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM plans`)
      .get() as { count: number };
    if (row.count > 0) {
      return;
    }

    const statement = this.db.prepare(`
      INSERT INTO plans (
        code, name, monthly_price_usd, monthly_run_limit,
        included_cost_usd, overage_multiplier, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const plan of defaultPlans) {
      statement.run(
        plan.code,
        plan.name,
        plan.monthlyPriceUsd,
        plan.monthlyRunLimit,
        plan.includedCostUsd,
        plan.overageMultiplier,
        plan.isActive ? 1 : 0
      );
    }
  }

  createUser(email: string, passwordHash: string): UserRow {
    const createdAt = nowIso();
    const user: UserRow = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt
    };
    this.db
      .prepare(
        `
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(user.id, user.email, user.passwordHash, createdAt);
    return user;
  }

  getUserById(userId: string): UserRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE id = ?
    `
      )
      .get(userId) as
      | {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }

  getUserByEmail(email: string): UserRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE email = ?
    `
      )
      .get(email) as
      | {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }

  listUsers(limit: number, offset: number): UserRow[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const rows = this.db
      .prepare(
        `
      SELECT id, email, password_hash, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(safeLimit, safeOffset) as Array<{
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

  createWorkspace(name: string): { id: string; name: string } {
    const workspace = { id: randomUUID(), name };
    this.db
      .prepare(
        `
      INSERT INTO workspaces (id, name, created_at)
      VALUES (?, ?, ?)
    `
      )
      .run(workspace.id, workspace.name, nowIso());
    return workspace;
  }

  getWorkspace(workspaceId: string): WorkspaceRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT id, name, created_at
      FROM workspaces
      WHERE id = ?
    `
      )
      .get(workspaceId) as
      | {
          id: string;
          name: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at
    };
  }

  listWorkspaces(limit: number, offset: number): WorkspaceRow[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const rows = this.db
      .prepare(
        `
      SELECT id, name, created_at
      FROM workspaces
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(safeLimit, safeOffset) as Array<{
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

  addWorkspaceMember(workspaceId: string, userId: string, role: string): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(workspaceId, userId, role, nowIso());
  }

  isWorkspaceMember(workspaceId: string, userId: string): boolean {
    const row = this.db
      .prepare(
        `
      SELECT workspace_id FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `
      )
      .get(workspaceId, userId) as { workspace_id: string } | undefined;
    return Boolean(row);
  }

  listWorkspacesForUser(userId: string): Array<{ id: string; name: string }> {
    return this.db
      .prepare(
        `
      SELECT w.id, w.name
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at ASC
    `
      )
      .all(userId) as Array<{ id: string; name: string }>;
  }

  setWorkspaceDefaults(
    workspaceId: string,
    defaults: {
      roleId: string;
      kitId: string;
      teamId: string;
      modelPolicyName: string;
    }
  ): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO workspace_state
        (workspace_id, default_role_id, default_kit_id, default_team_id, active_kit_id, model_policy_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        workspaceId,
        defaults.roleId,
        defaults.kitId,
        defaults.teamId,
        defaults.kitId,
        defaults.modelPolicyName
      );
  }

  getWorkspaceState(workspaceId: string): WorkspaceStateRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        workspace_id,
        default_role_id,
        default_kit_id,
        default_team_id,
        active_kit_id,
        model_policy_name
      FROM workspace_state
      WHERE workspace_id = ?
    `
      )
      .get(workspaceId) as
      | {
          workspace_id: string;
          default_role_id: string;
          default_kit_id: string;
          default_team_id: string;
          active_kit_id: string;
          model_policy_name: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      workspaceId: row.workspace_id,
      defaultRoleId: row.default_role_id,
      defaultKitId: row.default_kit_id,
      defaultTeamId: row.default_team_id,
      activeKitId: row.active_kit_id,
      modelPolicyName: row.model_policy_name
    };
  }

  activateKit(workspaceId: string, kitId: string): WorkspaceStateRow {
    this.db
      .prepare(
        `
      UPDATE workspace_state
      SET active_kit_id = ?
      WHERE workspace_id = ?
    `
      )
      .run(kitId, workspaceId);

    const state = this.getWorkspaceState(workspaceId);
    if (!state) {
      throw new Error(`Workspace state missing for ${workspaceId}`);
    }
    return state;
  }

  listPlans(): PlanRow[] {
    const rows = this.db
      .prepare(
        `
      SELECT
        code,
        name,
        monthly_price_usd,
        monthly_run_limit,
        included_cost_usd,
        overage_multiplier,
        is_active
      FROM plans
      ORDER BY monthly_price_usd ASC
    `
      )
      .all() as Array<{
      code: string;
      name: string;
      monthly_price_usd: number;
      monthly_run_limit: number;
      included_cost_usd: number;
      overage_multiplier: number;
      is_active: number;
    }>;

    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      monthlyPriceUsd: row.monthly_price_usd,
      monthlyRunLimit: row.monthly_run_limit,
      includedCostUsd: row.included_cost_usd,
      overageMultiplier: row.overage_multiplier,
      isActive: row.is_active === 1
    }));
  }

  getPlan(code: string): PlanRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        code,
        name,
        monthly_price_usd,
        monthly_run_limit,
        included_cost_usd,
        overage_multiplier,
        is_active
      FROM plans
      WHERE code = ?
    `
      )
      .get(code) as
      | {
          code: string;
          name: string;
          monthly_price_usd: number;
          monthly_run_limit: number;
          included_cost_usd: number;
          overage_multiplier: number;
          is_active: number;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      code: row.code,
      name: row.name,
      monthlyPriceUsd: row.monthly_price_usd,
      monthlyRunLimit: row.monthly_run_limit,
      includedCostUsd: row.included_cost_usd,
      overageMultiplier: row.overage_multiplier,
      isActive: row.is_active === 1
    };
  }

  ensureWorkspaceSubscription(
    workspaceId: string,
    defaultPlanCode: string
  ): WorkspaceSubscriptionWithPlan {
    const existing = this.getWorkspaceSubscription(workspaceId);
    if (existing) {
      return existing;
    }
    const plan = this.getPlan(defaultPlanCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Default plan ${defaultPlanCode} is unavailable.`);
    }

    const now = nowIso();
    this.db
      .prepare(
        `
      INSERT INTO workspace_subscriptions (
        workspace_id, plan_code, status, starts_at, renews_at, cancel_at_period_end, created_at, updated_at
      )
      VALUES (?, ?, 'active', ?, ?, 0, ?, ?)
    `
      )
      .run(workspaceId, plan.code, now, addDaysIso(30), now, now);

    const created = this.getWorkspaceSubscription(workspaceId);
    if (!created) {
      throw new Error("Failed to create workspace subscription.");
    }
    return created;
  }

  setWorkspaceSubscriptionPlan(
    workspaceId: string,
    planCode: string
  ): WorkspaceSubscriptionWithPlan {
    const plan = this.getPlan(planCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Plan ${planCode} is unavailable.`);
    }

    const now = nowIso();
    this.db
      .prepare(
        `
      UPDATE workspace_subscriptions
      SET plan_code = ?, status = 'active', updated_at = ?
      WHERE workspace_id = ?
    `
      )
      .run(plan.code, now, workspaceId);

    const updated = this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Workspace subscription not found.");
    }
    return updated;
  }

  setWorkspaceSubscriptionStatus(
    workspaceId: string,
    status: WorkspaceSubscriptionRow["status"]
  ): WorkspaceSubscriptionWithPlan {
    const now = nowIso();
    this.db
      .prepare(
        `
      UPDATE workspace_subscriptions
      SET status = ?, updated_at = ?
      WHERE workspace_id = ?
    `
      )
      .run(status, now, workspaceId);

    const updated = this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Workspace subscription not found.");
    }
    return updated;
  }

  setWorkspaceSubscriptionPlanAndStatus(
    workspaceId: string,
    planCode: string,
    status: WorkspaceSubscriptionRow["status"]
  ): WorkspaceSubscriptionWithPlan {
    const plan = this.getPlan(planCode);
    if (!plan || !plan.isActive) {
      throw new Error(`Plan ${planCode} is unavailable.`);
    }
    const now = nowIso();
    this.db
      .prepare(
        `
      UPDATE workspace_subscriptions
      SET plan_code = ?, status = ?, updated_at = ?
      WHERE workspace_id = ?
    `
      )
      .run(plan.code, status, now, workspaceId);

    const updated = this.getWorkspaceSubscription(workspaceId);
    if (!updated) {
      throw new Error("Workspace subscription not found.");
    }
    return updated;
  }

  getWorkspaceSubscription(workspaceId: string): WorkspaceSubscriptionWithPlan | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        ws.workspace_id,
        ws.plan_code,
        ws.status,
        ws.starts_at,
        ws.renews_at,
        ws.cancel_at_period_end,
        p.code,
        p.name,
        p.monthly_price_usd,
        p.monthly_run_limit,
        p.included_cost_usd,
        p.overage_multiplier,
        p.is_active
      FROM workspace_subscriptions ws
      JOIN plans p ON p.code = ws.plan_code
      WHERE ws.workspace_id = ?
    `
      )
      .get(workspaceId) as
      | {
          workspace_id: string;
          plan_code: string;
          status: WorkspaceSubscriptionRow["status"];
          starts_at: string;
          renews_at: string;
          cancel_at_period_end: number;
          code: string;
          name: string;
          monthly_price_usd: number;
          monthly_run_limit: number;
          included_cost_usd: number;
          overage_multiplier: number;
          is_active: number;
        }
      | undefined;

    if (!row) {
      return undefined;
    }
    return {
      workspaceId: row.workspace_id,
      planCode: row.plan_code,
      status: row.status,
      startsAt: row.starts_at,
      renewsAt: row.renews_at,
      cancelAtPeriodEnd: row.cancel_at_period_end === 1,
      plan: {
        code: row.code,
        name: row.name,
        monthlyPriceUsd: row.monthly_price_usd,
        monthlyRunLimit: row.monthly_run_limit,
        includedCostUsd: row.included_cost_usd,
        overageMultiplier: row.overage_multiplier,
        isActive: row.is_active === 1
      }
    };
  }

  insertRun(run: RunRecord): void {
    this.db
      .prepare(
        `
      INSERT INTO runs (
        id, workspace_id, source, role_id, kit_id, team_id,
        input, output, status, retry_count, cost, trace_json, error, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        run.id,
        run.workspaceId,
        run.source,
        run.roleId,
        run.kitId,
        run.teamId ?? null,
        run.input,
        run.output,
        run.status,
        run.retryCount,
        run.cost,
        JSON.stringify(run.trace),
        run.error ?? null,
        run.createdAt,
        run.updatedAt
      );
  }

  getRun(workspaceId: string, runId: string): RunRecord | undefined {
    const row = this.db
      .prepare(
        `
      SELECT *
      FROM runs
      WHERE workspace_id = ? AND id = ?
    `
      )
      .get(workspaceId, runId) as RunRow | undefined;

    if (!row) {
      return undefined;
    }
    return mapRunRow(row);
  }

  listRunsForWorkspace(workspaceId: string, limit: number): RunRecord[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const rows = this.db
      .prepare(
        `
      SELECT *
      FROM runs
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .all(workspaceId, safeLimit) as unknown as RunRow[];

    return rows.map((row) => mapRunRow(row));
  }

  listRuns(limit: number, offset: number, workspaceId?: string): RunRecord[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    if (workspaceId) {
      const rows = this.db
        .prepare(
          `
        SELECT *
        FROM runs
        WHERE workspace_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
        )
        .all(workspaceId, safeLimit, safeOffset) as unknown as RunRow[];
      return rows.map((row) => mapRunRow(row));
    }

    const rows = this.db
      .prepare(
        `
      SELECT *
      FROM runs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(safeLimit, safeOffset) as unknown as RunRow[];
    return rows.map((row) => mapRunRow(row));
  }

  findRunIdByIdempotencyKey(workspaceId: string, key: string): string | undefined {
    const row = this.db
      .prepare(
        `
      SELECT run_id
      FROM idempotency_keys
      WHERE workspace_id = ? AND idempotency_key = ?
    `
      )
      .get(workspaceId, key) as { run_id: string } | undefined;
    return row?.run_id;
  }

  saveIdempotencyKey(workspaceId: string, key: string, runId: string): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO idempotency_keys (workspace_id, idempotency_key, run_id, created_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(workspaceId, key, runId, nowIso());
  }

  recordRunCharge(
    workspaceId: string,
    runId: string,
    usageCostUsd: number,
    variableRevenueUsd: number
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO billing_charges (
        id, workspace_id, run_id, charge_month, usage_cost_usd, variable_revenue_usd, charged_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        randomUUID(),
        workspaceId,
        runId,
        asMonth(nowIso()),
        roundUsd(usageCostUsd),
        roundUsd(variableRevenueUsd),
        nowIso()
      );
  }

  getMonthlyUsage(workspaceId: string, month: string): MonthlyUsageSummary {
    const runStats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
        COALESCE(SUM(cost), 0) AS usage_cost
      FROM runs
      WHERE workspace_id = ? AND substr(created_at, 1, 7) = ?
    `
      )
      .get(workspaceId, month) as {
      total_runs: number;
      success_runs: number | null;
      failed_runs: number | null;
      usage_cost: number;
    };

    const chargeStats = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(variable_revenue_usd), 0) AS variable_revenue
      FROM billing_charges
      WHERE workspace_id = ? AND charge_month = ?
    `
      )
      .get(workspaceId, month) as { variable_revenue: number };

    const subscription = this.getWorkspaceSubscription(workspaceId);
    const mrrUsd = subscription?.status === "active" ? subscription.plan.monthlyPriceUsd : 0;
    const totalVariableRevenueUsd = roundUsd(chargeStats.variable_revenue);
    const totalEstimatedRevenueUsd = roundUsd(mrrUsd + totalVariableRevenueUsd);

    return {
      month,
      totalRuns: runStats.total_runs,
      successRuns: runStats.success_runs ?? 0,
      failedRuns: runStats.failed_runs ?? 0,
      totalUsageCostUsd: roundUsd(runStats.usage_cost),
      totalVariableRevenueUsd,
      mrrUsd,
      totalEstimatedRevenueUsd
    };
  }

  getOpsOverview(month: string): OpsOverview {
    const userCount = this.db
      .prepare(`SELECT COUNT(*) AS count FROM users`)
      .get() as { count: number };
    const workspaceCount = this.db
      .prepare(`SELECT COUNT(*) AS count FROM workspaces`)
      .get() as { count: number };
    const activeSubscriptions = this.db
      .prepare(`SELECT COUNT(*) AS count FROM workspace_subscriptions WHERE status = 'active'`)
      .get() as { count: number };
    const mrr = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(p.monthly_price_usd), 0) AS mrr
      FROM workspace_subscriptions ws
      JOIN plans p ON p.code = ws.plan_code
      WHERE ws.status = 'active'
    `
      )
      .get() as { mrr: number };

    const runStats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        COALESCE(SUM(cost), 0) AS usage_cost
      FROM runs
      WHERE substr(created_at, 1, 7) = ?
    `
      )
      .get(month) as { total_runs: number; success_runs: number | null; usage_cost: number };

    const chargeStats = this.db
      .prepare(
        `
      SELECT COALESCE(SUM(variable_revenue_usd), 0) AS variable_revenue
      FROM billing_charges
      WHERE charge_month = ?
    `
      )
      .get(month) as { variable_revenue: number };

    const runs = runStats.total_runs;
    const successRuns = runStats.success_runs ?? 0;
    const runSuccessRate = runs === 0 ? 0 : Number(((successRuns / runs) * 100).toFixed(2));
    const variableRevenueUsd = roundUsd(chargeStats.variable_revenue);
    const mrrUsd = roundUsd(mrr.mrr);
    const totalEstimatedRevenueUsd = roundUsd(mrrUsd + variableRevenueUsd);

    return {
      month,
      users: userCount.count,
      workspaces: workspaceCount.count,
      activeSubscriptions: activeSubscriptions.count,
      runs,
      runSuccessRate,
      usageCostUsd: roundUsd(runStats.usage_cost),
      variableRevenueUsd,
      mrrUsd,
      totalEstimatedRevenueUsd
    };
  }

  createPaymentOrder(input: {
    workspaceId: string;
    planCode: string;
    provider: string;
    providerOrderId: string;
    amountUsd: number;
    checkoutUrl: string;
    metadata?: Record<string, string>;
  }): PaymentOrderRow {
    const order: PaymentOrderRow = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      planCode: input.planCode,
      provider: input.provider,
      providerOrderId: input.providerOrderId,
      amountUsd: input.amountUsd,
      status: "pending",
      checkoutUrl: input.checkoutUrl,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.db
      .prepare(
        `
      INSERT INTO payment_orders (
        id, workspace_id, plan_code, provider, provider_order_id,
        amount_usd, status, checkout_url, metadata_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        order.id,
        order.workspaceId,
        order.planCode,
        order.provider,
        order.providerOrderId,
        order.amountUsd,
        order.status,
        order.checkoutUrl,
        order.metadataJson ?? null,
        order.createdAt,
        order.updatedAt
      );
    return order;
  }

  updatePaymentOrderStatus(
    orderId: string,
    status: PaymentOrderRow["status"],
    metadata?: Record<string, string>
  ): PaymentOrderRow {
    const now = nowIso();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    this.db
      .prepare(
        `
      UPDATE payment_orders
      SET status = ?, metadata_json = COALESCE(?, metadata_json), updated_at = ?
      WHERE id = ?
    `
      )
      .run(status, metadataJson, now, orderId);

    const order = this.getPaymentOrder(orderId);
    if (!order) {
      throw new Error("Payment order not found.");
    }
    return order;
  }

  getPaymentOrder(orderId: string): PaymentOrderRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id,
        plan_code,
        provider,
        provider_order_id,
        amount_usd,
        status,
        checkout_url,
        metadata_json,
        created_at,
        updated_at
      FROM payment_orders
      WHERE id = ?
    `
      )
      .get(orderId) as PaymentOrderDbRow | undefined;
    if (!row) {
      return undefined;
    }
    return mapPaymentOrderRow(row);
  }

  listPaymentOrdersForWorkspace(workspaceId: string, limit: number): PaymentOrderRow[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const rows = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id,
        plan_code,
        provider,
        provider_order_id,
        amount_usd,
        status,
        checkout_url,
        metadata_json,
        created_at,
        updated_at
      FROM payment_orders
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .all(workspaceId, safeLimit) as unknown as PaymentOrderDbRow[];
    return rows.map((row) => mapPaymentOrderRow(row));
  }

  listPaymentOrders(limit: number, offset: number): PaymentOrderRow[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const rows = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id,
        plan_code,
        provider,
        provider_order_id,
        amount_usd,
        status,
        checkout_url,
        metadata_json,
        created_at,
        updated_at
      FROM payment_orders
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(safeLimit, safeOffset) as unknown as PaymentOrderDbRow[];
    return rows.map((row) => mapPaymentOrderRow(row));
  }

  listPendingPaymentOrders(olderThanIso: string, limit: number): PaymentOrderRow[] {
    const rows = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id,
        plan_code,
        provider,
        provider_order_id,
        amount_usd,
        status,
        checkout_url,
        metadata_json,
        created_at,
        updated_at
      FROM payment_orders
      WHERE status = 'pending' AND created_at <= ?
      ORDER BY created_at ASC
      LIMIT ?
    `
      )
      .all(olderThanIso, limit) as unknown as PaymentOrderDbRow[];

    return rows.map((row) => mapPaymentOrderRow(row));
  }

  getSelfHostedEntitlement(workspaceId: string): SelfHostedEntitlementRow | undefined {
    const row = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id,
        package_code,
        status,
        order_id,
        activated_at,
        created_at,
        updated_at
      FROM self_hosted_entitlements
      WHERE workspace_id = ?
    `
      )
      .get(workspaceId) as
      | {
          id: string;
          workspace_id: string;
          package_code: string;
          status: SelfHostedEntitlementRow["status"];
          order_id: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;
    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      packageCode: row.package_code,
      status: row.status,
      orderId: row.order_id ?? undefined,
      activatedAt: row.activated_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  upsertSelfHostedEntitlement(input: {
    workspaceId: string;
    packageCode: string;
    status: SelfHostedEntitlementRow["status"];
    orderId?: string;
  }): SelfHostedEntitlementRow {
    const now = nowIso();
    const existing = this.getSelfHostedEntitlement(input.workspaceId);
    if (!existing) {
      const row: SelfHostedEntitlementRow = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        packageCode: input.packageCode,
        status: input.status,
        orderId: input.orderId,
        activatedAt: input.status === "active" ? now : undefined,
        createdAt: now,
        updatedAt: now
      };
      this.db
        .prepare(
          `
        INSERT INTO self_hosted_entitlements (
          id, workspace_id, package_code, status, order_id, activated_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          row.id,
          row.workspaceId,
          row.packageCode,
          row.status,
          row.orderId ?? null,
          row.activatedAt ?? null,
          row.createdAt,
          row.updatedAt
        );
      return row;
    }

    const nextActivatedAt =
      input.status === "active" ? existing.activatedAt ?? now : existing.activatedAt;
    this.db
      .prepare(
        `
      UPDATE self_hosted_entitlements
      SET package_code = ?, status = ?, order_id = COALESCE(?, order_id), activated_at = ?, updated_at = ?
      WHERE workspace_id = ?
    `
      )
      .run(
        input.packageCode,
        input.status,
        input.orderId ?? null,
        nextActivatedAt ?? null,
        now,
        input.workspaceId
      );

    const updated = this.getSelfHostedEntitlement(input.workspaceId);
    if (!updated) {
      throw new Error("Failed to update self-hosted entitlement.");
    }
    return updated;
  }

  listAuditEvents(workspaceId: string, limit: number): AuditEventRow[] {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const rows = this.db
      .prepare(
        `
      SELECT id, workspace_id, type, message, metadata_json, created_at
      FROM audit_events
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .all(workspaceId, safeLimit) as Array<{
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

  addAuditEvent(
    workspaceId: string,
    type: string,
    message: string,
    metadata?: Record<string, string>
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO audit_events (id, workspace_id, type, message, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        randomUUID(),
        workspaceId,
        type,
        message,
        metadata ? JSON.stringify(metadata) : null,
        nowIso()
      );
  }
}

export type {
  AuditEventRow,
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
