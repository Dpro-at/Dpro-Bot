# Local frame manifest

Run scripts/audit_timeline.py --help with Python 3.10+ before use. Input is an explicit local UTF-8 JSON object, at most 2 MiB and 20000 clips. No network, rendering, source mutation or dependency installation.

```json
{
  "fps": {"numerator":30000,"denominator":1001},
  "total_frames":300,
  "require_visual_coverage":true,
  "clips":[
    {"id":"opening","kind":"visual","start_frame":0,"end_frame":150},
    {"id":"resolution","kind":"visual","start_frame":150,"end_frame":300}
  ]
}
```

The exact top-level keys are fps, total_frames, require_visual_coverage, clips. Frame rate is a rational numerator/denominator: positive integers, numerator at most 240000, denominator at most 10000, resulting rate from 1 through 240 frames/second. These are helper support limits, not universal media rules. total_frames is an integer from 1 through 100000000. require_visual_coverage is a boolean.

Each clip has exactly id, kind, start_frame, end_frame. ID is a nonempty string of at most 200 characters, without control characters. Kind is visual or audio. Frames are integers with inclusive start and exclusive end. Valid intervals satisfy 0 <= start < end <= total_frames. Duplicate identities and out-of-range intervals are findings. Overlaps are allowed: compositing and transitions can intentionally overlap.

The union of valid declared visual intervals is compared with the full frame range. Audio clips do not fill visual gaps. If require_visual_coverage is true, any uncovered range is a finding. When false, gaps are reported without failing solely for gaps. Declaring a background visual interval can be correct for an intentional hold, but the helper does not inspect whether any real pixels exist.

Output includes exact rational duration, counts, up to 10 gap intervals and up to 100 findings, with full aggregate counts retained. It reports numeric indices, not clip identities or file paths. Exit 0 means the declared checks passed, 1 means findings, 2 means invalid input.

A pass does not verify actual visibility, valid source media, export timebase, frame rendering, visual rhythm, captions, audio synchronization or accessibility. Read back the real artifact with an appropriate tool when those properties matter. In a Markdown-only host, perform the same interval/identity/coverage reasoning using assigned capabilities or report the missing executable helper; do not fetch a remote substitute automatically.
