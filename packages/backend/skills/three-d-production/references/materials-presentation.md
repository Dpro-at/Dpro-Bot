# Materials, dependencies and presentation

## Material contract

List intended material roles, target shading model, texture channels and supported features. Inspect UV coverage, texel density where relevant, seams and normal-map orientation in the actual target workflow. Different engines can interpret a channel or color space differently; verify the intended import settings rather than assuming visual parity.

Resolve external texture paths and packing strategy. A source file referencing an artist's private absolute path may render locally and fail on another machine. Package only assets whose licenses permit the intended sharing. Keep original/source textures distinct from optimized exports.

## Procedural and baked outputs

A procedural material may not survive a format conversion. Determine whether the target supports it directly or whether an authorized bake/simplification is needed. Check bake bounds, UVs, channel use and output resolution against the intended size/performance. Do not claim a baked map exists because a bake operation was configured.

## Inspection versus presentation

Use neutral lighting/views to expose shape, normals and material issues, then create the requested artistic presentation. An extreme camera, deep shadow or stylized color treatment can hide a defect. State which view demonstrates which acceptance condition.

Record camera/framing, renderer, resolution and color-management settings where reproducibility matters. Preview quality and final quality are different states. A low-cost preview can support a proportion decision without claiming final render fidelity.

## Resource and tool behavior

Use the actual available renderer/tool and its current contract. Remote rendering can require uploads, costs, account scopes and asynchronous artifact retrieval; none follows from a general modeling instruction. Local and remote defaults may use different units or centering. Inspect actual output bounds and dependencies after conversion.
