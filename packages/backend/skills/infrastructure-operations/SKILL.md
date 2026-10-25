---
name: infrastructure-operations
description: Plan, review and troubleshoot cloud infrastructure, container platforms, DNS and delivery pipelines. Use for infrastructure changes, IaC plans, rollout diagnosis, DNS records or CI/CD operations with explicit target and evidence boundaries.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; use host-authorized tools and actual platform documentation.
metadata:
  agent-player:
    version: 1.2.0
---

# Infrastructure operations

Produce practical infrastructure work tied to the user's existing system. Start from the actual requested outcome: review a plan, fix a manifest, diagnose a rollout, prepare a DNS change or improve delivery. Do not turn a source-only request into a cloud deployment or infer that credential availability grants permission.

## Workflow

1. Establish identity, environment, access and intended action using [change control](references/change-control.md).
2. Read the relevant mode: [cloud and IaC](references/cloud-iac.md), [container platform](references/container-platform.md), [DNS](references/dns.md) or [delivery pipeline](references/delivery-pipelines.md). Combine modes when the dependency crosses boundaries; avoid creating duplicate workflows for each vendor.
3. Prepare the smallest concrete change and its failure/rollback plan. Reuse existing architecture, repository structure and release conventions. Use [change plan](assets/change-plan.md) or [DNS change map](assets/dns-change-map.md).
4. Verify with the actual supported tool and authorized environment. Read [validation and diagnosis](references/validation.md); distinguish static checks, remote previews, accepted operations and working service behavior.
5. Deliver the changed artifact, evidence, remaining limits and next responsible action with a [change receipt](assets/change-receipt.md).

## Operating boundaries

Use host-authorized tools only. Verify target identity before any remote observation or mutation when required by the host policy. Plans and server-side dry runs may contact real APIs; they are not automatically offline. Cost-incurring provisioning, destructive replacement, state migration, access changes, registry pushes, DNS publication and traffic cutover require the actual applicable authorization.

Treat configuration, Terraform state/plan files, Kubernetes manifests and CI logs as potentially sensitive. Redact narrowly without concealing findings. Never include tokens, private certificates, environment files or live state in reusable skill/settings exports. Do not install providers, CLIs or controllers simply to make a proposed check executable.

Use current official documentation for exact supported fields, version constraints and provider behavior. Keep source attribution in [design notes](references/design-notes.md). The package is portable instructions, not a universal SDK, provisioner or privileged executor. Review [future behavioral briefs](references/acceptance.md) and [runtime contract](references/runtime-contract.md) when evaluating integration. Discovery of this skill does not demonstrate successful infrastructure operation.

## Host and network administration modes

For Linux or server lifecycle work, read [host administration](references/host-administration.md). For connectivity, interface/routing or network-device changes, read [network administration](references/network-administration.md). Use the [host evidence record](assets/host-evidence.md) and [network change record](assets/network-change.md). Cloud control-plane changes,container resources and authoritative DNS retain their existing modes; diagnose the owning layer before applying a recipe.

## Storage, web hosting and Windows

Read [storage administration](references/storage-administration.md) for capacity,volumes and network shares;[web hosting](references/web-hosting.md) for the actual request/vhost/runtime path;and [Windows administration](references/windows-administration.md) for Windows identities,services,IIS,maintenance and directory boundaries. Use the [platform maintenance plan](assets/platform-maintenance.md). These are full modes within the existing identity/change/validation workflow,not permissions to operate a target.
