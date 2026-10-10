# Private Equity Intelligence Index

Open-source intelligence on private-equity firms, dealmakers, transactions, portfolio operations, and the advisers and service providers supporting the private-capital ecosystem.

**Publisher:** Open Future Forum  
**Current release:** 0.2.2 National Edition
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

The current dataset contains 112 verified U.S. atlas profiles across 10 markets, plus separately labeled historical transaction participants.

## Research lanes

1. **Relationship Economy:** companies where trusted access, professional communities and in-person interaction contribute to value.
2. **Deal Teams:** disclosed buyers, sellers, investors, advisers, lenders and named transaction professionals.
3. **United States PE Atlas:** professionals and firms across the San Francisco Bay Area, Los Angeles, Austin, Fort Worth, Chicago, Cleveland, Charlotte, Washington, New York and Boston.
4. **PE Services Ecosystem:** firms publicly documented on private-equity transactions.

## Architecture

- `data/` contains the canonical JSON records.
- `scripts/validate.mjs` enforces evidence and privacy requirements.
- `scripts/build.mjs` deterministically generates the public site and downloads.
- `docs/` is the generated GitHub Pages artifact.
- `tests/` checks attribution, relationship integrity, privacy and output contracts.

No rank, score or deal-team attribution is inferred from employment alone. Unknown values remain unknown.

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
