---
name: three-d-production
description: Create, refine and deliver 3D assets or scenes against explicit geometry, material, scale and target-runtime contracts. Use for modeling, asset cleanup, render preparation and export verification.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; authoring and inspection capabilities depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# 3D production

Deliver a usable 3D asset or scene for the intended target, together with the editable source and evidence of the checks actually performed. A rendered image can conceal broken geometry, missing textures, incorrect scale or an export the destination cannot use.

Read [Runtime contract](references/runtime-contract.md) in a new host. Use [Asset contract](assets/asset-contract.md), [Geometry and scale](references/geometry-scale.md), [Materials and presentation](references/materials-presentation.md), [Delivery and target checks](references/delivery-targets.md), and [Acceptance](references/acceptance.md). Preserve the existing scene and authorized source files before consequential edits.

## Establish the intended asset

Identify the subject, visual references, audience, target application/engine, deliverable formats, real-world dimensions, unit/axis convention, animation needs, performance budget and acceptance view. Distinguish a static prop, deforming character, architectural scene, product render and printable object; their topology and delivery requirements differ.

Inspect existing source files, scene contents, approved assets and tool capabilities before rebuilding. Reuse the appropriate licensed source when it fits the task. Keep appearance distinct from agent identity, personality, memory and permissions. Existing avatar/world tools can provide supported platform operations; a general 3D task does not authorize rebuilding a licensed avatar generator or claiming compatibility with an untested skeleton.

Record what is available: local authoring tool, file inspection, existing renderer, supported connector or only supplied reference images. A connector name does not establish a live session, write grant or export capability. If a required capability is missing, complete the useful contract/inspection work and state the exact remaining step instead of presenting a plan as a created asset.

## Build a measurable blockout

Start with silhouette, proportions, major forms and scale in the relevant views. Confirm dimensions and placement before detailed geometry. A hero view can hide problems visible from the side, back or in motion. Choose the smallest useful preview and evaluate it against the brief rather than spending a large render budget immediately.

Use the scene's intended unit and coordinate system. Verify actual bounds, object transforms, origin/pivot and relationship to the ground or attachment point. Applying transforms can affect modifiers, rigs and exports; inspect the dependency before changing them globally. Do not “fix” a scale issue by altering the camera alone.

For large or multi-object scenes, use meaningful names, collections/layers and clear source/export variants. Avoid destroying the editable source to simplify an export. Keep reversible iteration and isolate experiments in a task-appropriate working copy.

## Refine geometry for its use

Read [Geometry and scale](references/geometry-scale.md). Check normals, shading, degeneracy, disconnected parts and intended topology. Non-manifold geometry may be a blocker for a particular manufacturing task while being acceptable in some render-only assets. State the intended criterion rather than declaring a universal mesh pass.

For realtime assets, consider silhouette at the actual view distance, material/draw-call complexity, texture memory, collision and supported levels of detail. For deformation, inspect joint areas, skin weights, hierarchy and representative poses. For print preparation, use explicit physical units and the intended process; software mesh checks alone do not prove a physical part will print successfully.

Simplification, remeshing and cleanup can change shape, UVs, skinning or fine detail. Compare before/after against the actual brief and preserve the original. A lower polygon count is not automatically a better asset.

## Develop materials and presentation

Use [Materials and presentation](references/materials-presentation.md). Assign material roles and inspect UVs/texture dependencies as relevant. Confirm the target supports the chosen shading features. A procedural material in the authoring tool may need an authorized bake or a simpler supported representation for export.

Set lighting, camera and background to reveal the intended shape and material. Separate neutral inspection views from artistic presentation. Record renderer/color-management settings when visual matching matters. A beautiful preview is not proof that the exported asset includes its textures or looks identical in another engine.

Use assets within their actual licenses and sharing permissions. Do not upload private models, buy materials, start remote renders or install add-ons merely because an upstream recipe names those operations. A bounded local preview can still require resource awareness; use the existing capability and task budget.

## Verify the actual deliverable

Read [Delivery and target checks](references/delivery-targets.md). Save the editable source and export the requested variant through the supported workflow. Verify that the output exists, has the intended format/version, includes or resolves dependencies, and can be reopened. Reimport into a clean scene or inspect in the intended target when available.

Check scale, orientation, pivot, materials, hierarchy, animations and representative interaction after export, not only in the source scene. A successful exporter return does not prove destination compatibility. If the destination cannot be tested, label that acceptance as unverified and identify the missing capability.

For asynchronous tools, keep the actual task identity, inspect terminal status and retrieve the returned artifacts. A submitted task or preview link is not a completed export. Reconcile uncertain submissions before repeating costly work. Do not assume a cloud service's capability, quota, units or output contract applies to a local tool or another provider.

## Deliver a reproducible handoff

Use [Delivery receipt](assets/delivery-receipt.md). Provide the editable source, exports, dependency/rights notes, preview views, target/units and actual checks. Separate created, exported, reopened, target-tested and published states. Keep private assets and project-specific licenses out of a general shared skill package.

State known limitations and the next useful check. Do not certify printability, rig compatibility, visual parity or realtime performance from a single screenshot. The goal is a usable artifact with an honest acceptance boundary, not a long list of unverified capabilities.

[Design notes](references/design-notes.md) identify reviewed source material and independent comparison limits.
