import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { loadData } from './data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs');
const base = '/private-equity-intelligence/';
const siteUrl = 'https://openfutureforum.github.io/private-equity-intelligence/';

const [companies, firms, people, providers, deals, sources, framework, markets] = await Promise.all([
  loadData('companies'), loadData('firms'), loadData('people'), loadData('providers'), loadData('deals'), loadData('sources'), loadData('framework'), loadData('markets')
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
    <a href="${base}themes/executive-communities/">Executive communities</a>
    <a href="${base}depth/">Research depth</a>
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
  <footer><div class="shell footer-grid"><div><div class="footer-title">Private Equity Intelligence Index</div><p>Evidence-led research from Open Future Forum.</p></div><div><a href="${base}atlas/">U.S. Atlas</a><a href="${base}depth/">Research depth</a><a href="${base}methodology/">Methodology</a><a href="${base}sources/">Sources</a><a href="${base}corrections/">Corrections</a></div><div><a href="${base}publisher/">Publisher</a><a href="${base}privacy/">Privacy</a><a href="https://github.com/OpenFutureForum/private-equity-intelligence">GitHub ↗</a></div></div><div class="shell footer-floor"><span>National Edition · v0.7.2</span><span>Data reviewed through 10 October 2026</span></div></footer>
  <script src="${base}assets/app.js" defer></script>
</body></html>`;
}

const pageHero = (eyebrow, title, intro, aside = '') => `<section class="page-hero"><div class="shell page-hero-grid"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="lede">${esc(intro)}</p></div>${aside ? `<aside class="hero-aside">${aside}</aside>` : ''}</div></section>`;
const sectionHead = (eyebrow, title, copy = '') => `<div class="section-head"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div>${copy ? `<p>${esc(copy)}</p>` : ''}</div>`;
const stat = (number, label) => `<div class="stat"><strong>${esc(number)}</strong><span>${esc(label)}</span></div>`;
const tag = (value, tone = '') => `<span class="tag${tone ? ` tag-${tone}` : ''}">${esc(pretty(value))}</span>`;
const getDealYear = (d) => d.announced_on.slice(0, 4);
const depthSignals = (deal) => ({
  sources: deal.source_ids.length,
  providers: deal.provider_roles.length,
  people: deal.people_roles.length,
  value: Boolean(deal.enterprise_value),
  completion: Boolean(deal.completed_on),
  announcement: deal.evidence_tier !== 'official_portfolio_record',
  insights: deal.research_insights?.length ?? 0
});
const companyDepthSignals = (deal) => {
  const company = companyMap.get(deal.target_company_id);
  return {
    target: Boolean(company),
    buyer: deal.buyer_firm_ids.length > 0 || deal.buyer_names.length > 0,
    chronology: Boolean(deal.announced_on),
    transactionType: Boolean(deal.transaction_type),
    status: Boolean(deal.status),
    thesis: Boolean(deal.investment_thesis),
    headquarters: Boolean(company?.headquarters),
    sector: Boolean(company?.company_type),
    website: Boolean(company?.website),
    description: Boolean(company?.description),
    classification: (company?.relationship_archetypes?.length ?? 0) > 0,
    reviewed: Boolean(deal.last_verified)
  };
};
const depthScore = (deal) => {
  const s = depthSignals(deal);
  const c = companyDepthSignals(deal);
  const core = Math.min(s.sources, 2) * 10 + (c.target ? 8 : 0) + (c.buyer ? 8 : 0) + (c.chronology ? 8 : 0) + (c.transactionType ? 5 : 0) + (c.status ? 5 : 0) + (c.thesis ? 8 : 0) + (c.headquarters ? 6 : 0) + (c.sector ? 6 : 0) + (c.website ? 4 : 0) + (c.description ? 4 : 0) + (c.classification ? 4 : 0) + (c.reviewed ? 4 : 0);
  const transactionDetail = (s.announcement ? 5 : 0) + Math.min(s.providers, 2) * 3 + Math.min(s.people, 2) * 3 + Math.min(s.insights, 2) * 2 + (s.value ? 2 : 0) + (s.completion ? 2 : 0);
  return Math.min(100, core + transactionDetail);
};
const depthLabel = (score) => score >= 75 ? 'deep record' : score >= 45 ? 'developing record' : 'research queue';
const depthMeter = (score) => `<div class="depth-meter" aria-label="Research completeness ${score} out of 100"><i style="width:${score}%"></i></div>`;

const relationCounts = {
  providerRoles: deals.reduce((n, d) => n + d.provider_roles.length, 0),
  peopleRoles: deals.reduce((n, d) => n + d.people_roles.length, 0),
  citations: new Set(deals.flatMap((d) => d.source_ids)).size
};
const portfolioRecordCount = deals.filter((deal) => deal.evidence_tier === 'official_portfolio_record').length;
const announcementRecordCount = deals.length - portfolioRecordCount;

function dealCard(deal) {
  const company = companyMap.get(deal.target_company_id);
  const buyers = deal.buyer_firm_ids.map((id) => firmMap.get(id)?.name).filter(Boolean).join(' + ');
  return `<article class="card deal-card filter-card" data-search="${esc([deal.title, company?.name, buyers, deal.transaction_type, deal.status, getDealYear(deal)].join(' ').toLowerCase())}">
    <div class="card-top"><span class="year">${getDealYear(deal)}</span>${tag(deal.evidence_tier === 'official_portfolio_record' ? 'portfolio record' : deal.status, deal.status === 'announced' ? 'amber' : 'green')}</div>
    <h3>${internal('deals', deal.slug, deal.title)}</h3>
    <p>${esc(deal.investment_thesis)}</p>
    <dl class="mini-facts"><div><dt>Target</dt><dd>${internal('companies', company.slug, company.name)}</dd></div><div><dt>Buyer</dt><dd>${esc(buyers || deal.buyer_names.join(', '))}</dd></div><div><dt>Value</dt><dd>${esc(deal.enterprise_value?.display ?? 'Not publicly established')}</dd></div></dl>
    ${depthMeter(depthScore(deal))}<div class="card-foot"><span>${depthLabel(depthScore(deal))}</span><span>${deal.people_roles.length} named people</span></div>
  </article>`;
}

function personCard(person) {
  const firm = person.current_firm_id ? firmMap.get(person.current_firm_id) : null;
  const organization = firm?.name ?? person.organization ?? null;
  const market = person.market_id ? marketMap.get(person.market_id) : null;
  const related = deals.filter((d) => d.people_roles.some((r) => r.person_id === person.id));
  const label = market ? `${market.name} atlas` : person.profile_scope.includes('ecosystem_directory') ? 'PE ecosystem directory' : 'Transaction attribution';
  return `<article class="card person-card filter-card" data-search="${esc([person.name, person.current_title, organization, person.location, market?.name, person.ecosystem_tier_label, person.profile_scope.join(' ')].join(' ').toLowerCase())}">
    <div class="person-monogram" aria-hidden="true">${person.name.split(/\s+/).map((x) => x[0]).slice(0,2).join('')}</div>
    <div><p class="card-label">${esc(label)}</p><h3>${internal('people', person.slug, person.name)}</h3>
    <p>${esc(person.current_title ?? (related.length ? `${related.length} sourced transaction ${related.length === 1 ? 'role' : 'roles'}` : 'Historical professional profile'))}${firm ? ` · ${internal('firms', firm.slug, firm.name)}` : organization ? ` · ${esc(organization)}` : ''}</p>
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
<section class="home-hero"><div class="shell hero-grid"><div class="hero-copy"><p class="eyebrow">Open Future Forum Research · U.S. National Edition</p><h1>The people and firms behind private-equity deals.</h1><p class="lede">Evidence records connecting private-equity transactions with investors, named deal participants, advisers and relationship-driven businesses.</p><div class="hero-actions"><a class="button button-primary" href="${base}atlas/">Explore the U.S. atlas</a><a class="button button-secondary" href="${base}explorer/">Trace the deals</a></div><p class="freshness"><span></span>Reviewed through 10 October 2026 · Deal credits require a transaction source</p></div>
<div class="network-panel" aria-label="Illustrative relationship map"><div class="network-grid"></div><div class="node node-company"><small>Company</small><b>Relationship platform</b></div><div class="node node-firm"><small>Investor</small><b>Private equity</b></div><div class="node node-person"><small>People</small><b>Named deal team</b></div><div class="node node-provider"><small>Ecosystem</small><b>Advisers + lenders</b></div><div class="node node-evidence"><small>Evidence</small><b>Public sources</b></div><svg viewBox="0 0 600 380" aria-hidden="true"><path d="M290 185 C210 120 185 95 130 75"/><path d="M310 185 C405 130 430 105 485 82"/><path d="M300 205 C235 275 200 300 145 318"/><path d="M320 205 C400 265 430 295 500 315"/></svg></div></div></section>
<section class="metric-band"><div class="shell stats-grid">${stat(deals.length, 'transactions')}${stat(people.length, 'professional profiles')}${stat(providers.length, 'service providers')}${stat(markets.length, 'U.S. hubs')}</div></section>
<section class="section shell">${sectionHead('Research focus', 'Transactions reveal who financed, advised and led the work.', 'Deal connections begin with public records. Submitted directory profiles are kept separate and clearly labeled.')}<div class="three-up"><article class="feature"><span>01</span><h3>Relationship Economy</h3><p>Executive networks, events and specialist information businesses earn revenue from access, trust and professional communities.</p><a href="${base}thesis/">Read the thesis →</a></article><article class="feature"><span>02</span><h3>Named Deal Teams</h3><p>A person receives deal credit only when a transaction source identifies or quotes them. Employment at the firm is not enough.</p><a href="${base}deals/">Trace the deals →</a></article><article class="feature"><span>03</span><h3>PE Services Ecosystem</h3><p>Public transaction roles sit alongside a separately labeled directory of professionals who sell to or support private equity.</p><a href="${base}people/">Browse the people →</a></article></div></section>
<section class="section section-tint"><div class="shell">${sectionHead('Selected transactions', 'A broader transaction set', 'Detailed transaction announcements sit alongside clearly labeled official portfolio records. No adviser or individual credit is inferred from a portfolio listing.')}<div class="cards-grid">${deals.slice().sort((a,b) => b.announced_on.localeCompare(a.announced_on)).slice(0,6).map(dealCard).join('')}</div><div class="section-action"><a class="text-link" href="${base}deals/">View all ${deals.length} transactions →</a></div></div></section>
<section class="section shell"><div class="split-callout"><div><p class="eyebrow">United States PE atlas</p><h2>Ten private-equity markets with explicit location evidence.</h2><p>Browse professionals and firms from the Bay Area and Los Angeles to Texas, Chicago, the East Coast and Boston. Each profile states whether the location comes from a personal biography, an office directory or a firm-office association.</p><a class="button button-dark" href="${base}atlas/">Open the national map</a></div><div class="confidence-stack"><div><b>10 covered markets</b><span>Regional entry points across the country</span></div><div><b>${people.filter((p) => p.profile_scope.includes('us_atlas')).length} profiles in index</b><span>Current roles supported by public records</span></div><div><b>${firms.filter((f) => f.us_market_ids?.length).length} firm records</b><span>Deal activity does not establish office location</span></div></div></div></section>
<section class="section evidence-strip"><div class="shell"><p class="eyebrow">Evidence standard</p><h2>Every material claim links to an evidence record.</h2><div class="evidence-flow"><span>Evidence</span><i>→</i><span>Canonical record</span><i>→</i><span>Validated relationship</span><i>→</i><span>Public page + download</span></div><div class="hero-actions"><a class="button button-primary" href="${base}sources/">Browse all sources</a><a class="button button-secondary" href="${base}data/">Download the data</a></div></div></section>`;

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'assets'), { recursive: true });
await Promise.all([
  copyFile(path.join(root, 'src', 'styles.css'), path.join(out, 'assets', 'styles.css')),
  copyFile(path.join(root, 'src', 'app.js'), path.join(out, 'assets', 'app.js'))
]);

await write('index.html', layout({
  title: 'Private Equity Intelligence Index',
  description: 'Evidence-led research on private-equity deals, dealmakers, U.S. market hubs and service providers.',
  body: homeBody,
  schema: { '@context':'https://schema.org', '@type':'Dataset', name:'Private Equity Intelligence Index', description:'Cited relationships among private-equity transactions, firms, people, companies and advisers.', url:siteUrl, creator:{'@type':'Organization',name:'Open Future Forum',url:'https://openfutureforum.com/'}, dateModified:'2026-10-10', license:'https://creativecommons.org/licenses/by/4.0/' }
}));

const dealsBody = `${pageHero('Transaction intelligence', 'Deals', 'Browse detailed transaction announcements and official portfolio records without mixing their evidence standards.', `${stat(deals.length, 'transactions')}${stat(relationCounts.providerRoles, 'provider roles')}`)}<section class="section shell"><div class="atlas-note"><b>Two evidence levels</b><p>${announcementRecordCount} transaction records are based on announcements or regulatory documents. ${portfolioRecordCount} official portfolio records establish the company, investor, investment year and classification, but do not establish advisers, deal-team members, purchase price or announcement date.</p></div>${controls('Search company, buyer, type or year…')}<div class="cards-grid filter-results">${deals.slice().sort((a,b) => b.announced_on.localeCompare(a.announced_on)).map(dealCard).join('')}</div><div class="empty-state" hidden>No matching transactions.</div></section>`;
await write('deals/index.html', layout({ title:'Deals', description:'Private-equity transactions with buyers, sellers, disclosed values, advisers and named professionals.', pagePath:'deals/', body:dealsBody }));

for (const deal of deals) {
  const company = companyMap.get(deal.target_company_id);
  const buyers = deal.buyer_firm_ids.map((id) => firmMap.get(id)).filter(Boolean);
  const sellers = deal.seller_firm_ids.map((id) => firmMap.get(id)).filter(Boolean);
  const providerRows = deal.provider_roles.map((r) => { const p = providerMap.get(r.provider_id); return `<tr><td>${internal('providers', p.slug, p.name)}</td><td>${esc(r.role)}</td><td>${tag(r.side)}</td><td>${sourceLinks([r.source_id])}</td></tr>`; }).join('');
  const personRows = deal.people_roles.map((r) => { const p = peopleMap.get(r.person_id); return `<article class="relationship-row"><div><p class="card-label">${esc(pretty(r.label))}</p><h3>${internal('people', p.slug, p.name)}</h3><p>${esc(r.organization)}</p></div><div><p>${esc(r.attribution)}</p>${sourceLinks([r.source_id])}</div></article>`; }).join('');
  const insightRows = (deal.research_insights ?? []).map((insight)=>`<article class="insight-card"><p class="card-label">${esc(insight.label)}</p><p>${esc(insight.value)}</p><div>${sourceLinks(insight.source_ids)}</div></article>`).join('');
  const score = depthScore(deal);
  const signals = depthSignals(deal);
  const body = `${pageHero(`${getDealYear(deal)} · ${pretty(deal.transaction_type)}`, deal.title, deal.investment_thesis, `${tag(deal.status, deal.status === 'announced' ? 'amber' : 'green')}<div class="aside-value"><small>Disclosed value</small><strong>${esc(deal.enterprise_value?.display ?? 'Not established')}</strong></div>`)}
  <section class="section shell detail-grid"><div class="detail-main"><div class="deal-route"><div><small>Target</small>${internal('companies', company.slug, company.name)}</div><span>←</span><div><small>Buyer${buyers.length > 1 ? 's' : ''}</small>${buyers.map((f) => internal('firms', f.slug, f.name)).join('<br>') || esc(deal.buyer_names.join(', '))}</div></div>
  <div class="content-block"><p class="eyebrow">Research completeness</p><div class="depth-summary"><div><strong>${score}</strong><span>out of 100</span></div><div>${depthMeter(score)}<b>${esc(pretty(depthLabel(score)))}</b><p>A completeness measure, not an investment score. Core coverage measures identity, ownership, chronology, classification, company facts, sources and review status. Transaction announcements can also earn depth from disclosed people, providers, value, completion evidence and structured findings.</p></div></div><div class="signal-grid"><span class="${signals.sources > 1 ? 'complete' : ''}">${signals.sources} ${signals.sources === 1 ? 'source' : 'sources'}</span><span class="${signals.people ? 'complete' : ''}">${signals.people} named ${signals.people === 1 ? 'person' : 'people'}</span><span class="${signals.providers ? 'complete' : ''}">${signals.providers} provider ${signals.providers === 1 ? 'role' : 'roles'}</span><span class="${signals.insights ? 'complete' : ''}">${signals.insights} research ${signals.insights === 1 ? 'signal' : 'signals'}</span><span class="${signals.value ? 'complete' : ''}">${signals.value ? 'Value disclosed' : 'Value not disclosed'}</span><span class="${signals.completion ? 'complete' : ''}">${signals.completion ? 'Completion date' : 'Completion date not established'}</span></div></div>
  <div class="content-block"><p class="eyebrow">Transaction facts</p><dl class="facts"><div><dt>${deal.date_basis === 'investment_year' ? 'Investment year' : 'Announced'}</dt><dd>${esc(deal.announced_on)}</dd></div><div><dt>Evidence level</dt><dd>${esc(pretty(deal.evidence_tier ?? 'transaction_announcement'))}</dd></div><div><dt>Status</dt><dd>${esc(pretty(deal.status))}</dd></div><div><dt>Transaction type</dt><dd>${esc(pretty(deal.transaction_type))}</dd></div><div><dt>Seller</dt><dd>${sellers.map((f) => internal('firms', f.slug, f.name)).join(', ') || esc(deal.seller_names.join(', ') || 'Not established')}</dd></div></dl></div>
  ${insightRows ? `<div class="content-block"><p class="eyebrow">Underwriting signals from public records</p><div class="insight-grid">${insightRows}</div></div>` : ''}
  <div class="content-block"><p class="eyebrow">Publicly disclosed provider roles</p>${providerRows ? `<div class="table-wrap"><table><thead><tr><th>Provider</th><th>Role</th><th>Side</th><th>Evidence</th></tr></thead><tbody>${providerRows}</tbody></table></div>` : '<p class="muted-box">No provider role has been added from the reviewed public sources.</p>'}</div>
  <div class="content-block"><p class="eyebrow">Named transaction professionals</p>${personRows || '<p class="muted-box">No individual transaction attribution has been added from the reviewed public sources.</p>'}</div></div>
  <aside class="detail-aside"><div class="source-box"><h2>Evidence</h2><p>These sources support the material claims on this record.</p>${deal.source_ids.map((id) => { const s=sourceMap.get(id); return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`; }).join('')}</div><div class="definition-box"><b>Attribution rule</b><p>A person is confirmed on this deal only when a public source names or quotes them in the transaction context.</p><a href="${base}methodology/">Methodology →</a></div></aside></section>`;
  await write(`deals/${deal.slug}/index.html`, layout({ title:deal.title, description:deal.investment_thesis, pagePath:`deals/${deal.slug}/`, eyebrow:'Deal record', body }));
}

const atlasPeople = people.filter((p) => p.profile_scope.includes('us_atlas'));
const transactionPeople = people.filter((p) => p.profile_scope.includes('transaction_attribution'));
const ecosystemPeople = people.filter((p) => p.profile_scope.includes('ecosystem_directory'));
const peopleFilters = [...markets.map((market) => ({value:market.id,label:market.name})), {value:'transaction_attribution',label:'Deal-linked'}, {value:'ecosystem_directory',label:'PE ecosystem'}];
const peopleBody = `${pageHero('Professional intelligence', 'People', 'Current professionals across ten U.S. private-equity hubs, historical transaction participants and a clearly labeled user-supplied PE services directory.', `${stat(atlasPeople.length, 'U.S. atlas')}${stat(transactionPeople.length, 'deal-linked')}${stat(ecosystemPeople.length, 'PE ecosystem')}`)}<section class="section shell"><div class="atlas-note"><b>Directory evidence boundary</b><p>The ${ecosystemPeople.length} PE ecosystem entries came from a user-supplied list. Names, organizations, titles, tiers and professional profile links are shown as supplied and have not been independently verified. No location or deal participation is inferred.</p></div>${controls('Search person, organization, title, tier or market…',peopleFilters)}<div class="people-grid filter-results">${people.map((p) => personCard(p).replace('filter-card"', `filter-card" data-category="${p.market_id ?? p.profile_scope.join(' ')}"`)).join('')}</div><div class="empty-state" hidden>No matching people.</div></section>`;
await write('people/index.html', layout({title:'People',description:'Private-equity professionals across ten U.S. hubs, publicly named transaction participants and a user-supplied PE services directory.',pagePath:'people/',body:peopleBody}));

for (const person of people) {
  const firm = person.current_firm_id ? firmMap.get(person.current_firm_id) : null;
  const organization = firm?.name ?? person.organization ?? null;
  const market = person.market_id ? marketMap.get(person.market_id) : null;
  const isEcosystem = person.profile_scope.includes('ecosystem_directory');
  const related = deals.flatMap((d) => d.people_roles.filter((r) => r.person_id === person.id).map((r) => ({deal:d,...r})));
  const eyebrow = market ? `U.S. professional · ${market.name}` : isEcosystem ? 'PE ecosystem directory' : 'Historical transaction attribution';
  const aside = person.current_title ? `<p class="aside-title">${esc(person.current_title)}</p>${firm ? internal('firms',firm.slug,firm.name) : organization ? `<span>${esc(organization)}</span>` : ''}${market ? `<a class="market-jump" href="${base}atlas/${market.slug}/">View ${esc(market.name)} →</a>` : ''}` : `${stat(related.length,'sourced roles')}`;
  const ecosystemFacts = isEcosystem ? `<div><dt>Directory tier</dt><dd>${esc(person.ecosystem_tier_label)}</dd></div><div><dt>Verification</dt><dd>User supplied, not independently verified</dd></div>` : '';
  const profileLink = person.professional_profile_url ? `<a href="${esc(person.professional_profile_url)}" target="_blank" rel="noreferrer"><b>Professional profile</b><span>LinkedIn link supplied with record ↗</span></a>` : '';
  const emptyRelationship = isEcosystem ? 'No deal role is attributed from this directory entry.' : 'No deal role is attributed. This is a current professional profile only.';
  const body = `${pageHero(eyebrow, person.name, person.summary, aside)}<section class="section shell detail-grid"><div class="detail-main"><div class="content-block"><p class="eyebrow">Profile facts</p><dl class="facts"><div><dt>Scope</dt><dd>${market ? internal('atlas',market.slug,market.name) : person.profile_scope.map(pretty).join(', ')}</dd></div><div><dt>${isEcosystem ? 'Supplied title' : 'Current role'}</dt><dd>${esc(person.current_title ?? 'Not asserted')}</dd></div><div><dt>${isEcosystem ? 'Supplied organization' : 'Current firm'}</dt><dd>${firm ? internal('firms',firm.slug,firm.name) : esc(organization ?? 'Not asserted')}</dd></div>${ecosystemFacts}<div><dt>Location</dt><dd>${esc(person.location ?? 'Not asserted')}</dd></div><div><dt>Location evidence</dt><dd>${esc(person.location_evidence ? pretty(person.location_evidence) : 'Not applicable')}</dd></div><div><dt>Last reviewed</dt><dd>${esc(person.last_verified)}</dd></div></dl></div><div class="content-block"><p class="eyebrow">Sourced transaction relationships</p>${related.length ? related.map((r) => `<article class="relationship-row"><div><p class="card-label">${esc(pretty(r.label))}</p><h3>${internal('deals',r.deal.slug,r.deal.title)}</h3><p>${esc(r.organization)}</p></div><div><p>${esc(r.attribution)}</p>${sourceLinks([r.source_id])}</div></article>`).join('') : `<p class="muted-box">${esc(emptyRelationship)}</p>`}</div></div><aside class="detail-aside"><div class="source-box"><h2>Profile sources</h2>${person.source_ids.map((id) => {const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`}).join('')}${profileLink}</div><div class="definition-box"><b>Privacy boundary</b><p>Only professional information is included. Personal contact details and inferred attributes are excluded.</p></div></aside></section>`;
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
  const buyerDeals = firmDeals.filter((deal) => deal.buyer_firm_ids.includes(firm.id));
  const sellerDeals = firmDeals.filter((deal) => deal.seller_firm_ids.includes(firm.id));
  const sectors = [...new Set(firmDeals.map((deal) => companyMap.get(deal.target_company_id)?.company_type).filter(Boolean))];
  const repeatProviders = [...new Set(firmDeals.flatMap((deal) => deal.provider_roles.map((role) => providerMap.get(role.provider_id)?.name).filter(Boolean)))];
  const marketAside = firmMarkets.length ? `<p class="aside-title">U.S. atlas markets</p><div class="market-link-list">${firmMarkets.map((market) => internal('atlas',market.slug,market.name)).join('')}</div>` : `<a class="button button-secondary" href="${esc(firm.website)}" target="_blank" rel="noreferrer">Official website ↗</a>`;
  const body = `${pageHero(pretty(firm.firm_type), firm.name, firm.description, marketAside)}<section class="section shell"><div class="content-block"><p class="eyebrow">Strategy signals in this index</p><div class="strategy-grid"><div><strong>${buyerDeals.length}</strong><span>buyer-side records</span></div><div><strong>${sellerDeals.length}</strong><span>seller-side records</span></div><div><strong>${firmPeople.length}</strong><span>current profiles</span></div><div><strong>${firmMarkets.length}</strong><span>covered U.S. hubs</span></div></div><div class="strategy-notes"><div><b>Observed company categories</b><p>${sectors.length ? sectors.map(pretty).join(', ') : 'No mapped transaction category yet.'}</p></div><div><b>Named providers on mapped deals</b><p>${repeatProviders.length ? repeatProviders.join(', ') : 'No provider relationship documented yet.'}</p></div></div></div><div class="content-block"><p class="eyebrow">Mapped transactions</p><div class="cards-grid">${firmDeals.length ? firmDeals.map(dealCard).join('') : '<p class="muted-box">This atlas firm is not yet connected to a transaction in the National Edition.</p>'}</div></div>${firmPeople.length ? `<div class="content-block"><p class="eyebrow">Current professionals</p><div class="people-grid">${firmPeople.map(personCard).join('')}</div></div>` : ''}<div class="content-block"><p class="eyebrow">Sources</p><div class="source-chips">${sourceLinks(firm.source_ids)}</div></div></section>`;
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
  const ownershipTimeline = companyDeals.slice().sort((a,b)=>a.announced_on.localeCompare(b.announced_on)).map((deal)=>`<article><time>${esc(deal.announced_on)}</time><div><h3>${internal('deals',deal.slug,deal.title)}</h3><p>${esc(deal.buyer_firm_ids.map((id)=>firmMap.get(id)?.name).filter(Boolean).join(' + ') || deal.buyer_names.join(', '))}</p></div><span>${tag(deal.status,deal.status === 'announced' ? 'amber' : 'green')}</span></article>`).join('');
  const body = `${pageHero(pretty(company.company_type),company.name,company.description,company.illustrative_only ? `${tag('illustrative only','amber')}<p>Not presented as a sale target.</p>` : `${stat(companyDeals.length,'mapped transactions')}`)}<section class="section shell"><div class="detail-grid"><div class="detail-main"><div class="content-block"><p class="eyebrow">Classification</p><div class="tag-row">${company.relationship_archetypes.map((x)=>tag(x)).join('')}</div></div><div class="content-block"><p class="eyebrow">Ownership timeline</p><div class="ownership-timeline">${ownershipTimeline || '<p class="muted-box">No ownership event is associated with this illustrative business archetype.</p>'}</div></div><div class="content-block"><p class="eyebrow">Transaction records</p><div class="cards-grid">${companyDeals.length ? companyDeals.map(dealCard).join('') : '<p class="muted-box">No transaction is associated with this illustrative business archetype.</p>'}</div></div></div><aside class="detail-aside"><div class="source-box"><h2>Company sources</h2>${company.source_ids.map((id)=>{const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.publisher)}</b><span>${esc(s.title)} ↗</span></a>`}).join('')}</div>${company.website ? `<div class="definition-box"><a href="${esc(company.website)}" target="_blank" rel="noreferrer">Official website ↗</a></div>` : ''}</aside></div></section>`;
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

const deepDeals = deals.filter((deal)=>depthScore(deal) >= 75).sort((a,b)=>depthScore(b)-depthScore(a));
const developingDeals = deals.filter((deal)=>depthScore(deal) >= 45 && depthScore(deal) < 75);
const queuedDeals = deals.filter((deal)=>depthScore(deal) < 45);
const missingProviderDeals = deals.filter((deal)=>deal.provider_roles.length === 0);
const missingPeopleDeals = deals.filter((deal)=>deal.people_roles.length === 0);
const programKeywords = ['software','data','information','services','platform','digital','cyber','health','advisor','management','workflow','community','media','technology'];
const programPortfolioDeals = deals.filter((deal)=>deal.evidence_tier === 'official_portfolio_record').sort((a,b)=>{
  const relevance = (deal) => programKeywords.reduce((score, word)=>score + (deal.investment_thesis.toLowerCase().includes(word) ? 1 : 0), 0);
  return relevance(b) - relevance(a) || b.announced_on.localeCompare(a.announced_on);
});
const deepResearchProgram = [...deals.filter((deal)=>deal.evidence_tier !== 'official_portfolio_record'), ...programPortfolioDeals].slice(0,50);
const programDeep = deepResearchProgram.filter((deal)=>depthScore(deal) >= 75);
const programDeveloping = deepResearchProgram.filter((deal)=>depthScore(deal) >= 45 && depthScore(deal) < 75);
const programQueued = deepResearchProgram.filter((deal)=>depthScore(deal) < 45);
const pct = (number) => Math.round(number / deals.length * 100);
const multiEventCompanies = companies.filter((company)=>deals.filter((deal)=>deal.target_company_id===company.id).length>1);
const coverageBars = [
  ['Multiple sources', deals.filter((deal)=>deal.source_ids.length>1).length],
  ['Named providers', deals.length-missingProviderDeals.length],
  ['Named people', deals.length-missingPeopleDeals.length],
  ['Disclosed value', deals.filter((deal)=>deal.enterprise_value).length],
  ['Completion date', deals.filter((deal)=>deal.completed_on).length]
];
const researchProgram = {
  target: 50,
  completion_threshold: 75,
  scoring_method: 'Record-type-aware completeness. Every record is scored on source coverage, company identity, ownership, chronology, transaction classification, company facts and review status. Transaction-announcement records can earn additional points for disclosed people, providers, value, completion evidence and structured findings. Missing public disclosures remain visible and are never inferred.',
  selection_method: 'All transaction-announcement records, followed by official portfolio records prioritized for software, data, information, professional services, healthcare services and recurring customer relationships.',
  records: deepResearchProgram.map((deal)=>({deal_id:deal.id,company_id:deal.target_company_id,score:depthScore(deal),status:depthScore(deal)>=75?'complete':depthScore(deal)>=45?'developing':'selected_backlog'}))
};
const depthBody = `${pageHero('50-record research program','Fifty complete research records','The first research cohort is complete, with each record above the published 75-point threshold.',`${stat(50,'target records')}${stat(programDeep.length,'complete')}${stat(50-programDeep.length,'remaining')}`)}
<section class="section shell depth-overview"><div class="depth-principle"><div><p class="eyebrow">The standard</p><h2>Depth means complete, bounded evidence.</h2></div><p>Every record must connect a sourced company identity, ownership, chronology, transaction classification, company facts and review status. Announcement records add disclosed advisers, lenders, named professionals, value and research findings. Portfolio records do not lose credit for facts their source does not disclose. Those gaps remain explicit. The completion threshold remains 75.</p></div>
<div class="program-progress"><div class="program-progress-copy"><p class="eyebrow">Completed cohort</p><strong>${programDeep.length}<span>/50</span></strong><p>All 50 selected records meet the published completeness standard. Undisclosed values, advisers and people remain labeled as gaps rather than inferred facts.</p></div><div><div class="program-track"><i style="width:${programDeep.length / 50 * 100}%"></i><span style="left:${programDeep.length / 50 * 100}%"></span></div><div class="program-legend"><span><i class="deep"></i>${programDeep.length} complete</span><span><i class="developing"></i>${programDeveloping.length} developing</span><span><i class="queue"></i>${programQueued.length} backlog</span></div></div></div>
<div class="depth-dashboard"><div class="coverage-panel"><p class="eyebrow">Coverage across ${deals.length} deals</p>${coverageBars.map(([label,count])=>`<div class="coverage-row"><div><b>${esc(label)}</b><span>${count} records</span></div><div class="coverage-track"><i style="width:${pct(count)}%"></i></div><strong>${pct(count)}%</strong></div>`).join('')}</div><div class="score-key"><p class="eyebrow">Completeness bands</p><div><span class="score-dot deep"></span><b>75 to 100</b><p>Core record is sourced, structured and reviewed.</p></div><div><span class="score-dot developing"></span><b>45 to 74</b><p>Useful foundation with important core gaps.</p></div><div><span class="score-dot queue"></span><b>0 to 44</b><p>Lead awaiting a complete evidence pass.</p></div></div></div></section>
<section class="section section-tint"><div class="shell">${sectionHead('Research agenda','Three ways this becomes genuinely useful','The next work should deepen relationships, not simply add more names.')}<div class="research-lanes"><article><span>01</span><h3>Company ownership</h3><p>Build full sponsor histories for relationship-economy businesses, including add-ons, continuation vehicles and exits.</p><b>${multiEventCompanies.length} companies already show multiple events</b></article><article><span>02</span><h3>Deal anatomy</h3><p>Identify the banks, lawyers, lenders, diligence firms and named professionals on each transaction side.</p><b>${deals.length-missingProviderDeals.length} deals currently name a provider</b></article><article><span>03</span><h3>Relationship graph</h3><p>Show repeat pairings between sponsors, advisers and professionals so patterns can be compared across deals.</p><b>${relationCounts.providerRoles + relationCounts.peopleRoles} sourced relationships today</b></article></div></div></section>
<section class="section shell"><div class="content-block queue-head">${sectionHead('Completed research','The 50-record cohort','Every selected record has a sourced identity, ownership record, chronology, classification, company facts and review date. The table shows the complete cohort and the public-disclosure gaps that remain.')}<div class="table-wrap"><table><thead><tr><th>Complete record</th><th>Depth</th><th>Disclosure gaps</th></tr></thead><tbody>${deepResearchProgram.slice().sort((a,b)=>depthScore(b)-depthScore(a)).map((deal)=>{const gaps=[deal.source_ids.length < 2 && 'second source',!deal.provider_roles.length && 'advisers or lenders not disclosed',!deal.people_roles.length && 'individual deal team not disclosed',!deal.enterprise_value && 'value not disclosed',!deal.completed_on && 'completion date not established'].filter(Boolean);return `<tr><td><b>${internal('deals',deal.slug,deal.title)}</b><span class="mobile-meta">${esc(companyMap.get(deal.target_company_id)?.name)}</span></td><td><strong class="score-number">${depthScore(deal)}</strong>${depthMeter(depthScore(deal))}</td><td>${esc(gaps.join(', ') || 'No core gaps in reviewed fields')}</td></tr>`}).join('')}</tbody></table></div><p class="queue-note">Selection includes all transaction-announcement records plus official portfolio records prioritized for software, data, information, professional services, healthcare services and recurring customer relationships.</p></div>
<div class="content-block"><p class="eyebrow">Best documented today</p><div class="cards-grid">${deepDeals.slice(0,6).map(dealCard).join('') || '<p class="muted-box">No record has crossed the deep-record threshold yet.</p>'}</div></div></section>`;
await write('depth/index.html',layout({title:'Research depth',description:'A transparent completeness dashboard and research queue for the Private Equity Intelligence Index.',pagePath:'depth/',body:depthBody}));

const thesisBody = `${pageHero('Investment thesis','Why relationship-economy businesses attract private capital','A research framework for businesses built around trusted access, recurring professional communities, events and proprietary interaction data.',`${tag('framework only','amber')}<p>No company scores are published in this edition.</p>`)}<section class="section shell"><div class="thesis-intro"><p class="dropcap">AI lowers the cost of producing generic content. It does not replace private peer exchange, trusted introductions or in-person access.</p><p>Repeat private-equity ownership across executive networks, B2B events and specialist information platforms makes this a useful hypothesis to investigate. It does not establish that any company is protected from disruption.</p></div><div class="framework-grid">${framework.dimensions.map((d,i)=>`<article class="dimension"><span>${String(i+1).padStart(2,'0')}</span><p class="card-label">${esc(pretty(d.category))}</p><h3>${esc(d.name)}</h3><p>${esc(d.definition)}</p><details><summary>Evidence prompts</summary><ul>${d.evidence_prompts.map((p)=>`<li>${esc(p)}</li>`).join('')}</ul></details></article>`).join('')}</div></section><section class="section section-tint"><div class="shell">${sectionHead('Observed pattern','Repeat sponsor ownership shows investor interest. It does not prove business quality.','The current set includes sponsor-to-sponsor sales, continuation ownership and strategic exits. Each company still requires its own underwriting.')}<div class="timeline">${deals.filter((d)=>['company_world50','company_hyve','company_closerstill','company_tarsus','company_pei'].includes(d.target_company_id)).sort((a,b)=>a.announced_on.localeCompare(b.announced_on)).map((d)=>`<a href="${base}deals/${d.slug}/"><time>${getDealYear(d)}</time><b>${esc(companyMap.get(d.target_company_id).name)}</b><span>${esc(pretty(d.transaction_type))}</span></a>`).join('')}</div></div></section>`;
await write('thesis/index.html',layout({title:'Relationship-economy investment thesis',description:'A private-equity research framework for executive networks, B2B events, communities and specialist information platforms.',pagePath:'thesis/',body:thesisBody}));

const executiveCommunityCompanyIds = new Set(['company_world50','company_vistage','company_evanta','company_ceb']);
const executiveCommunityDeals = deals.filter((deal)=>executiveCommunityCompanyIds.has(deal.target_company_id)).sort((a,b)=>a.announced_on.localeCompare(b.announced_on));
const executiveCommunityProviders = new Set(executiveCommunityDeals.flatMap((deal)=>deal.provider_roles.map((role)=>role.provider_id)));
const executiveCommunityPeople = new Set(executiveCommunityDeals.flatMap((deal)=>deal.people_roles.map((role)=>role.person_id)));
const executiveCommunityFaq = [
  {
    question: 'What is an executive community?',
    answer: 'An executive community is a curated network where senior leaders exchange experience, develop trusted relationships and solve shared business problems through private peer interaction. The model may combine membership, facilitated peer groups, research, coaching and events.',
    links: [['world-50-mscp-2020','World 50 record'],['vistage-gridiron-2022','Vistage record']]
  },
  {
    question: 'Why do private-equity firms invest in executive networks?',
    answer: 'Public transaction announcements point to recurring membership, high retention, trusted access to senior audiences and several expansion paths. Buyers have cited new networks, geographic growth, technology, coaching, acquisitions and improved member experiences. These are buyer rationales, not guarantees of future performance.',
    links: [['world-50-mscp-2020','World 50 record'],['world-50-continuation-2024','Continuation record'],['vistage-gridiron-2022','Vistage record']]
  },
  {
    question: 'How do executive communities make money?',
    answer: 'The reviewed companies use different models. World 50 and Vistage emphasize membership and continuing peer experiences. Vistage also provides executive coaching. Evanta primarily reported event sponsorship revenue, while CEB combined membership research, advisory products and events.',
    links: [['vistage-gridiron-2022','Vistage record'],['evanta-ceb-2016','Evanta record'],['ceb-gartner-2017','CEB record']]
  },
  {
    question: 'What makes an executive community valuable?',
    answer: 'The public evidence suggests that buyers examine retention, member seniority, invitation and curation standards, repeat participation, community density and the ability to extend the platform without weakening trust. Transaction prices alone do not reveal how much value buyers assigned to each factor.',
    links: [['world-50-mscp-2020','World 50 record'],['vistage-gridiron-2022','Vistage record']]
  },
  {
    question: 'How is an executive community different from a conference business?',
    answer: 'A conference is usually organized around a scheduled gathering. An executive community is organized around continuing relationships among selected members. Events may support the community, but membership, peer exchange and ongoing engagement can continue between gatherings.',
    links: [['world-50-mscp-2020','World 50 record'],['evanta-ceb-2016','Evanta record']]
  },
  {
    question: 'Are executive communities protected from AI disruption?',
    answer: 'No public transaction proves that executive communities are protected from AI. AI can reduce the cost of generic content and improve matching or research. The more defensible elements are likely to be trust, confidentiality, curation, member quality and relationships that depend on sustained human participation.',
    links: [['world-50-continuation-2024','World 50 continuation record'],['ceb-gartner-2017','CEB record']]
  }
];
const executiveCommunityBody = `${pageHero('Open Future Forum comparable set','Executive communities','Transactions involving invitation-only executive networks, CEO peer groups, coaching, membership research and C-suite events.',`${stat(executiveCommunityDeals.length,'relevant deals')}${stat(executiveCommunityPeople.size,'named people')}${stat(executiveCommunityProviders.size,'advisers')}`)}
<section class="section shell"><div class="thesis-intro"><p class="dropcap">The closest public comparables are not ordinary media companies. They sell trusted access, structured peer exchange, leadership development and recurring executive relationships.</p><p>World 50 and Vistage show direct private-equity appetite for membership communities. Evanta and CEB show how executive gatherings can sit inside larger research, advisory and sponsorship platforms. The transaction records below separate confirmed facts from underwriting interpretation.</p></div>
<div class="content-block"><p class="eyebrow">What buyers appear to value</p><div class="research-lanes"><article><span>01</span><h3>Retention and recurring membership</h3><p>World 50's buyer highlighted retention and member experience. Vistage combines subscription membership with ongoing peer groups and coaching.</p></article><article><span>02</span><h3>High-trust participation</h3><p>Invitation, curation and confidentiality turn access to peers into a product that is difficult to reproduce with generic content.</p></article><article><span>03</span><h3>Multiple growth levers</h3><p>Public deal rationales point to new communities, geographic expansion, technology, coaching, acquisitions, sponsorship and content licensing.</p></article></div></div>
<div class="content-block"><p class="eyebrow">Ownership and consolidation path</p><div class="timeline">${executiveCommunityDeals.map((deal)=>`<a href="${base}deals/${deal.slug}/"><time>${getDealYear(deal)}</time><b>${esc(companyMap.get(deal.target_company_id).name)}</b><span>${esc(deal.title)}</span></a>`).join('')}</div></div>
<div class="content-block"><p class="eyebrow">Detailed comparable transactions</p><div class="cards-grid">${executiveCommunityDeals.map(dealCard).join('')}</div></div>
<div class="content-block prose"><p class="eyebrow">Direct answers from the evidence</p><h2>Executive community questions</h2><div class="faq-list">${executiveCommunityFaq.map((item)=>`<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p><p class="source-chips">${item.links.map(([slug,label])=>`<a class="source-chip" href="${base}deals/${slug}/">${esc(label)}</a>`).join('')}</p></details>`).join('')}</div></div>
<div class="content-block prose"><h2>Implications for Open Future Forum</h2><p>The evidence suggests that a buyer would examine the durability of member retention, the seniority and exclusivity of the audience, repeat participation, sponsor dependence, community density, the ability to launch adjacent cohorts, and whether technology improves matching and engagement without weakening trust. These are research questions, not a valuation or a claim that Open Future Forum is for sale.</p></div></section>`;
const executiveCommunitySchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {'@type':'WebPage','@id':`${siteUrl}themes/executive-communities/#webpage`,name:'Executive community transactions',description:'Private-equity and strategic transactions involving executive peer networks, CEO communities, coaching and C-suite events.',url:`${siteUrl}themes/executive-communities/`,publisher:{'@type':'Organization',name:'Open Future Forum',url:'https://openfutureforum.com/'}},
    {'@type':'FAQPage','@id':`${siteUrl}themes/executive-communities/#faq`,mainEntity:executiveCommunityFaq.map((item)=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))}
  ]
};
await write('themes/executive-communities/index.html',layout({title:'Executive community transactions',description:'Private-equity and strategic transactions involving executive peer networks, CEO communities, coaching and C-suite events.',pagePath:'themes/executive-communities/',body:executiveCommunityBody,schema:executiveCommunitySchema}));

const sourceRows = sources.map((s)=>`<tr class="filter-card" data-search="${esc([s.title,s.publisher,s.source_class,s.published_date].join(' ').toLowerCase())}"><td><a href="${esc(s.url)}" target="_blank" rel="noreferrer"><b>${esc(s.title)}</b> ↗</a><span class="mobile-meta">${esc(s.publisher)}</span></td><td>${esc(s.publisher)}</td><td>${esc(pretty(s.source_class))}</td><td>${esc(s.published_date ?? 'Undated')}</td><td>${esc(s.accessed_date)}</td></tr>`).join('');
const sourcesBody = `${pageHero('Evidence register','Sources','The canonical evidence register behind material claims and labeled directory submissions in the National Edition.',`${stat(sources.length,'sources')}${stat(relationCounts.citations,'deal sources')}`)}<section class="section shell">${controls('Search title, publisher or source class…')}<div class="table-wrap filter-results"><table><thead><tr><th>Source</th><th>Publisher</th><th>Class</th><th>Published</th><th>Accessed</th></tr></thead><tbody>${sourceRows}</tbody></table></div><div class="empty-state" hidden>No matching sources.</div></section>`;
await write('sources/index.html',layout({title:'Sources',description:'Canonical evidence records supporting the Private Equity Intelligence Index.',pagePath:'sources/',body:sourcesBody}));

const methodologyBody = `${pageHero('Research standard','Methodology','The rules for evidence, attribution, freshness and privacy used throughout the index.',`${tag('source first','green')}<p>Undisclosed facts are left blank.</p>`)}<section class="section shell prose"><h2>Purpose and scope</h2><p>The index maps public, professionally relevant evidence about private-equity transactions, firms, people and advisers. The National Edition combines a ten-market United States atlas, two transaction evidence levels and a user-supplied PE ecosystem directory.</p><div class="rule-grid"><article><b>01</b><h3>Start with primary evidence</h3><p>Regulatory records, transaction documents, company announcements and official directories carry the most weight.</p></article><article><b>02</b><h3>Attribute people narrowly</h3><p>A person is connected to a deal only when a source names or quotes them in that transaction context.</p></article><article><b>03</b><h3>Separate evidence levels</h3><p>A portfolio directory establishes fewer facts than a transaction announcement. The interface and data preserve that distinction.</p></article><article><b>04</b><h3>State uncertainty</h3><p>Unknown, undisclosed and unverified facts are not turned into estimates.</p></article></div><h2>Transaction evidence levels</h2><p><code>transaction_announcement</code> records use official announcements or regulatory documents and may include transaction dates, values, advisers and named people. <code>official_portfolio_record</code> entries establish the investor, company, investment year and directory classification. They do not establish an announcement date, seller, price, advisers or deal team.</p><h2>Research completeness</h2><p>The 100-point completeness score measures whether a record has been properly structured from the evidence available for its evidence level. Core points cover source records, company identity, buyer, chronology, transaction type, status, investment thesis, headquarters, sector, company website, company description, classification and review date. Transaction-announcement records can earn additional points for multiple sources, named people, providers, disclosed value, completion evidence and structured research findings. A score of 75 marks a complete record. It is not an investment-quality score, and it does not convert an undisclosed fact into a known fact.</p><h2>Confirmed person-to-deal labels</h2><ul><li><code>named_deal_team</code>: directly identified as part of a transaction workstream.</li><li><code>named_adviser</code>: named by an adviser or transaction document.</li><li><code>official_transaction_spokesperson</code>: quoted or listed as a responsible firm representative.</li></ul><h2>United States atlas location evidence</h2><p><code>explicit_person_bio</code> is the strongest location mode. <code>explicit_office_filter</code> means an official firm directory returns the person for that office. <code>firm_office_association</code> means the firm has a verified office in the market, but the source does not establish the person's own work location. A transaction, headquarters address or firm membership does not establish personal location.</p><h2>User-supplied ecosystem directory</h2><p><code>ecosystem_directory</code> records preserve the submitted name, organization, title, tier and professional profile link. They are labeled as user supplied and unverified. They do not establish location, current employment, transaction participation or endorsement. Duplicate rows are merged without creating additional people.</p><h2>National coverage boundaries</h2><p>The ten hubs are selected research markets. They are not a census of U.S. private equity. A market appears when public sources support its people or firm-presence records. Missing people, firms and cities have not been verified.</p><h2>Scoring</h2><p>The relationship-economy dimensions are published as questions and evidence prompts. Company scores and rankings will require published evidence thresholds, weights and review procedures.</p><h2>Corrections and reproducibility</h2><p>Each canonical record carries a review date and source references. The website and downloads are generated from those records. Corrections should identify the exact claim and a reliable replacement source.</p><p><a class="button button-dark" href="${base}corrections/">Submit a correction</a> <a class="button button-ghost" href="${base}data/">Inspect the data</a></p></section>`;
await write('methodology/index.html',layout({title:'Methodology',description:'Evidence, attribution, privacy and scoring methodology for the Private Equity Intelligence Index.',pagePath:'methodology/',body:methodologyBody}));

const datasets = [
  ['deals','Transactions, buyers, sellers, values, roles and evidence'],['companies','Portfolio and illustrative relationship-economy companies'],['firms','Private-equity firms, asset managers and strategic acquirers'],['people','U.S. atlas, transaction-attribution and PE ecosystem profiles'],['markets','Ten cited United States private-equity hubs'],['providers','Banks, law firms, lenders and diligence providers'],['sources','Canonical public evidence register'],['framework','Relationship-economy underwriting dimensions'],['research-program','The selected 50-record program, scores and current status'],['knowledge-graph','Normalized nodes and edges for graph analysis']
];
const dataBody = `${pageHero('Open research data','Download the data','JSON and CSV exports generated from the same canonical records as the website.',`${tag('CC BY 4.0','green')}<p>Code is MIT licensed.</p>`)}<section class="section shell"><div class="download-grid">${datasets.map(([name,desc])=>`<article><span>JSON</span><h3>${esc(pretty(name))}</h3><p>${esc(desc)}</p><a href="${base}data/${name}.json" download>Download JSON ↓</a>${['deals','people','markets','providers','sources'].includes(name)?`<a href="${base}data/${name}.csv" download>Download CSV ↓</a>`:''}</article>`).join('')}</div><div class="data-note"><div><p class="eyebrow">Data contract</p><h2>Stable identifiers and traceable source references.</h2></div><p>Market and deal relationships retain their source references. Historical transaction attribution remains separate from current employment claims. Please credit Open Future Forum and link to the canonical repository.</p></div></section>`;
await write('data/index.html',layout({title:'Data downloads',description:'Download the Private Equity Intelligence Index as JSON and CSV.',pagePath:'data/',body:dataBody}));

const publisherFaq = [
  {question:'Who publishes the Private Equity Intelligence Index?',answer:'Open Future Forum publishes and maintains the Private Equity Intelligence Index. The project connects public records about private-equity transactions, firms, professional roles, advisers and executive-community businesses.'},
  {question:'What is Open Future Forum?',answer:'Open Future Forum is an executive community and research publisher that convenes senior leaders through private peer discussions, events and public research. Within this index, it is also used as an illustrative example of a relationship-economy business.'},
  {question:'Why does Open Future Forum publish private-equity research?',answer:'Information about private-equity ownership and transaction roles is distributed across announcements, regulatory filings, company pages and professional biographies. The index organizes those records into a source-linked public dataset.'},
  {question:'Is the index investment advice?',answer:'No. The index is publisher research and an open evidence resource. It is not investment advice, a valuation, a solicitation or a recommendation to buy or sell any security or company.'},
  {question:'Is Open Future Forum for sale?',answer:'The index does not state or imply that Open Future Forum is for sale, seeking investment or engaged in a transaction. Its inclusion is illustrative and supports research into executive-community business models.'},
  {question:'How should the research be cited?',answer:'Citations should name the Private Equity Intelligence Index and Open Future Forum, link to the relevant canonical record, and retain the original public source links. The data license and repository provide reuse terms and revision history.'}
];
const publisherBody = `${pageHero('About the publisher','Open Future Forum','Publisher and steward of an open, evidence-led index covering private-equity transactions, people, firms and advisers.',`${tag('publisher research','green')}<p>Not investment advice or a solicitation.</p>`)}<section class="section shell prose"><h2>What Open Future Forum is</h2><p>Open Future Forum is an executive community and research publisher. It convenes senior leaders through private peer discussions and events, and publishes research on executive communities, technology, leadership and private markets.</p><h2>Why publish this index</h2><p>Private-equity information is spread across press releases, regulatory filings, biography pages and company directories. This index connects those public records by deal, person, firm and provider, while preserving the difference between confirmed facts, publisher analysis and unknown information.</p><div class="rule-grid"><article><b>01</b><h3>Public evidence</h3><p>Material claims link to public source records wherever possible.</p></article><article><b>02</b><h3>Narrow attribution</h3><p>People receive deal credit only when a transaction source identifies or quotes them.</p></article><article><b>03</b><h3>Visible uncertainty</h3><p>Undisclosed values, advisers and participants remain labeled as gaps.</p></article><article><b>04</b><h3>Open correction</h3><p>Corrections can be proposed with a reliable replacement source and exact claim reference.</p></article></div><h2>Editorial position</h2><p>Open Future Forum owns, funds, edits and publishes this index. It is publisher research, not academic research. It is not investment advice, a solicitation or a claim that any profiled company is seeking a transaction. Open Future Forum appears only as an illustrative example of a relationship-economy business.</p><p><a href="${base}methodology/">Read the methodology</a> · <a href="${base}data/">Inspect the open data</a> · <a href="${base}corrections/">Review the correction process</a></p><h2>Publisher questions</h2><div class="faq-list">${publisherFaq.map((item)=>`<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</div><h2>Stewardship</h2><p>Murray Newlands and Open Future Forum maintain the project. The repository records changes to source data, methodology and generated pages.</p></section>`;
const publisherSchema = {'@context':'https://schema.org','@graph':[
  {'@type':'AboutPage','@id':`${siteUrl}publisher/#webpage`,name:'About Open Future Forum, publisher of the Private Equity Intelligence Index',description:'Publisher identity, editorial standards and stewardship for the Private Equity Intelligence Index.',url:`${siteUrl}publisher/`,about:{'@id':'https://openfutureforum.com/#organization'}},
  {'@type':'Organization','@id':'https://openfutureforum.com/#organization',name:'Open Future Forum',url:'https://openfutureforum.com/',description:'Executive community and research publisher that convenes senior leaders through private peer discussions, events and public research.'},
  {'@type':'FAQPage','@id':`${siteUrl}publisher/#faq`,mainEntity:publisherFaq.map((item)=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))}
]};
await write('publisher/index.html',layout({title:'Publisher',description:'About Open Future Forum and the editorial position behind the Private Equity Intelligence Index.',pagePath:'publisher/',body:publisherBody,schema:publisherSchema}));

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
const dealCsv = deals.map((d)=>({id:d.id,title:d.title,company:companyMap.get(d.target_company_id).name,record_date:d.announced_on,date_basis:d.date_basis??'announcement_date',evidence_tier:d.evidence_tier??'transaction_announcement',status:d.status,transaction_type:d.transaction_type,buyers:d.buyer_firm_ids.map((id)=>firmMap.get(id).name).join('; '),value:d.enterprise_value?.display??'',source_ids:d.source_ids.join('; ')}));
const peopleCsv = people.map((p)=>({id:p.id,name:p.name,scope:p.profile_scope.join('; '),market:p.market_id?marketMap.get(p.market_id).name:'',current_title:p.current_title??'',current_firm:p.current_firm_id?firmMap.get(p.current_firm_id).name:'',organization:p.organization??'',ecosystem_tier:p.ecosystem_tier??'',professional_profile_url:p.professional_profile_url??'',verification_status:p.verification_status??'',location:p.location??'',location_evidence:p.location_evidence??'',source_ids:p.source_ids.join('; ')}));
const marketCsv = markets.map((m)=>({id:m.id,name:m.name,region:m.region,people_count:people.filter((p)=>p.market_id===m.id).length,firm_count:firms.filter((f)=>f.us_market_ids?.includes(m.id)).length,description:m.description}));
const providerCsv = providers.map((p)=>({id:p.id,name:p.name,category:p.category,engagement_count:deals.reduce((n,d)=>n+d.provider_roles.filter((r)=>r.provider_id===p.id).length,0),website:p.website,source_ids:p.source_ids.join('; ')}));
const sourceCsv = sources.map((s)=>({id:s.id,title:s.title,publisher:s.publisher,url:s.url,source_class:s.source_class,published_date:s.published_date??'',accessed_date:s.accessed_date,supports:s.supports.join('; ')}));

for (const [name,data] of Object.entries({deals,companies,firms,people,markets,providers,sources,framework,'research-program':researchProgram,'knowledge-graph':graph})) await write(`data/${name}.json`, `${JSON.stringify(data,null,2)}\n`);
await write('data/deals.csv',csv(dealCsv,['id','title','company','record_date','date_basis','evidence_tier','status','transaction_type','buyers','value','source_ids']));
await write('data/people.csv',csv(peopleCsv,['id','name','scope','market','current_title','current_firm','organization','ecosystem_tier','professional_profile_url','verification_status','location','location_evidence','source_ids']));
await write('data/markets.csv',csv(marketCsv,['id','name','region','people_count','firm_count','description']));
await write('data/providers.csv',csv(providerCsv,['id','name','category','engagement_count','website','source_ids']));
await write('data/sources.csv',csv(sourceCsv,['id','title','publisher','url','source_class','published_date','accessed_date','supports']));

const pagePaths = ['', 'deals/', ...deals.map((d)=>`deals/${d.slug}/`), 'atlas/', ...markets.map((m)=>`atlas/${m.slug}/`), 'people/', ...people.map((p)=>`people/${p.slug}/`), 'firms/', ...firms.map((f)=>`firms/${f.slug}/`), 'providers/', ...providers.map((p)=>`providers/${p.slug}/`), ...companies.map((c)=>`companies/${c.slug}/`), 'explorer/','depth/','thesis/','sources/','methodology/','data/','publisher/','privacy/','corrections/'];
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pagePaths.map((p)=>`<url><loc>${siteUrl}${p}</loc><lastmod>2026-10-10</lastmod></url>`).join('')}</urlset>\n`);
await write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`);
await write('llms.txt',`# Private Equity Intelligence Index\n\nEvidence-led research from Open Future Forum on private-equity deals, U.S. market hubs, people, firms and service providers.\n\n- Website: ${siteUrl}\n- United States atlas: ${siteUrl}atlas/\n- Methodology: ${siteUrl}methodology/\n- Sources: ${siteUrl}sources/\n- Data: ${siteUrl}data/\n- Repository: https://github.com/OpenFutureForum/private-equity-intelligence\n\nDo not infer deal participation from employment or personal location from firm presence. User-supplied ecosystem profiles are unverified and separately labeled. Follow the source IDs attached to each relationship.\n`);
await write('favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#071727"/><path d="M15 18h19c10 0 16 5 16 13s-6 13-16 13h-8v8H15V18Zm11 9v8h7c4 0 6-1 6-4s-2-4-6-4h-7Z" fill="#5ee7ff"/></svg>`);
await write('.nojekyll','');

console.log(`Built ${pagePaths.length} pages, ${deals.length} deals and ${graph.edges.length} graph edges.`);
