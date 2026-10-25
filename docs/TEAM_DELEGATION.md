# Team delegation

The primary agent can coordinate existing agents from an owner's chat using
three built-in tools, regardless of the primary agent's reply provider:

- `team_list`: discover up to 100 existing agents and their saved reply sources.
- `team_delegate`: submit a self-contained task to one existing agent and wait
  for its result. Include expected deliverables and acceptance criteria.
- `team_results`: collect the latest five results from the same owner's
  conversation, including results produced after a delegation approval.

Grant these tools explicitly to the primary agent through the existing tool
grant controls. No grants or agent assignments are changed automatically.
Delegation also requires `AGENT_EXEC_TOOLS=true` and owner approval for each
call. Existing approval and verification policies remain in force.

The delegate uses its saved model, personality, specialties and skill resources.
An optional `reply_source` explicitly selects one of the three subscription
sources for that approved task only. It is shown in the approval parameters and
does not change the agent's saved model. It is never selected as an automatic
fallback after another provider fails.
Subscription sources use Claude Code, Codex or Google Antigravity through the
existing restricted adapters. Local sources use the saved Ollama model. A Claude
API source uses only the agent's configured credential and the autonomous cost
gate; missing credentials or a refused budget fail without switching models.
Subscription sources consume the signed-in account's quota.

Child tools and memory permissions are intersected with the coordinator's
current grants and permissions. The chat's selected project boundary is bound
into the approval hash and restored at execution. Recursive team delegation and
alternate CLI-delegation tools are excluded from the child turn. The child does
not receive the parent conversation: share only the material needed for its task.

Only one child can run per owner at a time in a process. Each child has a
four-minute deadline, at most eight tool requests, bounded prompts and bounded
results. Calls run inline; this does not start the background scheduler or Trading.
Results are encrypted at rest and scoped to owner, conversation and coordinator.

Personality context includes the effective profile name, numeric traits and
behavioral instructions. Markdown skill resources are supplied as context;
optional package scripts are not installed or executed by loading a specialty.

Each child result records application-registry tool names and execution outcomes.
This trace confirms which tool requests the application handled; it does not
prove every statement in the model report or external side effects.

An `answered` result is an attributed agent report, not an independently verified
completion. The coordinator must examine evidence and unfinished work before
combining reports. `waiting_approval`, `started` and `failed` are unfinished.
After approving a delegation, ask the coordinator to collect `team_results` and
continue. A child waiting for another tool approval does not automatically
resume its model turn. A process interruption may leave `started`; no automatic
retry is performed because prior tool effects may already have happened.

Migration 141 adds encrypted result storage. Existing agents, personalities,
memories and conversations are preserved. Deploy the migration with the normal
backend startup procedure and back up the database before activating a release.

Validation uses an isolated migrated database, stubbed Ollama and synthetic CLI
executables for all three subscription adapters. This demonstrates routing,
context, permission intersections, approval execution, result scoping and replay
refusal; it does not establish real account availability or model task quality.
