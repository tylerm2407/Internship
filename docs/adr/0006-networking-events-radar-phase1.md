# ADR 0008 — Networking Events Radar (Phase 1: Minimal SerpAPI Build)

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Networking Events Radar (Phase 1 scope)
**Deciders:** Owen Ash
**Supersedes:** None
**Superseded by:** ADR 0009 when Phase 2 ships

---

## Context

Finance students don't just apply to internships — they go to events. On-campus firm info sessions, Bryant Finance Society speaker nights, CFA Society chapter mixers, firm-hosted recruiting events in Boston and NYC, industry conferences. The students who show up to these events meet the recruiters before their application hits the pile, which is often the entire difference between getting a screen and getting rejected. Every finance recruiting guide says the same thing: network in person, get your face in front of the people who decide. And then doesn't tell you how to find the events.

InternshipMatch already helps users find firms and score their fit. Adding a feature that surfaces the actual events where users can meet recruiters from those firms is a natural extension. The harder question is how to do it without spending a week on scraper infrastructure.

Research during the design phase established that the obvious APIs are all dead ends. Eventbrite killed public event search in December 2019 and has been fully unmaintained since April 2025. LinkedIn's Events API is locked behind their Marketing Partner Program and isn't available to individual developers. Meetup's API only manages groups you own, not discovery. PredictHQ is enterprise-priced ($1k+/month) and built for retail demand forecasting, not professional networking discovery. Facebook Events requires a Graph API review that takes weeks.

The one viable option is **SerpAPI's Google Events engine**, which scrapes Google's events aggregator. Google's aggregator pulls from Eventbrite, Meetup, Luma, Allevents, and a long tail of other sources, which means one API call returns results from multiple underlying platforms without having to integrate with each one. Cost is roughly $50/month for 5,000 searches on the hobby tier, well within Phase 1 budget.

The question for this ADR is whether SerpAPI alone is enough to ship a useful Phase 1 feature, or whether the feature needs the full three-source architecture before it's worth building at all.

---

## Decision

Phase 1 of Networking Events Radar ships with **SerpAPI Google Events as the only data source**. No firm-specific scrapers, no career center integration, no crowdsourced submissions. Just a single `/api/events` endpoint that takes a location and a query, calls SerpAPI, caches results in Supabase, and returns a ranked list of events to the frontend.

The purpose of Phase 1 is not to be the final version of this feature. The purpose is to ship something shippable in 2-3 hours of engineering work, use it for a week on real recruiting workflows, and **validate whether SerpAPI's data quality is good enough to be useful before investing in the full architecture**. If the Phase 1 results are genuinely helpful, the full three-source architecture (ADR 0009) becomes the obvious Phase 2 investment. If Phase 1 results are mostly noise, that's important information that changes the entire design — maybe the right answer is to skip SerpAPI entirely and go straight to curated firm scrapers.

Shipping Phase 1 first is a data-gathering exercise, not a product launch.

### What's in Phase 1

1. **SerpAPI account and API key.** Sign up for the hobby tier ($50/month, 5,000 searches). Store the key in `.env` as `SERPAPI_API_KEY`.

2. **One backend route.** `GET /api/events?location={city}&query={text}&days_ahead={n}` at `backend/app/main.py`. Calls SerpAPI, parses the response into `NetworkingEvent` Pydantic models, caches the raw response in Supabase for 6 hours keyed on `(location, query, days_ahead)`, returns the list.

3. **One Pydantic model.** `NetworkingEvent` with fields: `id`, `title`, `date_start`, `date_end`, `venue_name`, `address`, `city`, `state`, `description`, `event_url`, `source_platform` (eventbrite/meetup/luma/etc.), `thumbnail_url`, `retrieved_at`.

4. **One simple relevance filter.** Pure Python, no Claude calls. Filter out events where the title or description contains any banned keyword: "paid training", "certification course", "bootcamp $", "webinar", "online course". Boost events where the title contains any of: "info session", "networking", "mixer", "recruiting", "meet the", "CFA Society", "finance society", "firm name from user's target list". Sort by score descending, then by date ascending. Return top 20.

5. **One frontend page.** `/events` — search bar with a location picker (defaults to user's saved city from their profile), a date range dropdown (next 7 / 30 / 90 days), and a results list. Each result is a simple card: title, date with countdown, venue, distance, short description, and a "View details" link to the original posting.

6. **Cache layer.** Results from SerpAPI are expensive per-call and don't change minute-to-minute, so cache aggressively. A single `events_cache` table in Supabase with `cache_key` (hash of location+query+days_ahead), `results_json`, `fetched_at`, `expires_at`. Any request for the same cache key within 6 hours returns the cached version without hitting SerpAPI.

### What's explicitly out of Phase 1

- No firm-specific scrapers (deferred to ADR 0009)
- No Bryant Career Center integration (deferred)
- No crowdsourced event submission (deferred)
- No Claude-generated "why you should go" text (deferred — pure keyword filtering only)
- No integration with Networking Radar / alumni tracker (deferred)
- No calendar export (.ics generation) (deferred)
- No "mark as attending" tracker (deferred)
- No event-type badges, no distance calculation, no Claude ranking

All of this is deliberately cut. Phase 1 is the smallest possible slice that lets Owen type "investment banking networking Boston" and see a list of events. Every additional feature delays validation.

### The SerpAPI query construction

The search query sent to SerpAPI is constructed from the user's profile plus the search input. A default "show me everything" query for a Bryant Finance sophomore targeting IB in the Northeast would be something like:

```
"investment banking networking event Providence Rhode Island"
```

The route accepts an override `query` parameter for free-text searches. When no query is provided, the backend generates a default query by combining the user's primary target role (from `target_roles`) + "networking event" + the location.

---

## Consequences

### Positive

- **Ships in 2-3 hours.** Real work, not a weekend project. One route, one model, one page, one cache table. That's it.
- **Validates the data-quality question with minimal investment.** After a week of real use, Owen will know whether SerpAPI's results are genuinely useful or mostly noise. That answer shapes every decision about Phase 2.
- **Cost is bounded.** $50/month for 5,000 searches. With 6-hour caching, a single active user generates maybe 20 unique cache misses per week. Fits 10+ active users within the free tier if caching works well.
- **No lock-in.** If SerpAPI turns out to be wrong, ripping it out is trivial — one module, one API client, a few dozen lines of Python. The rest of the app doesn't depend on it.
- **Validates the product hypothesis.** The deeper question "do users actually want to see networking events in InternshipMatch, or is this a feature nobody opens?" gets answered cheaply. If the events page gets zero visits in the first week, that's important signal that says "don't build the full version."

### Negative

- **Results will include noise.** Google Events returns a lot of paid courses, mediocre meetups, and general "finance" events that aren't recruiting-relevant. The keyword filter catches the worst of it but won't catch everything. Some results will be useless.
- **Coverage is biased toward what's on Eventbrite and Meetup.** The highest-value events — firm info sessions on the Bryant quad, Finance Society speaker nights, Goldman's NYC recruiting mixer — typically don't show up in Google Events because they're posted on firm career pages or school portals that Google doesn't index well. Phase 1 will miss them. That's a known gap, not a bug.
- **No personalization beyond the search query.** Two users with identical location but different target roles see the same results if they type the same query. The scoring layer in Phase 2 will fix this; Phase 1 punts.
- **No qualitative context.** Users see a list of events but no AI-generated explanation of why each one matters to them. The "why you should go" feature is the thing that makes events feel personalized, and Phase 1 skips it to hit the 2-3 hour budget.
- **User might get the wrong impression.** A sophomore who tries the events page, sees 15 mediocre results, and concludes "InternshipMatch events are bad" might not come back to check if Phase 2 fixed it. Mitigated by labeling the feature clearly as "beta" and adding a feedback link on the page so early users can report bad results directly.

### What "success" looks like for Phase 1

After one week of Owen personally using the events page as part of his actual recruiting workflow, at least one of these has to be true for Phase 1 to be worth extending into Phase 2:

1. He found at least 2 events he would not have otherwise known about and plans to actually attend.
2. The feature prompted him to search for an event type he hadn't previously thought about (e.g., "I didn't know CFA Society has a Providence chapter — now I'm going to their May event").
3. At least 30% of the top-10 results are genuinely relevant for any given search.

If none of those are true, the conclusion is "SerpAPI is not enough — Phase 2 needs to lead with curated firm scrapers instead."

---

## Implementation Checklist

For the 2-3 hour build window:

- [ ] Sign up for SerpAPI, add `SERPAPI_API_KEY` to `backend/.env.example` and `backend/.env`
- [ ] Install `google-search-results` Python package (SerpAPI's official client)
- [ ] Write `backend/app/events_client.py` — thin wrapper around the SerpAPI client with one function `search_events(location: str, query: str, days_ahead: int) -> list[NetworkingEvent]`
- [ ] Add `NetworkingEvent` Pydantic model to `backend/app/models.py`
- [ ] Add `events_cache` table to Supabase via a new migration
- [ ] Write `GET /api/events` route in `backend/app/main.py` with cache check, SerpAPI call, filter, response
- [ ] Write `frontend/app/events/page.tsx` — search bar, date dropdown, results list
- [ ] Write `frontend/components/EventCard.tsx` — one card per result
- [ ] Add `api.getEvents(location, query, daysAhead)` to `frontend/lib/api.ts`
- [ ] Manual test with three queries: "investment banking networking Boston", "finance event Providence Rhode Island", "CFA Society event New England"
- [ ] Personally use the page every day for one week, log every event you considered attending, note which ones came from this page vs. elsewhere
- [ ] Review the log at the end of the week and decide whether Phase 2 is worth building

---

## Alternatives Considered

**Skip Phase 1, build the full three-source architecture directly.** Rejected because it's a multi-day build against unproven assumptions. If the feature hypothesis is wrong (users don't want events in InternshipMatch), two days of engineering are wasted. Phase 1 is a data-gathering exercise, not a scoped-down version of the real product.

**Build firm-specific scrapers first.** Considered seriously. The argument is that on-campus info sessions are the most valuable events, so start with the data source that captures them. The counter-argument is that scraping firm career pages for events is the same engineering pattern as scraping them for postings — which is already the hardest and most operationally heavy part of InternshipMatch. Adding 20 new scraper adapters before validating that users even want this feature is expensive. Phase 1 validates cheap; Phase 2 invests in the expensive path once validation is in.

**Use Meetup's group API instead of SerpAPI.** Rejected because Meetup's API is primarily for managing groups you own, not discovering events across the platform. The discovery endpoints are limited and don't cover the breadth of sources SerpAPI does.

**Use Claude to scrape the web directly via web_search.** Considered. The problem is that every user query would be a Claude call, which is both slow (10-20 seconds) and expensive ($0.10+ per call). SerpAPI is faster, cheaper, and structured. Claude is the wrong tool for bulk event discovery.

**Paid enterprise event APIs (PredictHQ, Eventtia).** Rejected on cost. PredictHQ starts around $1,000/month and is built for demand forecasting at retailers and hotels. Eventtia is built for enterprise event organizers, not discovery. Neither makes sense for Phase 1.

---

## References

- `backend/app/events_client.py` — the SerpAPI wrapper
- `backend/app/main.py` — the `/api/events` route
- `backend/app/models.py` — the `NetworkingEvent` model
- `frontend/app/events/page.tsx` — the events page
- `docs/adr/0009-networking-events-radar-full.md` — the Phase 2 architecture this ADR supersedes when ready
- SerpAPI Google Events docs: https://serpapi.com/google-events-api
