# Technical diagnosis

## Evidence layers

Record whether a finding comes from response headers, original HTML, rendered DOM, a crawler, an authenticated webmaster report or analytics. Different layers answer different questions. A reader-mode extraction may remove scripts; missing JSON-LD from that extraction establishes only that the extraction lacks it. Inspect actual source and rendered markup or a supported validation surface before concluding absence.

## Crawl and response

Check that important canonical URLs are reachable and internally discoverable. Inspect redirect chains and final status, including whether a nominal 200 page actually presents an error or empty content. Differentiate robots.txt access rules from page-level or header-level indexing directives. Blocking a crawler can prevent it from seeing a noindex instruction; do not propose conflicting controls without checking the desired removal behavior against current official guidance.

A sitemap should contain intended canonical, accessible URLs and useful modification dates based on real changes. Sitemap acceptance does not establish that every entry was crawled or indexed. A crawler's user agent, rendering configuration, authentication and depth can change observations; include them in a receipt.

## Canonicals and indexing

Inspect canonical targets, redirects, internal links and sitemaps together. A canonical pointing to a broken, redirected or unintended page is a concrete configuration issue. Search-engine selected canonicals require search-engine evidence; do not infer selection solely from the HTML tag. Parameter/facet policies should preserve real user navigation while controlling unwanted crawl space.

For index complaints, inspect the exact URL and property/date coverage of the supplied evidence. An absent search query result alone is a weak diagnostic. If authenticated URL inspection is unavailable, say that index state is unverified. Investigate recent migrations and changes before proposing large-scale content edits.

## Rendering and structured data

Compare meaningful source and rendered content on pages where JavaScript supplies important information. Verify links are usable and supported by the intended crawler. Do not assume that client rendering always fails or always succeeds. Record the test method and its limitations.

For structured data, validate syntax and applicable feature requirements separately. Check consistency with visible content and current official eligibility guidance. A static parse cannot test JavaScript injection, eligibility or actual search display. Avoid relying on a retired testing tool by verifying the current official tool before recommending it.

## Performance

Field metrics describe real users over a collection window; lab metrics help isolate a reproducible condition. Report device, connection/test conditions, sample/window and page versus origin scope. Prioritize causes supported by traces or project evidence rather than changing frameworks because of a single score. Recheck after an authorized repair and leave search impact as a later observation.
