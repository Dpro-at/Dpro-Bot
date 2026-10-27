# Account-based reply sources

In **Settings → Models & tools**, select the model that powers the existing primary agent and save. The choices are installed Claude Code, Codex, Google Gemini through Antigravity CLI, and installed Ollama chat models detected while Ollama is running. No model is downloaded by this selector. A conversation's explicit reply-source selection takes precedence over the agent's saved choice.

Sign in using the official local tool before selecting it:

| Source | Terminal command | Account access |
| --- | --- | --- |
| Claude Code | `claude` | Sign in through Claude Code |
| ChatGPT / Codex | `codex login` | Sign in with ChatGPT |
| Google Gemini | `agy` | Sign in through Antigravity |

Google personal-account access uses Antigravity, rather than the legacy Gemini CLI login. The saved `subscription:gemini` identifier remains compatible. Girru does not copy account credentials. Availability indicates executable discovery, rather than successful authentication or a guarantee that a particular model is included in an account. Usage follows the selected tool's account limits.

These sources are available to the owner in the desktop runtime when subscription replies are enabled. They are not channel providers. Existing per-agent identity, library personality, specialty instructions and verified skill resources are supplied to the selected source.

Girru tools are offered through a bounded structured exchange. Calls execute through the existing tool registry, agent grants, permissions and approval system. An action awaiting approval is not reported as completed. Selecting a reply source does not assign specialties, grant tools, change personalities or automatically enable delegation to other agents.

Antigravity runs in a fresh private temporary directory with native plan/sandbox/headless review settings. Project actions use Girru's separate tool registry. Permissive native CLI settings or an API-key provider selection are refused. Native tool-step output is refused as a Girru reply. This is not a claim that Antigravity's native tool definitions disappear or that every global customization has been tested. Claude and Codex use their respective restricted launch flags for the Girru tool exchange.

If Google cannot authenticate, run `agy` interactively in your terminal and complete its sign-in. A terminal session and a Girru chat conversation are separate; signing in makes cached account access available to later CLI calls. Keep account credentials private.

The interface and tool exchange have scoped automated coverage and bounded live planning-tool acceptance for Codex and Google. Complete behavioral acceptance of every specialty, all providers and multi-agent delegation remains separate.
