# ADR 0002 — Curated Firm Database with Nightly Scraping

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Curated Firm Database with Live Postings
**Deciders:** Owen Ash

---

## Context

For InternshipMatch to be useful, it needs current data about which firms are actively recruiting, what roles are open, when applications are due, and where to apply. This data exists — but it's scattered across 200+ firm career pages, each with its own layout, application portal, and update schedule. Adventis and Trackr solve this by manually curating their lists and scraping the underlying career pages. Every day, somebody (or a scheduled script) visits Goldman's careers page, Jefferies' careers page, William Blair's careers page, and so on, and updates the master list when new postings appear or old ones disappear.

The alternative — integrating with each firm's applicant tracking system (iCIMS, Workday, Greenhouse, Taleo) via official APIs — is not feasible at this scale. Most ATS providers require employer-side enterprise contracts to expose their APIs, and the data returned is often limited to what the employer has explicitly chosen to share. Building 200 firm-specific API integrations would take months and would break every time a firm changed ATS providers.

So the question is not "scrape or integrate" — integration isn't realistic. The question is how to build a scraping pipeline that's reliable enough to trust, resilient enough to survive career page redesigns, and honest enough with users when it inevitably breaks.

---

## Decision

InternshipMatch maintains a curated registry of ~200 finance firms in the `firms` table, each with a `scraper_adapter` field pointing to a Python module that knows how to scrape that firm's career page. A nightly orchestration script (`backend/scrapers/run_nightly.py`) iterates the registry, calls each adapter, and diffs the results against the stored `postings` table.

The scraper pipeline uses a layered approach:

1. **Firecrawl MCP is the default.** Most firms have static or lightly-JS-rendered career pages that Firecrawl handles well. Each firm's adapter is ~30 lines of Python that calls Firecrawl with the firm's careers URL and a target schema, then transforms the response into `ScrapedPosting` objects.

2. **Playwright is the fallback.** For firms with aggressive bot detection, dynamic rendering, or infinite-scroll posting lists (Goldman, JPM, some of the bulge brackets), the adapter uses Playwright with stealth mode. This is slower and more expensive but handles cases Firecrawl can't.

3. **Adventis/Trackr mirroring is the safety net.** Both Adventis and Trackr publish aggregated lists of finance internships. When a firm's direct scraper fails, the pipeline checks the aggregated lists for recent postings at that firm and uses them as a fallback. This prevents single-firm outages from creating gaps in the data.

Diff logic is straightforward: new postings get inserted, updated postings get patched, disappeared postings get marked with a `closed_at` timestamp (never deleted, so historical data is preserved for timeline analysis). Scraper errors are logged per-firm and do not halt the pipeline — one broken adapter never breaks the whole run.

---

## Consequences

### Positive

- **Live data within 24 hours of any posting change.** The nightly run catches new postings fast enough that users see them within a day of going live. For a recruiting cycle that moves week-to-week, that's fast enough.
- **Firm-specific adapters isolate failures.** When Jefferies redesigns their careers page, the Jefferies adapter breaks and every other firm keeps working. A single adapter is a single point of failure only for that firm.
- **Historical data is preserved.** By never deleting postings, we can analyze trends over time — when did Goldman typically post summer analyst roles, which firms shifted their timelines, what's the median time-to-close for an IB posting. This data becomes product signal later.
- **Aggregator mirroring is a cheap safety net.** Adventis and Trackr already do the work of manually checking the major firms. Using their aggregated output as a fallback when my own scraper breaks is free redundancy.
- **Adapter pattern makes expansion easy.** Adding firm 201 is "write one more 30-line adapter file." The orchestration, diffing, and storage logic stays unchanged.

### Negative

- **Scrapers break constantly.** Career pages redesign without warning. I will spend time every week fixing broken adapters. This is not a failure mode — it's operational overhead that needs to be accepted as part of the cost of running the product.
- **Legal gray area.** Scraping public career pages is legally unsettled. Courts have generally sided with scrapers for publicly accessible data (hiQ v. LinkedIn established some precedent), but individual firms may send cease-and-desist letters. Mitigated by respecting `robots.txt`, scraping at modest frequency (once per day), and being willing to stop scraping any firm that asks.
- **Nightly latency means missed postings.** If a firm posts a role at 9 AM and closes it at 5 PM the same day (rare but happens for highly competitive roles), the InternshipMatch user won't see it until the next morning when the scraper has already missed the window. Phase 2 adds hourly scraping for a subset of high-priority firms to mitigate this.
- **Cost scales with firm count.** 200 firms × 1 Firecrawl call per day = ~6,000 calls per month. At current Firecrawl pricing that's around $20-30/month. Acceptable at launch; worth monitoring as the firm count grows.

### Manual curation is a feature, not a bug

The firm registry is hand-curated. I personally decide which firms are in the list. This is deliberate: a curated list of 200 excellent firms is more valuable to a finance student than an auto-discovered list of 2,000 random companies with "finance" in their job descriptions. The curation step is where domain expertise becomes product value — knowing that William Blair is a top middle-market IB firm and Morningstar is buy-side asset management and Point72 is a hedge fund matters, and an automated firm discovery pipeline would lose that knowledge.

---

## Alternatives Considered

**Direct ATS API integrations.** Rejected because most ATS providers require employer-side access, not candidate-side access. Even the providers with open APIs (Greenhouse's public job board API) only cover a small fraction of the firms InternshipMatch targets.

**LinkedIn Jobs API.** Rejected because LinkedIn's API is essentially closed to third parties, and scraping LinkedIn directly is explicitly forbidden in their terms of service. Risk is too high.

**Partnership with Adventis or Trackr for licensed data access.** Not rejected — this is a legitimate Phase 2 path if the scraping approach becomes too operationally heavy. For Phase 1, scraping is cheaper and gives me full control.

**Crowdsourced posting submissions.** Considered — let users report new postings they find. Rejected for Phase 1 because it creates a chicken-and-egg problem (no users means no submissions means stale data means no users). May add as a supplementary signal in Phase 3.

**Scraping on demand when a user loads the dashboard.** Rejected because scraping 200 firms takes 5-10 minutes, which is way too slow for a dashboard load. Nightly batch scraping into a cached `postings` table lets the dashboard load in under a second.

---

## References

- `backend/scrapers/firm_registry.py` — the master registry with 200+ firms
- `backend/scrapers/base.py` — the `FirmScraper` protocol
- `backend/scrapers/adapters/` — one file per firm adapter
- `backend/scrapers/run_nightly.py` — the orchestration script
- `infra/supabase/migrations/` — the `firms` and `postings` table definitions
