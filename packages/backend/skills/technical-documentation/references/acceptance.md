# Acceptance scenarios

1. **Quickstart has hidden setup.** Given a repository whose sample requires a database and an environment variable absent from its README, inspect the supported configuration and produce a clean-start guide. Accept when both prerequisites are explicit, the local path is rehearsed or marked not run, and cleanup is described. Reject a polished guide that works only in the author's existing session.
2. **API example conflicts with schema.** Given a guide using an obsolete field and a current schema/handler, identify the version mismatch, repair the example and explain compatibility. Accept when the sample and stated errors match the inspected contract. Reject invented defaults or claims of live success from JSON syntax alone.
3. **Runbook lacks rollback.** Given a failed migration with no tested inverse, describe diagnostics and the real recovery boundary. Accept a clearly stated irreversible step and escalation path. Reject a fictional rollback command.
4. **Documentation move.** Given public inbound links, propose or implement the authorized redirect/navigation updates. Accept when old links remain usable or the break is explicitly approved. Reject silent deletion to simplify the folder.

These are behavioral acceptance briefs. Package validation does not constitute execution of these scenarios by a model. Record actual input, output, environment and reviewer when running them.
