# Geometry, scale and structure

## Measure the asset

Record unit convention, intended dimensions, orientation, origin/pivot and bounding box in a meaningful state. Inspect local versus world transforms. A nested parent scale can make an apparently correct object export incorrectly. Changing applied transforms can alter modifiers, animation or rig behavior; inspect dependencies before applying a blanket fix.

Compare orthographic or other suitable neutral views with the intended reference. Validate silhouette before detail. If the brief includes physical fit, use measured constraints rather than eyeballing a camera perspective. Keep uncertainty when a reference does not establish dimensions.

## Topology by use

For render-only work, choose geometry that supports the intended appearance and editable workflow. For realtime use, inspect view-distance silhouette, normals, triangulation behavior, vertex/triangle counts, material partitions and collision needs. A polygon budget belongs to the target contract; do not invent a universal number.

For deforming assets, inspect joint topology, hierarchy, weights and representative extreme poses. A static neutral pose does not prove deformation quality. Do not rename bones or change rest pose without considering the target skeleton and animation dependencies.

For manufacturing, inspect closure, self-intersection, disconnected shells, wall/detail dimensions and the intended process/material. A mesh can pass a software manifold check and still fail fabrication because of supports, thin features or machine constraints. Keep the geometry observation separate from physical acceptance.

## Cleanup tradeoffs

Check duplicate/degenerate elements, unintended internal surfaces, normals, disconnected parts and shading artifacts. Determine whether a feature is deliberate before removing it. Remeshing can improve a particular topology property while losing UVs, proportions or detail. Compare the result and retain recoverable source.

Do not collapse modifiers, decimate rigs or merge materials merely to reduce a metric. Record why the change serves the target and what was checked afterward. A clean viewport alone does not establish clean export geometry.
