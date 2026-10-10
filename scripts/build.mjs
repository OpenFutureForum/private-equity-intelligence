import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs');
const base = '/private-equity-intelligence/';
const siteUrl = 'https://openfutureforum.github.io/private-equity-intelligence/';

const load = async (name) => JSON.parse(await readFile(path.join(root, 'data', `${name}.json`), 'utf8'));
const [companies, firms, people, providers, deals, sources, framework, markets] = await Promise.all([
  load('companies'), load('firms'), load('people'), load('providers'), load('deals'), load('sources'), load('framework'), load('markets')
]);
const usTopology = JSON.parse(await readFile(path.join(root, 'node_modules', 'us-atlas', 'states-albers-10m.json'), 'utf8'));
const usMapPath = geoPath(null).digits(0);
const usOutlinePath = usMapPath(feature(usTopology, usTopology.objects.nation));
const usStateBordersPath = usMapPath(mesh(usTopology, usTopology.objects.states, (a, b) => a !== b));
const usProjection = geoAlbersUsa().scale(1300).translate([487.5, 305]);

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const companyMap = byId(companies);
const firmMap = byId(firms);
const peopleMap = byId(people);
const providerMap = byId(providers);
const sourceMap = byId(sources);
const marketMap = byId(markets);

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const link = (href, label, className = '') => `<a${className ? ` class="${className}"` : ''} href="${href}">${esc(label)}</a>`;
const internal = (section, slug, label, className = '') => link(`${base}${section}/${slug}/`, label, className);
const sourceLinks = (ids = []) => ids.map((id) => {
  const s = sourceMap.get(id);
  return s ? `<a class="source-chip" href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.publisher)} ↗</a>` : '';
}).join('');

const write = async (relative, contents) => {
  const destination = path.join(out, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
};

const nav = `
  <a class="brand" href="${base}" aria-label="Private Equity Intelligence home">
    <span class="brand-mark">PE</span><span>Intelligence Index</span>
  </a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
  <nav id="site-nav" aria-label="Primary navigation">
    <a href="${base}deals/">Deals</a>
    <a href="${base}atlas/">U.S. Atlas</a>
    <a href="${base}people/">People</a>
    <a href="${base}firms/">Firms</a>
    <a href="${base}providers/">Service ecosystem</a>
    <a href="${base}thesis/">Investment thesis</a>
    <a href="${base}data/">Data</a>
  </nav>`;

function layout({ title, description, pagePath = '', eyebrow = '', body, schema = null }) {
  const canonical = `${siteUrl}${pagePath}`;
  const structured = schema ?? {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    publisher: { '@type': 'Organization', name: 'Open Future Forum', url: 'https://openfutureforum.com/' }
  };
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} · Open Future Forum</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website"><meta property="og:url" content="${canonical}">
  <meta name="theme-color" content="#071727"><link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${base}assets/styles.css">
  <script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>
</head><body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="shell header-inner">${nav}</div></header>
  <main id="main">${eyebrow ? `<div class="shell page-kicker">${esc(eyebrow)}</div>` : ''}${body}</main>
  <footer><div class="shell footer-grid"><div><div class="footer-title">Private Equity Intelligence Index</div><p>Public-record research from Open Future Forum.</p></div><div><a href="${base}atlas/">U.S. Atlas</a><a href="${base}methodology/">Methodology</a><a href="${base}sources/">Sources</a><a href="${base}corrections/">Corrections</a></div><div><a href="${base}publisher/">Publisher</a><a href="${base}privacy/">Privacy</a><a href="https://github.com/OpenFutureForum/private-equity-intelligence">GitHub ↗</a></div></div><div class="shell footer-floor"><span>National Edition · v0.2.3</span><span>Data verified through 10 October 2026</span></div></footer>
  <script src="${base}assets/app.js" defer></script>
</body></html>`;
}

const pageHero = (eyebrow, title, intro, aside = '') => `<section class="page-hero"><div class="shell page-hero-grid"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="lede">${esc(intro)}</p></div>${aside ? `<aside class="hero-aside">${aside}</aside>` : ''}</div></section>`;
const sectionHead = (eyebrow, title, copy = '') => `<div class="section-head"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div>${copy ? `<p>${esc(copy)}</p>` : ''}</div>`;
const stat = (number, label) => `<div class="stat"><strong>${esc(number)}</strong><span>${esc(label)}</span></div>`;
const tag = (value, tone = '') => `<span class="tag${tone ? ` tag-${tone}` : ''}">${esc(pretty(value))}</span>`;
const getDealYear = (d) => d.announced_on.slice(0, 4);

const relationCounts = {
  providerRoles: deals.reduce((n, d) => n + d.provider_roles.length, 0),
  peopleRoles: deals.reduce((n, d) => n + d.people_roles.length, 0),
  citations: new Set(deals.flatMap((d) => d.source_ids)).size
};

function dealCard(deal) {
  const company = companyMap.get(deal.target_company_id);
  const buyers = deal.buyer_firm_ids.map((id) => firmMap.get(id)?.name).filter(Boolean).join(' + ');
  return `<article class="card deal-card filter-card" data-search="${esc([deal.title, company?.name, buyers, deal.transaction_type, deal.status, getDealYear(deal)].join(' ').toLowerCase())}">
    <div class="card-top"><span class="year">${getDealYear(deal)}</span>${tag(deal.status, deal.status === 'announced' ? 'amber' : 'green')}</div>
    <h3>${internal('deals', deal.slug, deal.title)}</h3>
    <p>${esc(deal.investment_thesis)}</p>
    <dl class="mini-facts"><div><dt>Target</dt><dd>${internal('companies', company.slug, company.name)}</dd></div><div><dt>Buyer</dt><dd>${esc(buyers || deal.buyer_names.join(', '))}</dd></div><div><dt>Value</dt><dd>${esc(deal.enterprise_value?.display ?? 'Not publicly established')}</dd></div></dl>
    <div class="card-foot"><span>${deal.provider_roles.length} provider roles</span><span>${deal.people_roles.length} named people</span></div>
  </article>`;
}

function personCard(person) {
  const firm = person.current_firm_id ? firmMap.get(person.current_firm_id) : null;
  const market = person.market_id ? marketMap.get(person.market_id) : null;
  const related = deals.filter((d) => d.people_roles.some((r) => r.person_id === person.id));
  return `<article class="card person-card filter-card" data-search="${esc([person.name, person.current_title, firm?.name, person.location, market?.name, person.profile_scope.join(' ')].join(' ').toLowerCase())}">
    <div class="person-monogram" aria-hidden="true">${person.name.split(/\s+/).map((x) => x[0]).slice(0,2).join('')}</div>
    <div><p class="card-label">${market ? `${esc(market.name)} atlas` : 'Transaction attribution'}</p><h3>${internal('people', person.slug, person.name)}</h3>
    <p>${esc(person.current_title ?? (related.length ? `${related.length} sourced transaction ${related.length === 1 ? 'role' : 'roles'}` : 'Historical professional profile'))}${firm ? ` · ${internal('firms', firm.slug, firm.name)}` : ''}</p>
    ${person.location ? `<span class="location">${esc(person.location)}</span>` : ''}</div>
  </article>`;
}

function firmCard(firm) {
  const firmDeals = deals.filter((d) => d.buyer_firm_ids.includes(firm.id) || d.seller_firm_ids.includes(firm.id));
  const firmPeople = people.filter((p) => p.current_firm_id === firm.id);
  const marketNames = (firm.us_market_ids ?? []).map((id) => marketMap.get(id)?.name).filter(Boolean);
  return `<article class="card filter-card" data-search="${esc([firm.name, firm.firm_type, ...marketNames].join(' ').toLowerCase())}"><p class="card-label">${esc(pretty(firm.firm_type))}</p><h3>${internal('firms', firm.slug, firm.name)}</h3><p>${esc(firm.description)}</p><div class="card-foot"><span>${firmDeals.length} mapped deals</span><span>${marketNames.length ? `${marketNames.length} U.S. ${marketNames.length === 1 ? 'hub' : 'hubs'}` : `${firmPeople.length} current profiles`}</span></div></article>`;
}

function providerCard(provider) {
  const roles = deals.flatMap((d) => d.provider_roles.filter((r) => r.provider_id === provider.id).map((r) => ({ deal: d, ...r })));
  return `<article class="card filter-card" data-search="${esc([provider.name, provider.category, ...roles.map((r) => r.role)].join(' ').toLowerCase())}"><p class="card-label">${esc(pretty(provider.category))}</p><h3>${internal('providers', provider.slug, provider.name)}</h3><p>${esc(provider.description)}</p><div class="card-foot"><span>${roles.length} sourced ${roles.length === 1 ? 'engagement' : 'engagements'}</span></div></article>`;
}

function controls(placeholder, filters = []) {
  return `<div class="controls" data-controls><label class="search-label"><span class="sr-only">Search</span><input type="search" data-filter-input placeholder="${esc(placeholder)}"></label>${filters.length ? `<div class="filter-pills" role="group" aria-label="Filter results"><button class="active" data-filter="all">All</button>${filters.map((f) => `<button data-filter="${esc(f.value)}">${esc(f.label)}</button>`).join('')}</div>` : ''}<span class="result-count" data-result-count></span></div>`;
}

const homeBody = `
<section class="home-hero"><div class="shell hero-grid"><div class="hero-copy"><p class="eyebrow">Open Future Forum Research · U.S. National Edition</p><h1>The people and firms behind private-equity deals.</h1><p class="lede">Public records connecting private-equity transactions with investors, named deal participants, advisers and relationship-driven businesses.</p><div class="hero-actions"><a class="button button-primary" href="${base}atlas/">Explore the U.S. atlas</a><a class="button button-secondary" href="${base}explorer/">Trace the deals</a></div><p class="freshness"><span></span>Verified through 10 October 2026 · Deal credits require a transaction source</p></div>
<div class="network-panel" aria-label="Illustrative relationship map"><div class="network-grid"></div><div class="node node-company"><small>Company</small><b>Relationship platform</b></div><div class="node node-firm"><small>Investor</small><b>Private equity</b></div><div class="node node-person"><small>People</small><b>Named deal team</b></div><div class="node node-provider"><small>Ecosystem</small><b>Advisers + lenders</b></div><div class="node node-evidence"><small>Evidence</small><b>Public sources</b></div><svg viewBox="0 0 600 380" aria-hidden="true"><path d="M290 185 C210 120 185 95 130 75"/><path d="M310 185 C405 130 430 105 485 82"/><path d="M300 205 C235 275 200 300 145 318"/><path d="M320 205 C400 265 430 295 500 315"/></svg></div></div></section>
<section class="metric-band"><div class="shell stats-grid">${stat(deals.length, 'transactions')}${stat(people.length, 'professional profiles')}${stat(providers.length, 'service providers')}${stat(markets.length, 'U.S. hubs')}</div></section>
<section class="section shell">${sectionHead('Research focus', 'Transactions reveal who financed, advised and led the work.', 'Each connection begins with a public record. People and providers are included only when the cited source identifies their role.')}<div class="three-up"><article class="feature"><span>01</span><h3>Relationship Economy</h3><p>Executive networks, events and specialist information businesses earn revenue from access, trust and professional communities.</p><a href="${base}thesis/">Read the thesis →</a></article><article class="feature"><span>02</span><h3>Named Deal Teams</h3><p>A person receives deal credit only when a transaction source identifies or quotes them. Employment at the firm is not enough.</p><a href="${base}deals/">Trace the deals →</a></article><article class="feature"><span>03</span><h3>PE Services Ecosystem</h3><p>Public disclosures connect investment banks, law firms, lenders and diligence providers to specific engagements.</p><a href="${base}providers/">Map the providers →</a></article></div></section>
<section class="section section-tint"><div class="shell">${sectionHead('Selected transactions', 'A focused transaction set', 'The current set covers B2B events, executive networks and private-markets information businesses.')}<div class="cards-grid">${deals.slice().sort((a,b) => b.announced_on.localeCompare(a.announced_on)).slice(0,6).map(dealCard).join('')}</div><div class="section-action"><a class="text-link" href="${base}deals/">View all ${deals.length} transactions →</a></div></div></section>
<section class="section shell"><div class="split-callout"><div><p class="eyebrow">United States PE atlas</p><h2>Ten private-equity markets with explicit location evidence.</h2><p>Browse professionals and firms from the Bay Area and Los Angeles to Texas, Chicago, the East Coast and Boston. Each profile states whether the location comes from a personal biography, an office directory or a firm-office association.</p><a class="button button-dark" href="${base}atlas/">Open the national map</a></div><div class="confidence-stack"><div><b>10 covered markets</b><span>Regional entry points across the country</span></div><div><b>${people.filter((p) => p.profile_scope.includes('us_atlas')).length} profiles in index</b><span>Current roles supported by public records</span></div><div><b>${firms.filter((f) => f.us_market_ids?.length).length} firm records</b><span>Deal activity does not establish office location</span></div></div></div></section>
<section class="section evidence-strip"><div class="shell"><p class="eyebrow">Evidence standard</p><h2>Every material claim links to a public source.</h2><div class="evidence-flow"><span>Public source</span><i>→</i><span>Canonical record</span><i>→</i><span>Validated relationship</span><i>→</i><span>Public page + download</span></div><div class="hero-actions"><a class="button button-primary" href="${base}sources/">Browse all sources</a><a class="button button-secondary" href="${base}data/">Download the data</a></div></div></section>`;

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'assets'), { recursive: true });
await Promise.all([
  copyFile(path.join(root, 'src', 'styles.css'), path.join(out, 'assets', 'styles.css')),
  copyFile(path.join(root, 'src', 'app.js'), path.join(out, 'assets', 'app.js'))
]);

await write('index.html', layout({
  title: 'Private Equity Intelligence Index',
  description: 'Public-source research on private-equity deals, dealmakers, U.S. market hubs and service providers.',
  body: homeBody,
  schema: { '@context':'https://schema.org', '@type':'Dataset', name:'Private Equity Intelligence Index', description:'Cited relationships among private-equity transactions, firms, people, companies and advisers.', url:siteUrl, creator:{'@type':'Organization',name:'Open Future Forum',url:'https://openfutureforum.com/'}, dateModified:'2026-10-10', license:'https://creativecommons.org/licenses/by/4.0/' }
}));

const dealsBody = `${pageHero('Transaction intelligence', 'Deals', 'Follow ownership changes across executive networks, B2B events and private-markets information businesses.', `${stat(deals.length, 'transactions')}${stat(relationCounts.providerRoles, 'provider roles')}`)}<section class="section shell">${controls('Search company, buyer, type or year…')}<div class="cards-grid filter-results">${deals.slice().sort((a,b) => b.announced_on.localeCompare(a.announced_on)).map(dealCard).join('')}</div><div class="empty-state" hidden>No matching transactions.</div></section>`;
await write('deals/index.html', layout({ title:'Deals', description:'Private-equity transactions with buyers, sellers, disclosed values, advisers and named professionals.', pagePath:'deals/', body:dealsBody }));

for (const deal of deals) {
  const company = companyMap.get(deal.target_company_id);
  const buyers = deal.buyer_firm_ids.map((id) => firmMap.get(id)).filter(Boolean);
  const sellers = deal.seller_firm_ids.map((id) => firmMap.get(id)).filter(Boolean);
  const providerRows = deal.provider_roles.map((r) => { const p = providerMap.get(r.provider_id); return `<tr><td>${internal('providers', p.slug, p.name)}</td><td>${esc(r.role)}</td><td>${tag(r.side)}</td><td>${sourceLinks([r.source_id])}</td></tr>`; }).join('');
  const personRows = deal.people_roles.map((r) => { const p = peopleMap.get(r.person_id); return `<article class="relationship-row"><div><p class="card-label">${esc(pretty(r.label))}</p><h3>${internal('people', p.slug, p.name)}</h3><p>${esc(r.organization)}</p></div><div><p>${esc(r.attribution)}</p>${sourceLinks([r.source_id])}</div></article>`; }).join('');
  const body = `${pageHero(`${getDealYear(deal)} · ${pretty(deal.transaction_type)}`, deal.title, deal.investment_thesis, `${tag(deal.status, deal.status === 'announced' ? 'amber' : 'green')}<div class="aside-value"><small>Disclosed value</small><strong>${esc(deal.enterprise_value?.display ?? 'Not established')}</strong></div>`)}
  <section class="section shell detail-grid"><div class="detail-main"><div class="deal-route"><div><small>Target</small>${internal('companies', company.slug, company.name)}</div><span>←</span><div><small>Buyer${buyers.length > 1 ? 's' : ''}</small>${buyers.map((f) => internal('firms', f.slug, f.name)).join('<br>') || esc(deal.buyer_names.join(', '))}</div></div>
  <div class="content-block"><p class="eyebrow">Transaction facts</p><dl class="facts"><div><dt>Announced</dt><dd>${esc(deal.announced_on)}</dd></div><div><dt>Status</dt><dd>${esc(pretty(deal.status))}</dd></div><div><dt>Transaction type</dt><dd>${esc(pretty(deal.transaction_type))}</dd></div><div><dt>Seller</dt><dd>${sellers.map((f) => internal('firms', f.slug, f.name)).join(', ') || esc(deal.seller_names.join(', ') || 'Not established')}</dd></div></dl></div>
  <div class="content-block"><p class="eyebrow">Publicly disclosed provider roles</p>${providerRows ? `<div class="table-wrap"><table><thead><tr><th>Provider</th><th>Role</th><th>Side</th><th>Evidence</th></tr></thead><tbody>${providerRows}</tbody></table></div>` : '<p class="muted-box">No provider role has been added from the reviewed public sources.</p>'}</div>
  <div class="content-block"><p class="eyebrow">Named transaction professionals</p>${personRows || '<p class="muted-box">No individual transaction attribution has been added from the reviewed public sources.</p>'}</div></div>
  <aside class="detail-aside"><div class="source-box"><h2>Evidence</h2><p>These sources support the material claims on this record.</p>${deal.source_ids.map((id) => { const s=sourceMap.get(id); return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`; }).join('')}</div><div class="definition-box"><b>Attribution rule</b><p>A person is confirmed on this deal only when a public source names or quotes them in the transaction context.</p><a href="${base}methodology/">Methodology →</a></div></aside></section>`;
  await write(`deals/${deal.slug}/index.html`, layout({ title:deal.title, description:deal.investment_thesis, pagePath:`deals/${deal.slug}/`, eyebrow:'Deal record', body }));
}

const atlasPeople = people.filter((p) => p.profile_scope.includes('us_atlas'));
const transactionPeople = people.filter((p) => p.profile_scope.includes('transaction_attribution'));
const peopleFilters = [...markets.map((market) => ({value:market.id,label:market.name})), {value:'transaction_attribution',label:'Deal-linked'}];
const peopleBody = `${pageHero('Professional intelligence', 'People', 'Current professionals across ten U.S. private-equity hubs, alongside historical, source-specific transaction attribution.', `${stat(atlasPeople.length, 'U.S. atlas')}${stat(transactionPeople.length, 'deal-linked')}`)}<section class="section shell">${controls('Search person, firm, title or market…',peopleFilters)}<div class="people-grid filter-results">${people.map((p) => personCard(p).replace('filter-card"', `filter-card" data-category="${p.market_id ?? p.profile_scope.join(' ')}"`)).join('')}</div><div class="empty-state" hidden>No matching people.</div></section>`;
await write('people/index.html', layout({title:'People',description:'Private-equity professionals across ten U.S. hubs and people publicly named on transactions.',pagePath:'people/',body:peopleBody}));

for (const person of people) {
  const firm = person.current_firm_id ? firmMap.get(person.current_firm_id) : null;
  const market = person.market_id ? marketMap.get(person.market_id) : null;
  const related = deals.flatMap((d) => d.people_roles.filter((r) => r.person_id === person.id).map((r) => ({deal:d,...r})));
  const body = `${pageHero(market ? `U.S. professional · ${market.name}` : 'Historical transaction attribution', person.name, person.summary, person.current_title ? `<p class="aside-title">${esc(person.current_title)}</p>${firm ? internal('firms',firm.slug,firm.name) : ''}${market ? `<a class="market-jump" href="${base}atlas/${market.slug}/">View ${esc(market.name)} →</a>` : ''}` : `${stat(related.length,'sourced roles')}`)}<section class="section shell detail-grid"><div class="detail-main"><div class="content-block"><p class="eyebrow">Profile facts</p><dl class="facts"><div><dt>Scope</dt><dd>${market ? internal('atlas',market.slug,market.name) : person.profile_scope.map(pretty).join(', ')}</dd></div><div><dt>Current role</dt><dd>${esc(person.current_title ?? 'Not asserted')}</dd></div><div><dt>Current firm</dt><dd>${firm ? internal('firms',firm.slug,firm.name) : 'Not asserted'}</dd></div><div><dt>Location</dt><dd>${esc(person.location ?? 'Not asserted')}</dd></div><div><dt>Location evidence</dt><dd>${esc(person.location_evidence ? pretty(person.location_evidence) : 'Not applicable')}</dd></div><div><dt>Last verified</dt><dd>${esc(person.last_verified)}</dd></div></dl></div><div class="content-block"><p class="eyebrow">Sourced transaction relationships</p>${related.length ? related.map((r) => `<article class="relationship-row"><div><p class="card-label">${esc(pretty(r.label))}</p><h3>${internal('deals',r.deal.slug,r.deal.title)}</h3><p>${esc(r.organization)}</p></div><div><p>${esc(r.attribution)}</p>${sourceLinks([r.source_id])}</div></article>`).join('') : '<p class="muted-box">No deal role is attributed. This is a current professional profile only.</p>'}</div></div><aside class="detail-aside"><div class="source-box"><h2>Profile sources</h2>${person.source_ids.map((id) => {const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`}).join('')}</div><div class="definition-box"><b>Privacy boundary</b><p>Only public professional information is included. Personal contact details and inferred attributes are excluded.</p></div></aside></section>`;
  await write(`people/${person.slug}/index.html`, layout({title:person.name,description:person.summary,pagePath:`people/${person.slug}/`,body}));
}

const marketSummary = (market) => {
  const marketPeople = atlasPeople.filter((person) => person.market_id === market.id);
  const marketFirms = firms.filter((firm) => firm.us_market_ids?.includes(market.id));
  return `<article class="market-card"><div><p class="card-label">${esc(market.region)}</p><h3>${internal('atlas',market.slug,market.name)}</h3><p>${esc(market.description)}</p></div><div class="market-counts"><span><b>${marketPeople.length}</b> profiles in index</span><span><b>${marketFirms.length}</b> firm records</span></div></article>`;
};
const mapDots = markets.map((market) => {
  const projected = usProjection([market.coordinates.longitude, market.coordinates.latitude]);
  const profileCount = atlasPeople.filter((person) => person.market_id === market.id).length;
  const x = (projected[0] / 9.75).toFixed(2);
  const y = (projected[1] / 6.1).toFixed(2);
  return `<a class="market-dot market-${market.slug}" style="--x:${x}%;--y:${y}%" href="${base}atlas/${market.slug}/" aria-label="${esc(market.name)}: ${profileCount} profiles in this index"><i></i><span>${esc(market.name)}</span></a>`;
}).join('');
const atlasFirms = firms.filter((firm) => firm.us_market_ids?.length);
const directLocationProfiles = atlasPeople.filter((person) => ['explicit_person_bio', 'explicit_office_filter'].includes(person.location_evidence)).length;
const firmAssociationProfiles = atlasPeople.filter((person) => person.location_evidence === 'firm_office_association').length;
const firmMarketAssociations = atlasFirms.reduce((total, firm) => total + firm.us_market_ids.length, 0);
const atlasBody = `${pageHero('United States private equity atlas','A national map of private-equity people and firms','This page reports records in the index. The figures are coverage counts, not estimates of each market’s total private-equity workforce.',`${stat(markets.length,'covered markets')}${stat(atlasPeople.length,'profiles in index')}${stat(atlasFirms.length,'firm records')}`)}
<section class="section shell"><div class="atlas-map" aria-label="Map of covered United States private-equity markets"><svg viewBox="0 0 975 610" role="img" aria-label="United States map based on Census Bureau cartographic boundaries"><path class="map-nation" d="${usOutlinePath}"/><path class="map-states" d="${usStateBordersPath}"/></svg>${mapDots}<div class="map-legend"><span></span> Market covered by this index</div></div>
<p class="map-source">Map geometry: <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" target="_blank" rel="noreferrer">U.S. Census Bureau cartographic boundaries</a> via <a href="https://github.com/topojson/us-atlas" target="_blank" rel="noreferrer">us-atlas</a>.</p>
<div class="atlas-note"><b>How to read the counts</b><p>The market cards total ${atlasPeople.length} profile records. ${directLocationProfiles} have person-level or official office-directory location evidence. ${firmAssociationProfiles} use a labeled firm-office association. The ${atlasFirms.length} unique firm records create ${firmMarketAssociations} market associations because some firms appear in more than one market.</p></div>
<div class="market-grid">${markets.map(marketSummary).join('')}</div></section>`;
await write('atlas/index.html', layout({title:'United States PE Atlas',description:'A cited map of private-equity professionals and firms across ten major U.S. hubs.',pagePath:'atlas/',body:atlasBody}));

for (const market of markets) {
  const marketPeople = atlasPeople.filter((person) => person.market_id === market.id);
  const marketFirms = firms.filter((firm) => firm.us_market_ids?.includes(market.id));
  const evidenceModes = [...new Set(marketPeople.map((person) => person.location_evidence))];
  const body = `${pageHero(`${market.region} · U.S. PE atlas`,market.name,market.description,`${stat(marketPeople.length,'profiles in index')}${stat(marketFirms.length,'firm records')}`)}
  <section class="section shell"><div class="market-detail-intro"><div><p class="eyebrow">Market coverage</p><h2>Current profiles and firms with cited location evidence.</h2></div><p>This page combines current professional profiles with verified firm presence. Location evidence used here: ${evidenceModes.map(pretty).join(', ')}.</p></div>
  <div class="content-block"><p class="eyebrow">Profiles in this index</p><div class="people-grid">${marketPeople.map(personCard).join('')}</div></div>
  <div class="content-block"><p class="eyebrow">Firms represented in this hub</p><div class="cards-grid">${marketFirms.map(firmCard).join('')}</div></div>
  <div class="atlas-note"><b>What absence means</b><p>This release is selective. A missing person or firm has not been researched or verified yet.</p></div></section>`;
  await write(`atlas/${market.slug}/index.html`, layout({title:`${market.name} private equity`,description:`Cited private-equity people and firms in ${market.name}.`,pagePath:`atlas/${market.slug}/`,body}));
}

const firmsBody = `${pageHero('Capital map', 'Firms', 'Investors and strategic acquirers represented in transaction research and the national U.S. market atlas.', `${stat(firms.length,'firms')}${stat(atlasFirms.length,'U.S. atlas firms')}`)}<section class="section shell">${controls('Search firm, strategy or U.S. market…')}<div class="cards-grid filter-results">${firms.map(firmCard).join('')}</div><div class="empty-state" hidden>No matching firms.</div></section>`;
await write('firms/index.html', layout({title:'Firms',description:'Private-equity firms, alternative asset managers and strategic acquirers represented in the index.',pagePath:'firms/',body:firmsBody}));

for (const firm of firms) {
  const firmDeals = deals.filter((d) => d.buyer_firm_ids.includes(firm.id) || d.seller_firm_ids.includes(firm.id));
  const firmPeople = people.filter((p) => p.current_firm_id === firm.id);
  const firmMarkets = (firm.us_market_ids ?? []).map((id) => marketMap.get(id)).filter(Boolean);
  const marketAside = firmMarkets.length ? `<p class="aside-title">U.S. atlas markets</p><div class="market-link-list">${firmMarkets.map((market) => internal('atlas',market.slug,market.name)).join('')}</div>` : `<a class="button button-secondary" href="${esc(firm.website)}" target="_blank" rel="noreferrer">Official website ↗</a>`;
  const body = `${pageHero(pretty(firm.firm_type), firm.name, firm.description, marketAside)}<section class="section shell"><div class="content-block"><p class="eyebrow">Mapped transactions</p><div class="cards-grid">${firmDeals.length ? firmDeals.map(dealCard).join('') : '<p class="muted-box">This atlas firm is not yet connected to a transaction in the National Edition.</p>'}</div></div>${firmPeople.length ? `<div class="content-block"><p class="eyebrow">Current professionals</p><div class="people-grid">${firmPeople.map(personCard).join('')}</div></div>` : ''}<div class="content-block"><p class="eyebrow">Sources</p><div class="source-chips">${sourceLinks(firm.source_ids)}</div></div></section>`;
  await write(`firms/${firm.slug}/index.html`, layout({title:firm.name,description:firm.description,pagePath:`firms/${firm.slug}/`,body}));
}

const categories = [...new Set(providers.map((p)=>p.category))].sort();
const providersBody = `${pageHero('PE services ecosystem', 'Service providers', 'The banks, law firms, lenders and diligence specialists publicly named around the researched transactions.', `${stat(providers.length,'firms')}${stat(relationCounts.providerRoles,'engagements')}`)}<section class="section shell">${controls('Search provider, category or role…',categories.map((c)=>({value:c,label:pretty(c)})))}<div class="cards-grid filter-results">${providers.map((p)=>providerCard(p).replace('filter-card"',`filter-card" data-category="${p.category}"`)).join('')}</div><div class="empty-state" hidden>No matching providers.</div></section>`;
await write('providers/index.html', layout({title:'PE service providers',description:'Investment banks, law firms, lenders and diligence providers connected through publicly disclosed PE transaction roles.',pagePath:'providers/',body:providersBody}));

for (const provider of providers) {
  const roles = deals.flatMap((d)=>d.provider_roles.filter((r)=>r.provider_id===provider.id).map((r)=>({deal:d,...r})));
  const body = `${pageHero(pretty(provider.category),provider.name,provider.description,`${stat(roles.length,'sourced engagements')}`)}<section class="section shell detail-grid"><div class="detail-main"><div class="content-block"><p class="eyebrow">Documented transaction work</p>${roles.map((r)=>`<article class="relationship-row"><div><p class="card-label">${esc(pretty(r.side))} side</p><h3>${internal('deals',r.deal.slug,r.deal.title)}</h3></div><div><p><b>${esc(r.role)}</b></p>${sourceLinks([r.source_id])}</div></article>`).join('')}</div></div><aside class="detail-aside"><div class="source-box"><h2>Evidence basis</h2><p>Inclusion means the provider was publicly named on at least one mapped transaction.</p>${provider.source_ids.map((id)=>{const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`}).join('')}</div><div class="definition-box"><a href="${esc(provider.website)}" target="_blank" rel="noreferrer">Official website ↗</a></div></aside></section>`;
  await write(`providers/${provider.slug}/index.html`, layout({title:provider.name,description:provider.description,pagePath:`providers/${provider.slug}/`,body}));
}

for (const company of companies) {
  const companyDeals = deals.filter((d)=>d.target_company_id===company.id);
  const body = `${pageHero(pretty(company.company_type),company.name,company.description,company.illustrative_only ? `${tag('illustrative only','amber')}<p>Not presented as a sale target.</p>` : `${stat(companyDeals.length,'mapped transactions')}`)}<section class="section shell"><div class="detail-grid"><div class="detail-main"><div class="content-block"><p class="eyebrow">Relationship model</p><div class="tag-row">${company.relationship_archetypes.map((x)=>tag(x)).join('')}</div></div><div class="content-block"><p class="eyebrow">Transaction history in this edition</p><div class="cards-grid">${companyDeals.length ? companyDeals.map(dealCard).join('') : '<p class="muted-box">No transaction is associated with this illustrative business archetype.</p>'}</div></div></div><aside class="detail-aside"><div class="source-box"><h2>Company sources</h2>${company.source_ids.map((id)=>{const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`}).join('')}</div><div class="definition-box"><a href="${esc(company.website)}" target="_blank" rel="noreferrer">Official website ↗</a></div></aside></div></section>`;
  await write(`companies/${company.slug}/index.html`, layout({title:company.name,description:company.description,pagePath:`companies/${company.slug}/`,body}));
}

const explorerRows = deals.map((d)=>{
  const c=companyMap.get(d.target_company_id);
  const buyers=d.buyer_firm_ids.map((id)=>firmMap.get(id)?.name).filter(Boolean).join(' + ');
  const providersText=d.provider_roles.map((r)=>providerMap.get(r.provider_id)?.name).filter(Boolean).join(', ');
  return `<tr class="filter-card" data-search="${esc([d.title,c.name,buyers,providersText,d.transaction_type,d.status,getDealYear(d)].join(' ').toLowerCase())}"><td><b>${internal('deals',d.slug,d.title)}</b><span class="mobile-meta">${getDealYear(d)} · ${pretty(d.status)}</span></td><td>${esc(buyers)}</td><td>${esc(pretty(d.transaction_type))}</td><td>${esc(providersText || 'None verified')}</td><td>${esc(d.enterprise_value?.display ?? 'Not disclosed')}</td></tr>`;
}).join('');
const explorerBody = `${pageHero('Relationship explorer','Explore the network','Search transactions, investors and providers. Every row links to the deal record and its supporting sources.',`${stat(deals.length,'deals')}${stat(relationCounts.providerRoles + relationCounts.peopleRoles,'relationships')}`)}<section class="section shell">${controls('Search any company, firm, provider, type or year…')}<div class="table-wrap explorer-table filter-results"><table><thead><tr><th>Transaction</th><th>Buyer</th><th>Type</th><th>Providers</th><th>Value</th></tr></thead><tbody>${explorerRows}</tbody></table></div><div class="empty-state" hidden>No matching relationships.</div></section>`;
await write('explorer/index.html', layout({title:'Relationship explorer',description:'Search the connected graph of PE transactions, investors, people and service providers.',pagePath:'explorer/',body:explorerBody}));

const thesisBody = `${pageHero('Investment thesis','Why relationship-economy businesses attract private capital','A research framework for businesses built around trusted access, recurring professional communities, events and proprietary interaction data.',`${tag('framework only','amber')}<p>No company scores are published in this edition.</p>`)}<section class="section shell"><div class="thesis-intro"><p class="dropcap">AI lowers the cost of producing generic content. It does not replace private peer exchange, trusted introductions or in-person access.</p><p>Repeat private-equity ownership across executive networks, B2B events and specialist information platforms makes this a useful hypothesis to investigate. It does not establish that any company is protected from disruption.</p></div><div class="framework-grid">${framework.dimensions.map((d,i)=>`<article class="dimension"><span>${String(i+1).padStart(2,'0')}</span><p class="card-label">${esc(pretty(d.category))}</p><h3>${esc(d.name)}</h3><p>${esc(d.definition)}</p><details><summary>Evidence prompts</summary><ul>${d.evidence_prompts.map((p)=>`<li>${esc(p)}</li>`).join('')}</ul></details></article>`).join('')}</div></section><section class="section section-tint"><div class="shell">${sectionHead('Observed pattern','Repeat sponsor ownership shows investor interest. It does not prove business quality.','The current set includes sponsor-to-sponsor sales, continuation ownership and strategic exits. Each company still requires its own underwriting.')}<div class="timeline">${deals.filter((d)=>['company_world50','company_hyve','company_closerstill','company_tarsus','company_pei'].includes(d.target_company_id)).sort((a,b)=>a.announced_on.localeCompare(b.announced_on)).map((d)=>`<a href="${base}deals/${d.slug}/"><time>${getDealYear(d)}</time><b>${esc(companyMap.get(d.target_company_id).name)}</b><span>${esc(pretty(d.transaction_type))}</span></a>`).join('')}</div></div></section>`;
await write('thesis/index.html',layout({title:'Relationship-economy investment thesis',description:'A private-equity research framework for executive networks, B2B events, communities and specialist information platforms.',pagePath:'thesis/',body:thesisBody}));

const sourceRows = sources.map((s)=>`<tr class="filter-card" data-search="${esc([s.title,s.publisher,s.source_class,s.published_date].join(' ').toLowerCase())}"><td><a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.title)}</b> ↗</a><span class="mobile-meta">${esc(s.publisher)}</span></td><td>${esc(s.publisher)}</td><td>${esc(pretty(s.source_class))}</td><td>${esc(s.published_date ?? 'Undated')}</td><td>${esc(s.accessed_date)}</td></tr>`).join('');
const sourcesBody = `${pageHero('Evidence register','Sources','The canonical public-source register behind material claims in the National Edition.',`${stat(sources.length,'sources')}${stat(relationCounts.citations,'deal sources')}`)}<section class="section shell">${controls('Search title, publisher or source class…')}<div class="table-wrap filter-results"><table><thead><tr><th>Source</th><th>Publisher</th><th>Class</th><th>Published</th><th>Accessed</th></tr></thead><tbody>${sourceRows}</tbody></table></div><div class="empty-state" hidden>No matching sources.</div></section>`;
await write('sources/index.html',layout({title:'Sources',description:'Canonical public sources supporting the Private Equity Intelligence Index.',pagePath:'sources/',body:sourcesBody}));

const methodologyBody = `${pageHero('Research standard','Methodology','The rules for evidence, attribution, freshness and privacy used throughout the index.',`${tag('source first','green')}<p>Undisclosed facts are left blank.</p>`)}<section class="section shell prose"><h2>Purpose and scope</h2><p>The index maps public, professionally relevant evidence about private-equity transactions, firms, people and advisers. The National Edition adds a ten-market United States atlas and retains a focused transaction set covering executive networks, professional communities, B2B events and private-markets information.</p><div class="rule-grid"><article><b>01</b><h3>Start with primary evidence</h3><p>Regulatory records, transaction documents, company announcements and official biographies carry the most weight.</p></article><article><b>02</b><h3>Attribute people narrowly</h3><p>A person is connected to a deal only when a source names or quotes them in that transaction context.</p></article><article><b>03</b><h3>Separate current and historical</h3><p>Transaction roles are historical. Current titles and locations require current first-party evidence.</p></article><article><b>04</b><h3>State uncertainty</h3><p>Unknown, undisclosed and unverified facts are not turned into estimates.</p></article></div><h2>Confirmed person-to-deal labels</h2><ul><li><code>named_deal_team</code>: directly identified as part of a transaction workstream.</li><li><code>named_adviser</code>: named by an adviser or transaction document.</li><li><code>official_transaction_spokesperson</code>: quoted or listed as a responsible firm representative.</li></ul><h2>United States atlas location evidence</h2><p><code>explicit_person_bio</code> is the strongest location mode. <code>explicit_office_filter</code> means an official firm directory returns the person for that office. <code>firm_office_association</code> means the firm has a verified office in the market, but the source does not establish the person's own work location. A transaction, headquarters address or firm membership does not establish personal location.</p><h2>National coverage boundaries</h2><p>The ten hubs are selected research markets. They are not a census of U.S. private equity. A market appears when public sources support its people or firm-presence records. Missing people, firms and cities have not been verified.</p><h2>Scoring</h2><p>The relationship-economy dimensions are published as questions and evidence prompts. Company scores and rankings will require published evidence thresholds, weights and review procedures.</p><h2>Corrections and reproducibility</h2><p>Each canonical record carries a verification date and source references. The website and downloads are generated from those records. Corrections should identify the exact claim and a reliable replacement source.</p><p><a class="button button-dark" href="${base}corrections/">Submit a correction</a> <a class="button button-ghost" href="${base}data/">Inspect the data</a></p></section>`;
await write('methodology/index.html',layout({title:'Methodology',description:'Evidence, attribution, privacy and scoring methodology for the Private Equity Intelligence Index.',pagePath:'methodology/',body:methodologyBody}));

const datasets = [
  ['deals','Transactions, buyers, sellers, values, roles and evidence'],['companies','Portfolio and illustrative relationship-economy companies'],['firms','Private-equity firms, asset managers and strategic acquirers'],['people','U.S. atlas and transaction-attribution professional profiles'],['markets','Ten cited United States private-equity hubs'],['providers','Banks, law firms, lenders and diligence providers'],['sources','Canonical public evidence register'],['framework','Relationship-economy underwriting dimensions'],['knowledge-graph','Normalized nodes and edges for graph analysis']
];
const dataBody = `${pageHero('Open research data','Download the data','JSON and CSV exports generated from the same canonical records as the website.',`${tag('CC BY 4.0','green')}<p>Code is MIT licensed.</p>`)}<section class="section shell"><div class="download-grid">${datasets.map(([name,desc])=>`<article><span>JSON</span><h3>${esc(pretty(name))}</h3><p>${esc(desc)}</p><a href="${base}data/${name}.json" download>Download JSON ↓</a>${['deals','people','markets','providers','sources'].includes(name)?`<a href="${base}data/${name}.csv" download>Download CSV ↓</a>`:''}</article>`).join('')}</div><div class="data-note"><div><p class="eyebrow">Data contract</p><h2>Stable identifiers and traceable source references.</h2></div><p>Market and deal relationships retain their source references. Historical transaction attribution remains separate from current employment claims. Please credit Open Future Forum and link to the canonical repository.</p></div></section>`;
await write('data/index.html',layout({title:'Data downloads',description:'Download the Private Equity Intelligence Index as JSON and CSV.',pagePath:'data/',body:dataBody}));

const publisherBody = `${pageHero('About the publisher','Open Future Forum','Open Future Forum convenes executives, investors and operators through private gatherings, public events and research.',`<a class="button button-secondary" href="https://openfutureforum.com/" target="_blank" rel="noreferrer">Visit Open Future Forum ↗</a>`)}<section class="section shell prose"><h2>Why publish this</h2><p>Private-equity information is spread across press releases, regulatory filings, biography pages and licensed databases. This index connects those public records by deal, person, firm and provider.</p><h2>Editorial position</h2><p>Open Future Forum owns, funds, edits and publishes this index. It is publisher research. It is not academic research, investment advice or a solicitation. Open Future Forum appears only as an example of a relationship-economy business. The profile does not imply that the company is for sale or seeking investment.</p><h2>Stewardship</h2><p>Murray Newlands and Open Future Forum maintain the project. Contributions, corrections and proposed sources are reviewed through the public repository.</p></section>`;
await write('publisher/index.html',layout({title:'Publisher',description:'About Open Future Forum and the editorial position behind the index.',pagePath:'publisher/',body:publisherBody}));

const privacyBody = `${pageHero('Professional-profile standard','Privacy','A narrow public-interest profile policy for professionally relevant private-equity research.')}<section class="section shell prose"><h2>Included</h2><p>Public names, business roles, firm affiliations, disclosed transactions, professional boards and office geography that directly support the research purpose.</p><h2>Excluded</h2><p>Personal email addresses, private telephone numbers, home addresses, family details, protected characteristics, credentials and inferred personal attributes. Transaction documents may contain business contact details; this dataset omits them.</p><h2>Not a lead-generation dossier</h2><p>Profiles are evidence records, not sales dossiers. A person may request correction of an inaccurate professional fact through the repository process.</p><p><a class="button button-dark" href="${base}corrections/">Correction process</a></p></section>`;
await write('privacy/index.html',layout({title:'Privacy',description:'Professional-profile privacy rules for the Private Equity Intelligence Index.',pagePath:'privacy/',body:privacyBody}));

const correctionsBody = `${pageHero('Public accountability','Corrections','Help improve a specific record by identifying the claim, the proposed correction and reliable public evidence.')}<section class="section shell"><div class="correction-grid"><div><p class="eyebrow">Before filing</p><ol><li>Link the exact page or record.</li><li>Quote or describe the disputed claim.</li><li>Provide the replacement fact.</li><li>Attach a regulatory, company or other reliable source.</li></ol></div><div class="correction-action"><h2>Open a structured correction request</h2><p>GitHub preserves the discussion and resulting revision history.</p><a class="button button-primary" href="https://github.com/OpenFutureForum/private-equity-intelligence/issues/new?template=correction.yml">Submit on GitHub ↗</a><p class="small">Do not include private personal information in a public issue.</p></div></div></section>`;
await write('corrections/index.html',layout({title:'Corrections',description:'Submit a correction with public evidence to the Private Equity Intelligence Index.',pagePath:'corrections/',body:correctionsBody}));

const graph = {
  generated_at: '2026-10-10',
  nodes: [
    ...companies.map((x)=>({id:x.id,type:'company',name:x.name,slug:x.slug})),
    ...firms.map((x)=>({id:x.id,type:'firm',name:x.name,slug:x.slug})),
    ...people.map((x)=>({id:x.id,type:'person',name:x.name,slug:x.slug})),
    ...providers.map((x)=>({id:x.id,type:'provider',name:x.name,slug:x.slug})),
    ...markets.map((x)=>({id:x.id,type:'market',name:x.name,slug:x.slug})),
    ...deals.map((x)=>({id:x.id,type:'deal',name:x.title,slug:x.slug}))
  ],
  edges: [
    ...deals.flatMap((d)=>[
      {from:d.id,to:d.target_company_id,type:'targets',source_ids:d.source_ids},
      ...d.buyer_firm_ids.map((id)=>({from:id,to:d.id,type:'buyer',source_ids:d.source_ids})),
      ...d.seller_firm_ids.map((id)=>({from:id,to:d.id,type:'seller',source_ids:d.source_ids})),
      ...d.provider_roles.map((r)=>({from:r.provider_id,to:d.id,type:'provider',role:r.role,side:r.side,source_ids:[r.source_id]})),
      ...d.people_roles.map((r)=>({from:r.person_id,to:d.id,type:r.label,organization:r.organization,source_ids:[r.source_id]}))
    ]),
    ...people.filter((person)=>person.market_id).map((person)=>({from:person.id,to:person.market_id,type:'located_in_market',evidence_mode:person.location_evidence,source_ids:person.source_ids})),
    ...firms.flatMap((firm)=>(firm.us_market_ids ?? []).map((marketId)=>({from:firm.id,to:marketId,type:'present_in_market',source_ids:firm.source_ids})))
  ]
};

const csv = (rows, columns) => [columns.join(','), ...rows.map((row)=>columns.map((key)=>`"${String(row[key] ?? '').replaceAll('"','""')}"`).join(','))].join('\n') + '\n';
const dealCsv = deals.map((d)=>({id:d.id,title:d.title,company:companyMap.get(d.target_company_id).name,announced_on:d.announced_on,status:d.status,transaction_type:d.transaction_type,buyers:d.buyer_firm_ids.map((id)=>firmMap.get(id).name).join('; '),value:d.enterprise_value?.display??'',source_ids:d.source_ids.join('; ')}));
const peopleCsv = people.map((p)=>({id:p.id,name:p.name,scope:p.profile_scope.join('; '),market:p.market_id?marketMap.get(p.market_id).name:'',current_title:p.current_title??'',current_firm:p.current_firm_id?firmMap.get(p.current_firm_id).name:'',location:p.location??'',location_evidence:p.location_evidence??'',source_ids:p.source_ids.join('; ')}));
const marketCsv = markets.map((m)=>({id:m.id,name:m.name,region:m.region,people_count:people.filter((p)=>p.market_id===m.id).length,firm_count:firms.filter((f)=>f.us_market_ids?.includes(m.id)).length,description:m.description}));
const providerCsv = providers.map((p)=>({id:p.id,name:p.name,category:p.category,engagement_count:deals.reduce((n,d)=>n+d.provider_roles.filter((r)=>r.provider_id===p.id).length,0),website:p.website,source_ids:p.source_ids.join('; ')}));
const sourceCsv = sources.map((s)=>({id:s.id,title:s.title,publisher:s.publisher,url:s.url,source_class:s.source_class,published_date:s.published_date??'',accessed_date:s.accessed_date,supports:s.supports.join('; ')}));

for (const [name,data] of Object.entries({deals,companies,firms,people,markets,providers,sources,framework,'knowledge-graph':graph})) await write(`data/${name}.json`, `${JSON.stringify(data,null,2)}\n`);
await write('data/deals.csv',csv(dealCsv,['id','title','company','announced_on','status','transaction_type','buyers','value','source_ids']));
await write('data/people.csv',csv(peopleCsv,['id','name','scope','market','current_title','current_firm','location','location_evidence','source_ids']));
await write('data/markets.csv',csv(marketCsv,['id','name','region','people_count','firm_count','description']));
await write('data/providers.csv',csv(providerCsv,['id','name','category','engagement_count','website','source_ids']));
await write('data/sources.csv',csv(sourceCsv,['id','title','publisher','url','source_class','published_date','accessed_date','supports']));

const pagePaths = ['', 'deals/', ...deals.map((d)=>`deals/${d.slug}/`), 'atlas/', ...markets.map((m)=>`atlas/${m.slug}/`), 'people/', ...people.map((p)=>`people/${p.slug}/`), 'firms/', ...firms.map((f)=>`firms/${f.slug}/`), 'providers/', ...providers.map((p)=>`providers/${p.slug}/`), ...companies.map((c)=>`companies/${c.slug}/`), 'explorer/','thesis/','sources/','methodology/','data/','publisher/','privacy/','corrections/'];
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pagePaths.map((p)=>`<url><loc>${siteUrl}${p}</loc><lastmod>2026-10-10</lastmod></url>`).join('')}</urlset>\n`);
await write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`);
await write('llms.txt',`# Private Equity Intelligence Index\n\nPublic-source research from Open Future Forum on private-equity deals, U.S. market hubs, people, firms and service providers.\n\n- Website: ${siteUrl}\n- United States atlas: ${siteUrl}atlas/\n- Methodology: ${siteUrl}methodology/\n- Sources: ${siteUrl}sources/\n- Data: ${siteUrl}data/\n- Repository: https://github.com/OpenFutureForum/private-equity-intelligence\n\nDo not infer deal participation from employment or personal location from firm presence. Follow the source IDs attached to each relationship.\n`);
await write('favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#071727"/><path d="M15 18h19c10 0 16 5 16 13s-6 13-16 13h-8v8H15V18Zm11 9v8h7c4 0 6-1 6-4s-2-4-6-4h-7Z" fill="#5ee7ff"/></svg>`);
await write('.nojekyll','');

console.log(`Built ${pagePaths.length} pages, ${deals.length} deals and ${graph.edges.length} graph edges.`);
