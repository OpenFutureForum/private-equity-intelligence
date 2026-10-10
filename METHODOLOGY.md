# Methodology

## Purpose

The Private Equity Intelligence Index maps public, professionally relevant evidence about private-equity transactions, firms, people and advisers. It is designed to answer who acquired a business, who was publicly identified with the work, which advisers were involved, and how the transaction fits a broader investment thesis.

## Current scope

The National Edition combines a transaction cohort, a ten-market United States atlas of current private-equity professionals and firms, and a user-supplied PE ecosystem directory. Open Future Forum is discussed only as an illustrative business archetype. Its inclusion does not imply that it is for sale, seeking investment or involved in a transaction.

The transaction cohort has two evidence levels. `transaction_announcement` records use official announcements or regulatory documents. `official_portfolio_record` entries use an investor's official portfolio directory and establish only the investor, company, investment year and published classification. A portfolio record does not establish an announcement date, seller, price, adviser or individual deal-team member.

## Evidence classes

Sources are ordered by their usual evidentiary weight:

1. regulatory or government record;
2. official transaction document;
3. official company, investor or adviser announcement;
4. official portfolio or professional directory;
5. official professional biography;
6. first-party Open Future Forum research;
7. reputable independent reporting; and
8. secondary discovery material.

Search snippets are discovery aids, not evidence records. A source supports only the claims identified in its `supports` field.

## Person-to-deal attribution

People are connected to transactions only when a public source supports one of the following labels:

- `named_deal_team`: directly identified as part of the transaction team;
- `named_adviser`: named by an adviser or transaction document;
- `official_transaction_spokesperson`: quoted or listed as the responsible firm representative;
- `relevant_professional_not_attributed`: professionally relevant, but not confirmed on the deal; or
- `unknown`.

Only the first three are displayed as confirmed transaction participation. Working at a firm when a transaction occurred is insufficient.

## United States atlas inclusion

A person enters the U.S. atlas only when a source supports an explicit location, an official office-directory match, or a record clearly labeled `firm_office_association`. The latter means the firm has a verified office in the market and the person has a verified current role, but the source does not establish that the person personally works from that office.

The current market layer covers the San Francisco Bay Area, Los Angeles, Austin, Fort Worth, Chicago, Cleveland, Charlotte, Washington, New York and Boston. These are selected research markets, not a census of U.S. private equity. Missing people, firms and cities have not been verified.

## User-supplied PE ecosystem directory

The `ecosystem_directory` scope preserves the submitted professional name, organization, title, tier and professional profile link. Every entry is labeled `user_supplied_unverified`. The submitted list is not used to infer location, current employment, deal participation or endorsement. One duplicate among 168 submitted rows is merged, leaving 167 unique profiles. Personal contact addresses are not retained in the published data.

## Relationship-economy framework

The project evaluates the characteristics of relationship-driven businesses without claiming they are immune to artificial intelligence or disruption. Framework dimensions include:

- relationship dependency;
- trust dependency;
- access scarcity;
- recurring revenue;
- community participation;
- proprietary data generation;
- in-person experience value;
- content-automation exposure;
- sponsor concentration;
- key-person dependency;
- acquisition potential; and
- operational scalability.

The first edition publishes the framework and evidence prompts, not company scores. Numerical scoring will not launch until records satisfy a defined evidence threshold and the weighting system has been reviewed.

## Known, derived and editorial fields

- **Verified:** directly supported by a source.
- **Derived:** reproducibly calculated from verified data.
- **Editorial:** publisher interpretation, labeled visibly.
- **Unknown:** not established by the public sources reviewed for this release.

Absence of a person, adviser or value does not show that none existed; it means the project has not verified it.

## Freshness

Every canonical record includes `last_verified`. Time-sensitive employment, ownership and transaction status should be reviewed at each material release. Historical transaction roles are preserved as historical even when a professional later changes firms.

## Corrections

Corrections should identify the exact record, disputed claim, proposed replacement and a reliable source. Repository history preserves accepted changes.
