# Self-Hosted Quickstart

## One-click installer

Linux/macOS:

```bash
npm run deploy:oneclick:sh
```

Windows PowerShell:

```powershell
npm run deploy:oneclick:ps
```

This path includes setup + doctor + first team run.

## One-command setup

```bash
npm run dev:cli -- /roleos setup --yes
```

This executes the guided installer in non-interactive mode and writes:

- `.roleos/config/self-hosted.config.json`
- `.roleos/state/self-hosted-state.json`

## Typical intent flow

1. User intent enters chat.
2. RoleOS chooses a `Role`.
3. RoleOS activates a `Kit`.
4. RoleOS upgrades to `Team` orchestration when needed.
5. OpenClaw adapter executes runtime-native actions.

## Commands

- `/roleos setup`
- `/roleos role`
- `/roleos kit`
- `/roleos install <kitId>`
- `/roleos uninstall <kitId>`
- `/roleos switch-kit <kitId>`
- `/roleos team [teamId] --intent "<text>"`
