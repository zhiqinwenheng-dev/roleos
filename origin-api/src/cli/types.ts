export type RoleosCommandName =
  | "setup"
  | "doctor"
  | "market"
  | "role"
  | "kit"
  | "install"
  | "uninstall"
  | "switch-kit"
  | "team"
  | "help";

export interface ParsedCommand {
  name: RoleosCommandName;
  args: string[];
  flags: Record<string, string | boolean>;
}

export interface CommandResponse<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}
