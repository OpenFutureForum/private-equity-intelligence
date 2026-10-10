# Private Equity Intelligence Index

Open-source intelligence on private-equity firms, dealmakers, transactions, portfolio operations, and the advisers and service providers supporting the private-capital ecosystem.

**Publisher:** Open Future Forum  
**Current release:** 0.5.1 National Edition  
**Canonical website:** https://openfutureforum.github.io/private-equity-intelligence/

## What this project connects

The project is a public-source knowledge graph linking:

- companies and relationship-economy business models;
- private-equity acquisitions, exits and continuation transactions;
- investment and operating professionals;
- investment banks, lenders, lawyers and diligence providers;
- private-equity firms and professionals across 10 major U.S. hubs; and
- public evidence supporting each material claim.

The National Edition covers selected markets and transactions. Every person, market relationship and transaction attribution retains an explicit source trail.

The current dataset contains 667 professional profiles and 100 private-equity investment records. Of the people records, 476 are current U.S. atlas profiles across 10 markets, 24 are separately labeled historical transaction participants and 167 are in a user-supplied PE ecosystem directory.

The ecosystem directory accounts for all 168 submitted rows. One duplicate row was merged, producing 167 unique profiles. These entries preserve the supplied name, organization, title, tier and professional profile link. They are labeled as user supplied and have not been independently verified. No personal contact addresses are published.

Atlas figures report records in this release, not the estimated size of a market. The 476 atlas records comprise 47 explicit person-location biographies, 403 official office-directory matches and 26 clearly labeled firm-office associations. A firm can appear in more than one market.

The 100 investment records use two evidence levels. Fourteen records are based on transaction announcements or regulatory documents. Eighty-six records come from an official portfolio directory and establish only the investor, company, investment year and directory classification. They do not establish advisers, individual deal-team credit, purchase price or announcement date.

## Research lanes

1. **Relationship Economy:** companies where trusted access, professional communities and in-person interaction contribute to value.
2. **Deal Teams:** disclosed buyers, sellers, investors, advisers, lenders and named transaction professionals.
3. **United States PE Atlas:** professionals and firms across the San Francisco Bay Area, Los Angeles, Austin, Fort Worth, Chicago, Cleveland, Charlotte, Washington, New York and Boston.
4. **PE Services Ecosystem:** firms publicly documented on transactions plus a clearly labeled directory of professionals who sell to or support private equity.
5. **Research Depth:** transparent record-completeness scores, ownership histories and a public queue of evidence gaps.

## Architecture

- `data/` contains the canonical JSON records and source-specific expansion files.
- `scripts/validate.mjs` enforces evidence and privacy requirements.
- `scripts/build.mjs` deterministically generates the public site and downloads.
- `docs/` is the generated GitHub Pages artifact.
- `tests/` checks attribution, relationship integrity, privacy and output contracts.

Research-completeness scores measure documentation depth, not investment quality. No deal-team attribution is inferred from employment alone. Unknown values remain unknown.

Selected deep records also include structured underwriting signals taken from primary records. These cover disclosed audience scale, transaction economics, ownership periods, fund transitions, operating growth and stated value-creation plans. Each signal carries its own source references.

The active research program targets 50 deep records. It includes all transaction-announcement records plus selected portfolio records prioritized for software, data, information, professional services, healthcare services and recurring customer relationships. The public dashboard and downloadable research-program file report progress against the unchanged 75-point completeness threshold.

## Local verification

```bash
npm run check
npm run serve
```

Then visit `http://127.0.0.1:8080/`.

## Deployment

The GitHub Actions workflow validates and rebuilds the site before deploying `docs/` to GitHub Pages.

```text
canonical JSON
→ validation
→ deterministic build
→ tests and link checks
→ GitHub Pages artifact
```

## Editorial position

Open Future Forum owns, funds, publishes and edits this project. It is a publisher research product, not independent academic research, investment advice, a solicitation, or a representation that any profiled company is for sale.

See [METHODOLOGY.md](METHODOLOGY.md), [EDITORIAL-INDEPENDENCE.md](EDITORIAL-INDEPENDENCE.md), [PRIVACY.md](PRIVACY.md), [SOURCE-POLICY.md](SOURCE-POLICY.md), and [CONTRIBUTING.md](CONTRIBUTING.md).

Map data acknowledgments appear in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
