# Context, retrieval and memory

Start from the task's evidence needs. A greeting does not need a retrieval pipeline. A private document question needs source selection and access control. A personal preference may belong in a scoped memory store only under the product's existing consent/retention policy. Do not turn every chat sentence into a permanent fact.

## Retrieval

Identify authoritative source IDs, versions, owner/tenant, access restrictions and freshness. Enforce permissions before searching or returning snippets and again when reading the referenced object if access can change. A similarity index is not an authorization boundary. Do not use cross-tenant nearest-neighbor candidates as context and hope the model suppresses them.

Choose chunking and indexing for the source structure and task. Preserve document, section, version and meaningful offsets. Evaluate whether boundaries split tables, headings or definitions needed for interpretation. Measure retrieval on representative questions with expected evidence before adding rerankers or increasing context size.

Record the source version used in an answer. A citation should point to accessible material that supports the claim; a valid URL or matching keyword does not establish support. If the source is missing, stale, conflicting or insufficient, state that gap and limit the answer. Separate retrieved statements from inference and general knowledge.

## Memory

Distinguish temporary turn state, conversation summary and persisted owner-scoped memory. Store provenance, scope and the product's update/deletion semantics. If the user corrects a preference, resolve supersession instead of keeping contradictory active values indefinitely. An inferred trait should not quietly become an approved identity fact.

Before reusing memory, check current owner/object/session and relevance. Preserve private facts when exporting shareable settings unless the user explicitly selected an appropriate private-data export. The absence of a retrieved record is not proof that the user has no preference; it can mean unavailable or filtered evidence.

## Untrusted material

Documents can contain instructions that attempt to override the task, reveal secrets or invoke tools. Retain the application's instruction boundary and label source content as evidence. Tool authority must not depend on a sentence inside a retrieved page. Test a fixture with relevant facts plus malicious embedded instructions; assess both evidence use and refusal to adopt document authority.

## Evidence quality

Track retrieval hit rate separately from supported-answer quality. A retrieved paragraph can be irrelevant, and an answer can cite the right document while misstating it. Use small labeled cases, including unanswerable questions and revoked access. Actual model tests require authorized inference; static chunk and filter checks cover only their deterministic components.
