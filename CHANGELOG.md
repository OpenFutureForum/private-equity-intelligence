# Changelog

## 0.4.0 (2026-10-10)

- Added a public Research Depth dashboard with transparent completeness scores and a prioritized research queue.
- Added ownership timelines to company dossiers.
- Added observed strategy, transaction-side, market, people and provider signals to firm profiles.
- Added completeness meters and missing-evidence signals to deal records.
- Kept completeness scoring separate from company quality, investment merit and the unpublished thesis framework.

## 0.3.1 (2026-10-10)

- Processed all 168 rows in a supplied PE ecosystem list and merged one duplicate into 167 unique professional profiles.
- Added a dedicated `ecosystem_directory` scope with supplied organization, title, tier and professional profile link fields.
- Excluded all personal contact addresses from the canonical data, public downloads and profile pages.
- Labeled every imported ecosystem record as user supplied and not independently verified.
- Kept ecosystem entries separate from U.S. atlas location evidence and transaction attribution.

## 0.3.0 (2026-10-10)

- Expanded the index to exactly 500 professional profiles and 100 private-equity investment records.
- Added 364 U.S. professionals from KKR's official people directory, preserving the published title, team and office location.
- Added 86 U.S. buyout, growth, health-care growth and impact investments from KKR's official portfolio directory.
- Added separate evidence tiers for transaction announcements and official portfolio records.
- Kept all adviser and individual deal-team fields empty on portfolio-directory records rather than inferring participation.
- Added source-specific expansion loading, exact release-count checks and duplicate-name validation.

## 0.2.3 (2026-10-10)

- Replaced the distorted atlas illustration with a geographic map built from U.S. Census Bureau cartographic boundaries.
- Positioned market markers from longitude and latitude rather than hand-tuned percentages.
- Relabeled atlas figures as index coverage counts and documented how the profile and firm totals reconcile.
- Added tests for atlas totals, geographic coordinates and the generated map.

## 0.2.2 (2026-10-10)

- Rewrote the public-facing copy in direct, specific language.
- Removed em dashes and en dashes from the site and canonical records.
- Added automated checks for dash-heavy editorial copy in generated pages and data.

## 0.2.1 (2026-10-10)

- Added 66 source-backed U.S. private-equity professional profiles, bringing the current atlas to 112 people.
- Deepened coverage in the San Francisco Bay Area, Los Angeles, Austin, Fort Worth, Chicago, Cleveland, Charlotte, Washington and Boston.
- Added current investing, operating, capital-markets, portfolio, legal, finance and investor-relations leaders while preserving location-confidence labels.
- Expanded the official-source register and person-to-market knowledge graph relationships.

## 0.2.0 (2026-10-10)

- Expanded the regional people atlas into a national map spanning 10 U.S. private-equity hubs.
- Added 29 professional profiles and 10 firm records backed by official biographies and firm pages.
- Added dedicated market pages, a visual U.S. atlas and downloadable market data.
- Added Apollo's pending Emerald and Questex acquisitions, including the publicly named advisers and transaction representatives.
- Added market nodes and source-backed person-to-market and firm-to-market relationships to the knowledge graph.

## 0.1.0 (2026-10-10)

- Established the source-backed transaction, firm, person and provider model.
- Added the Relationship Economy research thesis and framework.
- Added seed transactions for executive networks, B2B events and private-markets information.
- Added the Bay Area PE Atlas with explicit location-evidence labels.
- Added deterministic site generation, public JSON/CSV exports and integrity checks.
