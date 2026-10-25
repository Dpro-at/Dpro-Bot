---
name: data-governance
description: Build practical data ownership, classification, lineage, quality and lifecycle controls with evidence-backed responsibilities and reviewable policy gaps. Use for data catalogues, stewardship, access reviews and governance operating models.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; database, orchestration and catalogue access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Data governance

Make data decisions traceable to an accountable owner, an explicit policy and observable controls. A catalogue entry or classification label does not prove access is restricted, retention is enforced or a dataset is fit for every use.

Read [Runtime contract](references/runtime-contract.md) in a new host. Read [Ownership and catalogue](references/ownership-catalogue.md), [Access and lifecycle](references/access-lifecycle.md), and [Quality and lineage](references/quality-lineage.md) for the relevant work. Use [Dataset record](assets/dataset-record.md), [Control gap](assets/control-gap.md) and [Acceptance](references/acceptance.md) to produce actionable records.

## Establish the governance assignment

Identify the organization/project boundary, business purpose, dataset scope, intended users and actual decision owner. Read approved internal policies and existing catalogues before proposing another taxonomy. Distinguish a proposed standard from an approved rule and an approved rule from an enforced control. If the task touches a legal requirement, obtain applicable authoritative guidance through the available process rather than inventing a universal retention or compliance rule.

Determine whether the task is inventory, classification, stewardship, lineage, quality ownership, access review or lifecycle design. Keep a narrow request narrow; a dataset glossary update does not require redesigning the whole organization's governance model. Record missing policy decisions in a form an owner can resolve.

Inventory the evidence available: schema, documentation, lineage metadata, access grants, audit observations, quality results and lifecycle jobs. Access to a catalogue does not automatically grant access to data rows. Prefer metadata and minimized samples; do not copy sensitive records into a shared governance artifact merely to demonstrate classification.

## Build useful ownership and classification

Assign responsibilities at the right level: business meaning, technical operation, quality remediation and access approval may have different accountable people. Record named roles or verified owners, not fictional staff. Where ownership is unknown, keep an explicit unresolved assignment with a next action rather than assigning responsibility by guess.

Classify according to the approved taxonomy and permitted evidence. Consider field-level sensitivity, derived attributes and combinations that increase identifiability. A dataset with pseudonymous IDs is not automatically anonymous. State the method and uncertainty when content inspection was unavailable. Avoid embedding actual sensitive values in examples.

Record purpose, source, grain, business key, schema/version, authoritative status, allowed uses, consumers and freshness. A glossary should define business terms and distinguish similar measures. Do not give competing definitions the same name without identifying the relevant scope or owner.

## Connect policy to actual controls

For each important requirement, identify the intended control, implementation owner, evidence of operation and remaining gap. Read [Access and lifecycle](references/access-lifecycle.md) before recommending access changes, retention or deletion. A role assignment, masking view or policy text needs verification at the correct enforcement point.

Review effective access rather than only a requested group membership. Inherited roles, service identities, exports, caches and downstream copies can matter. Keep actual grant changes within authorization and the existing access process. A review can propose a specific change without performing it.

Define lifecycle from approved purpose and applicable policy: collection, use, sharing, archival, retention, deletion and exceptions. Do not invent a numeric retention period, claim that deleting a source removes every copy, or perform deletion as part of writing a policy. Record legal holds or other exceptions only from authorized evidence.

## Make quality and lineage operational

Use [Quality and lineage](references/quality-lineage.md) to map the relevant source-to-consumer path and ownership. Distinguish declared lineage, parsed code lineage and observed runtime lineage; each has coverage limits. Missing an edge in one tool is not proof that a downstream copy does not exist.

Tie quality checks to the use that can fail: key uniqueness, completeness, validity, consistency, timeliness and reconciliation as applicable. Specify the measured population, threshold rationale, owner and response when a check fails. An overall quality score must not hide a critical defect in a decisive field.

Record incidents and exceptions with scope, rationale, owner, compensating control where applicable and review trigger. A temporary exception should not silently become permanent. Governance success is demonstrated by resolved decisions and working controls, not by the number of policy pages.

## Deliver an accountable result

Deliver the updated records, approved/proposed distinctions, evidence inspected, specific gaps, responsible owners and next actions. Separate documentation completion from control implementation and control operating effectiveness. If enforcement cannot be verified, state the exact missing observation and avoid a blanket compliance claim.

Keep sharing boundaries visible. A portable skill package contains the workflow and blank templates, not internal data catalogues, private lineage, employee identities, credentials or policy decisions belonging to a particular organization.

[Design notes](references/design-notes.md) record the independently reviewed source and comparison limits.
