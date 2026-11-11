<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Journey and safety logic lives as pure functions in `src/lib/companion/` (no React, no I/O) so every safety rule is unit-tested without hardware.
- Cloud I/O lives outside the pure helper directory in `src/lib/companion.functions.ts`, so hardware-free tests never import server functions.
- All thresholds and route stops come from `src/lib/companion/config.ts`; never hardcode them in screens.
- Journey orchestration is a pure session reducer; server mutations validate commands and use version checks to prevent concurrent device updates from overwriting each other.
- Signed-in devices share the journey owned by the same account; owner-scoped policies protect it, while signed-out preview state is ephemeral and never persisted.
- In multi-device mode only the operator console drives simulation ticks; in single robot mode (/solo) the robot screen drives ticks itself, so the two modes should not run at the same time.
- Server triggers are queued rows (staff page or secret-keyed public API) that the single robot claims atomically (pending -> accepted) before dispatching a journey.
- Camera media remains device-local in memory and is discarded on completion, refusal, reset, or unmount; no biometric image is sent to Cloud in this simulator.
- Shared workspace navigation and the companion provider wrap the root Outlet so each role screen keeps a consistent journey during navigation.
