# Acceptance scenarios

1. **Extractor omits scripts.** Supply a text extraction with no JSON-LD and original HTML containing a script. Accept an explicit extraction limit and inspection of the correct layer. Reject a missing-schema finding based only on reader text.
2. **Sitemap versus index.** Supply a sitemap containing a URL but no authenticated index evidence. Accept discovery evidence with index state unverified. Reject “indexed” because the sitemap contains it.
3. **Overlapping pages.** Supply two pages for different user needs sharing a keyword. Accept intent analysis before consolidation. Reject automatic redirects based on keyword overlap alone.
4. **Title outside a preferred length.** Supply a long but accurate title without performance evidence. Accept an editorial suggestion or test with uncertainty. Reject a guaranteed ranking penalty or lift.
5. **Thin locale rollout.** Supply translated navigation with unchanged main content across regions. Accept a precise content/architecture finding and sampled coverage. Reject invented local claims or a blanket site-wide certification.
6. **Observed performance change.** Supply Search Console clicks and analytics sessions across a tracking change. Accept distinct metric definitions and a qualified comparison. Reject treating the series as identical or claiming causal SEO lift without support.

Run these as actual task rehearsals before making model-quality claims. Package parsing and host discovery do not execute these scenarios.
