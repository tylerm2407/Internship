# ADR 0009 — Networking Events Radar (Phase 2: Three-Source Architecture)

**Status:** Proposed (blocked on Phase 1 validation per ADR 0008)
**Date:** 2026-04-08
**Feature:** Networking Events Radar (full scope)
**Deciders:** Owen Ash
**Supersedes:** ADR 0008 (which is Phase 1 of this same feature)

---

## Context

ADR 0008 documented the Phase 1 minimal build of the Networking Events feature — a single SerpAPI-backed search that ships in 2-3 hours and validates whether users actually want this feature before investing in full infrastructure. This ADR documents the Phase 2 target architecture: the version of Networking Events Radar that actually delivers on the full product promise once Phase 1 validation confirms the hypothesis.

The critical insight that drives Phase 2 is that **the highest-value networking events for a finance student do not show up in any generic event API**. SerpAPI via Google Events is reasonable for the long tail of industry mixers and conferences, but the events that actually move the needle for IB/S&T/PE recruiting live in three separate data worlds that need to be unified:

1. **Generic event aggregators** (SerpAPI → Google Events → Eventbrite/Meetup/Luma). Good for industry conferences, CFA Society chapter events, professional association mixers, and one-off recruiting events in major cities. Weak for firm-specific recruiting events and on-campus events.

2. **Firm career page events sections.** Goldman Sachs, JP Morgan, Jefferies, William Blair, and most serious finance firms maintain a "student events" or "campus recruiting" page on their careers site listing info sessions, diversity events, and recruiting mixers. These are the highest-conversion events by far because they're the exact place where recruiters are actively evaluating candidates. Nobody else aggregates them. They're invisible to Google Events because they're on firm ATS subdomains that Google doesn't index well.

3. **School career center and student organization events.** Bryant's career center portal, the Bryant Finance Society's Instagram and email list, the SMIF meeting schedule, the Bryant chapter of Beta Gamma Sigma. These are the "home court" events — easiest to attend, highest reputational value within the Bryant community, often not listed anywhere outside the school's internal systems.

A feature that only covers Source 1 will be mediocre. A feature that covers all three will be unlike anything else in the finance recruiting space. Nobody — not Adventis, not Trackr, not Handshake, not WSO — aggregates firm info sessions, school events, and general networking events into a single personalized feed.

Phase 2 is where this feature becomes the thing finance students actually tell their friends about.

---

## Decision

Networking Events Radar Phase 2 ingests events from three data sources into a unified `events` table, scores them with a finance-specific relevance model (identical pattern to ADR 0003's hybrid fit scoring), and serves them via a ranked personalized feed with Claude-generated context and tight integration with the Networking Radar (Feature 6) alumni system.

### The three-source architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Source 1: SerpAPI Google Events (long-tail discovery)          │
│                                                                 │
│  - One API call per (location, query) combination               │
│  - Cached 6 hours per cache key                                 │
│  - Refresh on dashboard load if cache miss                      │
│  - Covers: conferences, CFA events, general mixers, industry    │
│    association events, miscellaneous Eventbrite/Meetup filler   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│  Source 2: Firm Career Page Event Scrapers (highest value)      │
│                                                                 │
│  - One scraper adapter per firm, reusing the pattern from       │
│    ADR 0002's posting scrapers                                  │
│  - Runs nightly as part of the existing scraper orchestration   │
│  - Covers: firm info sessions, diversity recruiting events,     │
│    campus visits, firm-hosted mixers, alumni panels             │
│  - The scraper targets each firm's "student events" or          │
│    "campus recruiting" subpage, not the main job postings page  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│  Source 3: School + Student Org Sources (on-campus events)      │
│                                                                 │
│  - Bryant Career Center events page scraper (nightly)           │
│  - Crowdsourced submission endpoint (user pastes event text,    │
│    Claude parses into structured event)                         │
│  - Manual ingest for Bryant Finance Society emails (Phase 2b)   │
│  - Covers: on-campus info sessions, club speaker nights,        │
│    SMIF events, Career Center workshops                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Unified events table in Supabase                               │
│                                                                 │
│  Deduplication: (title, date, city) hash catches duplicates     │
│  across sources                                                 │
│  Source attribution: events table stores `source` enum so       │
│  the UI can show where each event came from                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Relevance scoring engine                                       │
│                                                                 │
│  Deterministic base score + Claude qualitative pass             │
│  Same pattern as ADR 0003's fit scoring                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Personalized events feed at /events                            │
│                                                                 │
│  - Ranked list with Claude "why you should go" explanations     │
│  - Filter strip: date range, event type, distance, cost         │
│  - "Mark as attending" button → feeds alumni tracker            │
│  - Calendar export (.ics) per event                             │
│  - "Pre-event briefing" link → generates prep doc before event  │
└─────────────────────────────────────────────────────────────────┘
```

### The event schema

```python
class NetworkingEvent(BaseModel):
    id: UUID
    source: Literal["serpapi", "firm_scraper", "school_scraper", "user_submitted"]
    source_id: str                       # original ID from the source, used for dedup
    title: str
    description: str
    date_start: datetime
    date_end: datetime | None
    timezone: str
    venue_name: str | None
    address: str | None
    city: str
    state: str
    is_virtual: bool
    virtual_link: str | None
    event_type: Literal["info_session", "mixer", "speaker_series", "conference",
                         "workshop", "recruiting_event", "career_fair", "diversity_program",
                         "alumni_panel", "club_meeting", "other"]
    related_firm_ids: list[UUID]         # firms mentioned in the event, mapped to firms table
    estimated_cost: float                # 0 for free events
    registration_url: str
    thumbnail_url: str | None
    ingested_at: datetime
    last_updated_at: datetime
    is_closed: bool                      # true if registration closed or event passed
```

### The deduplication layer

A single recruiting event can appear in multiple sources. Goldman Sachs might post their "Sophomore Summer Open House" on both their firm career page (Source 2) and Eventbrite (Source 1 via SerpAPI). The dedup key is a hash of `(normalized_title, date_start_day, city)` where `normalized_title` lowercases, strips punctuation, and collapses whitespace. When an event arrives from Source 2 (firm scraper) and matches an existing Source 1 (SerpAPI) event, the higher-trust source wins and the lower-trust source is discarded. Source priority: firm_scraper > school_scraper > user_submitted > serpapi.

### The relevance scoring engine

Identical pattern to ADR 0003's hybrid fit scoring for opportunities, applied to events.

**Phase 1: Deterministic base score (0-100).** Six factors weighted:

1. **Firm match (weight: 30)** — if the event's `related_firm_ids` overlaps with the user's target firm list (derived from their strong_match and reach opportunities), massive score boost. Zero overlap: 0 points. One firm match: 25. Multiple matches: 30.
2. **Event type match (weight: 20)** — info_session, recruiting_event, and diversity_program score highest for active recruiters. speaker_series and alumni_panel score moderately. workshop scores low unless the topic is technical. club_meeting scores high only for on-campus events.
3. **Distance (weight: 15)** — same city as user: 15. Adjacent metro (Boston↔Providence, NYC↔NJ): 10. Within 200 miles: 5. Beyond: 0. Virtual events: 8 regardless of location.
4. **Date proximity (weight: 15)** — within 7 days: 15. 7-30 days: 12. 30-90 days: 8. 90+ days: 3. Past events: excluded.
5. **Cost (weight: 10)** — free: 10. Under $25: 8. Under $100: 4. Over $100: 0. Student pricing bonus: +2 if explicitly student-priced.
6. **Role alignment (weight: 10)** — description contains keywords matching user's target_roles (investment_banking, sales_and_trading, private_equity, quant): full points per match up to 10.

**Phase 2: Claude qualitative pass on top 20.** The same `FIT_SCORE_QUALITATIVE_PROMPT` pattern from ADR 0003, adapted for events. Claude reviews the top 20 base-scored events and produces:

- A score adjustment of ±10 points
- A one-sentence "why you should go" rationale personalized to the user
- A tag indicating priority: "must attend", "worth going", "if you're free", "skip unless curious"

The Claude pass costs roughly 20 calls per dashboard load, cached 24 hours per user, so cost is bounded.

### The pre-event briefing generator

This is the feature that makes Events radar feel magical and tightly integrates with Feature 6 (Networking Radar). When a user marks themselves as attending an event, InternshipMatch generates a briefing document with:

1. **Which firms will be there.** Extracted from the event's `related_firm_ids`.
2. **Which Bryant alumni work at those firms.** Cross-referenced from the alumni table.
3. **Three questions to ask each firm representative.** Claude-generated based on the firm's current deal flow, recent news, and the user's profile. Not generic questions — specific ones that demonstrate the user did their homework.
4. **A pre-drafted follow-up email template.** Generic skeleton the user can personalize and send within 24 hours of the event to every person they meet. Claude writes it based on the event context and the user's resume.
5. **A reminder to add new contacts to the alumni tracker.** One-tap "add this person" button on the briefing page that creates a new `alumni` row linked to the event.

The briefing is generated on-demand when the user clicks the "Prepare for event" button, not preemptively. It takes 5-10 seconds and costs one Claude call.

### The post-event tracker

24 hours after an event the user marked as attending, InternshipMatch sends an in-app notification: "How did the Goldman info session go? Add the people you met." Users can add new contacts in bulk (name + firm + LinkedIn URL) which creates `alumni` rows automatically. The follow-up email template generated in the pre-event briefing gets pre-filled with each contact's name so the user can send personalized thank-yous in minutes, not hours. This is the single highest-leverage use of the Networking Radar + Events integration — it turns casual event attendance into structured relationship management.

### The API surface

```
GET  /api/events                         # personalized ranked feed
GET  /api/events/{event_id}              # single event detail
POST /api/events/submit                  # user-submitted event (crowdsourced)
POST /api/events/{event_id}/attending    # mark as attending
POST /api/events/{event_id}/briefing     # generate pre-event briefing (Claude call)
POST /api/events/{event_id}/attended     # post-event "I went" confirmation
POST /api/events/{event_id}/contacts     # bulk add contacts met at event
GET  /api/events/{event_id}/calendar.ics # download calendar file
```

---

## Consequences

### Positive

- **Unique in the finance recruiting space.** No competitor aggregates firm events, school events, and general mixers into one personalized feed. Adventis lists firm applications but not events. Trackr is a tracker. Handshake covers some school events but doesn't rank them against the user's target firms. This three-source blend is genuinely unmatched.
- **The firm event scrapers are the moat.** Source 2 is the thing nobody else has. A Goldman Sachs student event happening next Tuesday in NYC is vastly more valuable to a Bryant sophomore than a generic "Finance Networking Mixer" on Eventbrite, and it's the exact data nobody else is collecting and surfacing to students. Once these scrapers are in place and maintained, they're a durable advantage.
- **The briefing generator is the hook.** "InternshipMatch told me who would be at the event, what questions to ask, and drafted my thank-you emails afterward" is a story users tell their friends. Features that generate word-of-mouth are the features that grow products.
- **Tight integration with existing Feature 6 (Networking Radar).** Events and alumni become two sides of the same networking workflow instead of separate features. The alumni tracker gets populated from two sources: cold outreach (Feature 6) and event attendance (Feature 8). Both compound into the same long-term relationship graph.
- **Scoring model reuses the fit scoring pattern.** The engineering work to build the event scorer is small because it's structurally identical to the opportunity scorer from ADR 0003. Same deterministic + Claude hybrid, same caching pattern, same tier mapping.
- **The nightly scraper pipeline already exists.** Adding firm event scrapers to the existing `run_nightly.py` orchestration is a matter of writing new adapters, not building new infrastructure. The scheduled job, the diff logic, the Supabase writes — all of it is reusable.

### Negative

- **Firm event scrapers double the scraper maintenance burden.** Every firm that already has a posting adapter will need a second adapter for their events page. Those pages redesign independently from the postings pages, which means the fragility grows. Mitigated by the same operational pattern as the posting scrapers: log errors per-firm, keep the pipeline running even when individual adapters break, fix them manually in the morning.
- **School career center scraping is school-specific.** Bryant's career center portal is a custom build, not a standard product. The scraper for Bryant's page won't work for Babson's page, which won't work for Bentley's page, which won't work for any other school. Every new school InternshipMatch expands to requires a new school-specific scraper. Acceptable at launch (Bryant only) but it limits the multi-school growth model.
- **Crowdsourced submission has a content moderation problem.** Users can submit events, but nothing stops a user from submitting spam or low-quality events. Mitigated by Claude parsing every submission and rejecting anything that doesn't look like a structured event, but this is not a perfect filter. Phase 3 might add peer moderation or a flagging system.
- **The briefing generator costs a Claude call per event attendance.** At current pricing, roughly $0.05 per briefing. Reasonable at launch but scales with engagement. Mitigated by caching briefings for 24 hours so a user who clicks the button multiple times doesn't re-generate.
- **Deduplication is imperfect.** Two versions of the same event with slightly different titles ("Goldman Sachs Info Session" vs "Goldman Sachs Sophomore Info Session") will not be deduped by the naive hash. Phase 2 ships with the simple dedup and monitors for false positives; a more sophisticated fuzzy-match can be added if needed.
- **Source 3 (school events) is the hardest and least complete.** School career center scrapers work for public pages but not for anything behind SSO (Bryant's Handshake integration is invisible to the scraper). This means some on-campus events will still be missed, which is a real gap. Mitigated by the crowdsourced submission flow — users can paste in any event from any source and InternshipMatch parses it.

### The multi-school growth path

Phase 2 launches for Bryant only. When InternshipMatch expands to a second school (Babson is the obvious next target given proximity and overlap with finance recruiting), the engineering work is:

1. Add Babson to the schools registry
2. Write a Babson Career Center scraper adapter (Source 3)
3. Seed Babson alumni in the alumni table
4. Verify the firm event scrapers (Source 2) already cover the firms Babson students target — they will, because it's the same firm list

Source 1 (SerpAPI) and Source 2 (firm events) are school-agnostic. Only Source 3 requires per-school work, which scales linearly. A realistic cadence is one new school per month once the template is established.

---

## What Phase 2 depends on

Phase 2 is proposed, not accepted yet, because it depends on Phase 1 validation. Specifically, Phase 2 is worth building only if **all** of the following are true after Phase 1 has been live for one week:

1. The events page has been used at least five times by Owen in real recruiting workflows (not just testing).
2. Phase 1 surfaced at least one event Owen actually attended or seriously considered attending.
3. Phase 1 surfaced at least one event from a user-initiated search that would not have been found through any other tool Owen was already using (Adventis, Bryant Career Center, email lists).
4. The data quality issues with SerpAPI are clearly "noise problem" not "wrong tool for the job." Meaning: there's useful signal buried in the results, the ranking layer just needs to be smarter. Not: SerpAPI doesn't return anything recruiting-relevant at all.

If any of those conditions fail, the Phase 2 design changes. The most likely alternative path is "skip SerpAPI entirely, lead Phase 2 with firm event scrapers (Source 2) only, add Source 3 second, and leave general aggregator search as a Phase 3 maybe." That's a different architecture and would get its own ADR.

---

## Alternatives Considered

**Build all three sources in Phase 1.** Rejected because it's a multi-day build against unproven assumptions. See ADR 0008's rationale for shipping minimal first.

**Use Claude web_search directly instead of SerpAPI for Source 1.** Rejected because web_search per-user-query is slow (10-20 seconds) and expensive ($0.10+ per search). SerpAPI is the right tool for structured bulk discovery; Claude is the right tool for language tasks like the pre-event briefing.

**Skip Source 1 entirely and only do firm + school scrapers.** Considered. The argument is that generic aggregator data is noisy and firm events are where the value is. The counter-argument is that industry conferences and CFA Society events are genuinely useful and don't live in firm career pages or school portals — they need SerpAPI (or similar) to surface. The three-source blend covers all three categories; skipping one leaves a gap.

**Partner with a paid event aggregator (Eventtia, Bizzabo).** Rejected on cost. These are enterprise products priced for event organizers, not candidates. No path to reasonable pricing for InternshipMatch's use case.

**Crowdsourced submission only, no scraping.** Rejected as insufficient for launch. A crowdsourced-only model has a cold-start problem (no events → no users → no submissions → no events). Scraping gives the feature a baseline dataset that makes it useful on day one.

**Mobile app with geofencing + passive event discovery.** Considered as a Phase 3 idea. Rejected for Phase 2 because it's significant additional platform work (React Native, background location permissions, app store submissions) and adds a dependency on the user having the app installed. Stay web-first until the core feature is validated.

---

## Implementation Plan (if approved after Phase 1 validation)

**Week 1: Source 2 — Firm event scrapers**

- Add `events` table to Supabase schema
- Identify the top 25 firms whose career pages have scrapable student events sections
- Write 25 firm event adapters following the pattern from `backend/scrapers/adapters/`
- Extend `run_nightly.py` to call the event adapters in parallel with the posting adapters
- Write the deduplication logic against Source 1 data already in the cache

**Week 2: Source 3 — Bryant-specific scrapers**

- Write the Bryant Career Center scraper adapter
- Write the crowdsourced submission endpoint and parsing pipeline
- Write the Claude prompt for user-submitted event parsing
- Add content moderation rules (spam filter, length limits, rate limits per user)

**Week 3: Scoring and UI**

- Port the scoring model from `fit_scorer.py` to a new `event_scorer.py` with the six-factor weights
- Write the Claude qualitative pass prompt for events
- Build the full `/events` page UI with filter strip, ranked feed, and event cards
- Add calendar (.ics) generation
- Add "mark as attending" flow

**Week 4: Briefing generator and integration**

- Write `prompts.py` entries for pre-event briefing generation
- Build the briefing page UI
- Wire up the post-event contacts flow
- Connect to the Networking Radar alumni tracker
- End-to-end test of the attend → briefing → post-event contacts loop with a real event

---

## References

- `docs/adr/0008-networking-events-phase1.md` — the Phase 1 minimal build this ADR supersedes
- `docs/adr/0002-firm-database-scraping.md` — the scraper pattern being reused
- `docs/adr/0003-hybrid-fit-scoring.md` — the scoring pattern being reused
- `backend/scrapers/adapters/` — where the new firm event adapters will live
- `backend/app/event_scorer.py` — the new scoring module (Phase 2)
- `backend/app/briefing_generator.py` — the pre-event briefing module (Phase 2)
- `frontend/app/events/page.tsx` — the events feed page
- `frontend/app/events/[id]/briefing/page.tsx` — the pre-event briefing page
