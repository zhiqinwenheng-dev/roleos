import type {
  KitSpecV1,
  RegistryObject,
  RoleSpecV1,
  TeamSpecV1
} from "./types.js";
import type {
  RegistryBundle,
  RegistryValidationIssue,
  RegistryValidationReport
} from "../registry/types.js";

function pushIssue(
  issues: RegistryValidationIssue[],
  issue: RegistryValidationIssue
): void {
  issues.push(issue);
}

function checkDuplicates(records: RegistryObject[], issues: RegistryValidationIssue[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    const key = `${record.kind}:${record.id}`;
    if (seen.has(key)) {
      pushIssue(issues, {
        code: "duplicate_id",
        objectId: record.id,
        message: `Duplicate object id for ${record.kind}: ${record.id}`
      });
      continue;
    }
    seen.add(key);
  }
}

function checkSpecCompatibility(
  records: RegistryObject[],
  issues: RegistryValidationIssue[]
): void {
  for (const record of records) {
    if (record.specVersion !== "v1") {
      pushIssue(issues, {
        code: "invalid_spec_version",
        objectId: record.id,
        message: `Unsupported spec version for ${record.id}: ${record.specVersion}`
      });
    }

    if (!["draft", "validated", "active", "deprecated"].includes(record.lifecycle)) {
      pushIssue(issues, {
        code: "invalid_lifecycle",
        objectId: record.id,
        message: `Unsupported lifecycle for ${record.id}: ${record.lifecycle}`
      });
    }
  }
}

function checkReferences(
  roles: RoleSpecV1[],
  kits: KitSpecV1[],
  teams: TeamSpecV1[],
  issues: RegistryValidationIssue[]
): void {
  const roleIds = new Set(roles.map((r) => r.id));
  const kitIds = new Set(kits.map((k) => k.id));

  for (const kit of kits) {
    for (const roleRef of kit.roleRefs) {
      if (!roleIds.has(roleRef)) {
        pushIssue(issues, {
          code: "unknown_reference",
          objectId: kit.id,
          path: "roleRefs",
          message: `Kit ${kit.id} references unknown role ${roleRef}`
        });
      }
    }
  }

  for (const team of teams) {
    for (const roleId of team.participatingRoles) {
      if (!roleIds.has(roleId)) {
        pushIssue(issues, {
          code: "unknown_reference",
          objectId: team.id,
          path: "participatingRoles",
          message: `Team ${team.id} references unknown role ${roleId}`
        });
      }
    }

    for (const kitId of team.requiredKits) {
      if (!kitIds.has(kitId)) {
        pushIssue(issues, {
          code: "unknown_reference",
          objectId: team.id,
          path: "requiredKits",
          message: `Team ${team.id} references unknown kit ${kitId}`
        });
      }
    }

    for (const handoffRole of team.handoffOrder) {
      if (!team.participatingRoles.includes(handoffRole)) {
        pushIssue(issues, {
          code: "invalid_handoff",
          objectId: team.id,
          path: "handoffOrder",
          message: `Team ${team.id} handoff role ${handoffRole} is not in participatingRoles`
        });
      }
    }
  }
}

export function validateRegistryBundle(bundle: RegistryBundle): RegistryValidationReport {
  const issues: RegistryValidationIssue[] = [];
  const objects = bundle.records.map((record) => record.object);

  checkDuplicates(objects, issues);
  checkSpecCompatibility(objects, issues);

  const roles = objects.filter((item): item is RoleSpecV1 => item.kind === "role");
  const kits = objects.filter((item): item is KitSpecV1 => item.kind === "kit");
  const teams = objects.filter((item): item is TeamSpecV1 => item.kind === "team");
  checkReferences(roles, kits, teams, issues);

  return {
    valid: issues.length === 0,
    issues
  };
}
