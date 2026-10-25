# Incremental state and history

## Establish update semantics

Identify event time, source update time, ingestion time and their guarantees. Choose a stable key and a deterministic conflict rule for repeated versions. A timestamp watermark alone can miss equal-timestamp rows, late arrivals or source corrections. A lookback window reduces some risks but does not prove completeness unless its bound matches the source contract.

Define how deletions arrive: explicit tombstone, status change, snapshot absence or no supported signal. Snapshot absence can mean incomplete extraction, so do not interpret it as deletion without the correct completeness evidence. Do not perform broad target deletion after a partial source read.

## Incremental/full equivalence

For a bounded fixture, build the full expected output, apply the same input as separate batches, repeat a batch, then apply a late correction and a deletion where supported. Compare final state and relevant aggregates. Test ties in source ordering and records on the exact window boundary. Duplicate delivery must not become duplicate business effects.

Keep run-specific transformation version and extraction boundaries. When logic changes, decide whether existing rows require recomputation. Applying new logic only to new events can mix incompatible definitions in one model. Backfills need bounded scope, authorization, cost checks and a plan for downstream visibility during the change.

## Historical dimensions

For slowly changing history, state which attributes overwrite and which create a new version. Define validity intervals and whether end timestamps are inclusive. Test non-overlap, intended coverage, a single current version when required, and deterministic event-to-version joins. Late corrections can split history; silently attaching all historical facts to the latest dimension can change the past.

## Recovery and releases

Separate a successful transformation from an advanced source checkpoint. Understand the framework's actual transaction boundary and recovery behavior. A failed job can leave partial state; inspect and reconcile before replay. A full refresh can be expensive or destructive and is not a default debugging action. Use existing project procedures and make irreversible limits visible.
