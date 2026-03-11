#!/usr/bin/env node
import { cwd, exit } from "node:process";
import { env } from "node:process";
import { createAppContext } from "../bootstrap/context.js";
import { normalizeRoleosArgv, parseArgv } from "./parse.js";
import { renderResponse } from "./output.js";
import { SelfHostedCommandService } from "../selfhosted/commandService.js";

async function run(): Promise<void> {
  const command = parseArgv(normalizeRoleosArgv(process.argv));
  const context = await createAppContext(cwd(), {
    openClawEndpoint: env.ROLEOS_OPENCLAW_ENDPOINT,
    openClawApiKey: env.ROLEOS_OPENCLAW_API_KEY
  });
  const service = new SelfHostedCommandService(
    context.registryService,
    context.stateStore,
    context.installer,
    context.runner,
    context.registryRoot
  );

  const response = await service.execute(command);
  const asJson = command.flags.json === true;
  console.log(renderResponse(response, asJson));
  if (!response.ok) {
    exit(1);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RoleOS CLI failed: ${message}`);
  exit(1);
});
