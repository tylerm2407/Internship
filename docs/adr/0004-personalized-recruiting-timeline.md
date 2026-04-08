# ADR 0004 — Personalized Recruiting Timeline

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Personalized Recruiting Timeline
**Deciders:** Owen Ash

---

## Context

Finance recruiting runs on a calendar that is brutal, unwritten, and class-year-dependent. For a sophomore targeting a junior summer IB internship, the real timeline looks something like this: diversity programs open in June-August before sophomore year, sophomore summer programs open in August-October, junior summer applications start appearing in August of sophomore year and accelerate in December-January, Superdays run February-April, and offers go out by April-May — a full fifteen months before the internship actually starts.

Most students don't know any of this. They hear "you should start recruiting early" and have no idea what that means in practice. They miss the August window for Goldman's early insights program because they were still at their summer job. They start applying in March thinking they're ahead, when the good roles closed in January. They spend November networking when they should be grinding technicals, and spend January grinding technicals when they should be actively applying.

The information exists. Adventis publishes timeline guides. RecruitU has class-year-specific calendars. WSO forums are full of "what should I be doing in month X" threads. The problem is that none of it is personalized. A generic finance timeline tells you "diversity programs open in summer" but doesn't tell you *this week, open your laptop and apply to these three specific programs before Friday*. That specificity is the missing layer.

InternshipMatch has everything it needs to provide that layer. It knows the user's class year, graduation year, target roles, and profile. It knows the 200 firms and their historical posting patterns. It can compute a personalized calendar showing exactly what the user should be doing, when, for which firms.

---

## Decision

InternshipMatch generates a personalized recruiting timeline for every user based on four inputs: class year, graduation year, target roles, and current date. The timeline is computed server-side and rendered as a calendar view at `/timeline` with week-by-week recommendations.

### The timeline model

The timeline is not a free-form calendar. It's a structured set of `TimelinePhase` objects, each covering a discrete chunk of the recruiting cycle with specific recommended actions.

```python
class TimelineAction(BaseModel):
    id: str
    title: str                           # "Apply to diversity programs"
    description: str                     # 1-2 sentences of context
    category: Literal["apply", "network", "prep", "research", "submit"]
    priority: Literal["critical", "high", "medium", "low"]
    estimated_effort_minutes: int
    related_firm_ids: list[UUID]         # firms this action applies to
    related_posting_ids: list[UUID]      # specific live postings if applicable
    deadline: datetime | None

class TimelinePhase(BaseModel):
    id: str
    title: str                           # "Sophomore Summer — Early Insights Window"
    start_date: date
    end_date: date
    phase_type: Literal["insights", "sophomore_summer", "junior_summer_early", "junior_summer_main", "interview_prep", "superday", "decision"]
    summary: str                         # what this phase is about
    actions: list[TimelineAction]
    is_current: bool                     # highlights the "you are here" phase
```

### Generation logic

The timeline builder at `backend/app/timeline_builder.py` takes the user's profile and generates phases based on their class year and graduation year:

1. **Determine the recruiting cycle.** For a sophomore (class year 2028) targeting Summer 2028 junior internships, the cycle runs from June 2026 (early diversity apps) through May 2027 (offer decisions).

2. **Build the phase skeleton.** The phase structure is the same for every finance student — what changes is the specific firms, postings, and deadlines within each phase. For an IB-targeting sophomore:
   - *June-August:* Early diversity insight programs
   - *August-November:* Sophomore summer program applications
   - *August-December:* Junior summer program "first wave" (early posters like Insight Partners, Centerview)
   - *December-February:* Junior summer program "main wave" (bulge brackets, most elite boutiques)
   - *January-March:* First-round interviews
   - *February-April:* Superdays
   - *March-May:* Offer decisions

3. **Populate actions per phase** by querying the `postings` table for relevant openings and generating action items. For the "Junior summer main wave" phase targeting IB: pull every posting where role_type matches the user's targets and posted_at falls within the phase window. Generate one `apply` action per posting with the deadline and estimated effort.

4. **Add non-application actions.** Networking, technical prep, resume updates, mock interviews. These come from a hand-curated "baseline actions" template keyed by phase type. For example, the "Junior summer main wave" phase always includes "Complete 20+ technical practice questions" and "Reach out to 5 alumni this month" regardless of which specific firms the user is targeting.

5. **Compute `is_current`.** Based on today's date, mark exactly one phase as the current phase. The `/timeline` page opens with that phase expanded by default.

6. **Compute the "this week" summary** — a Claude-generated paragraph that reads the user's current phase, their recent application activity, and any upcoming deadlines, and produces a 3-sentence "here's what you should actually do this week" recommendation. This is the most valuable single feature on the timeline page.

### Storage and caching

Timelines are computed on demand and cached in the `timelines` table for 24 hours. Regeneration happens when: the user updates their profile, a new posting matches the user's targets, or the TTL expires. The user can force a regeneration by clicking "Refresh timeline" — useful after updating their profile or hitting a major milestone.

---

## Consequences

### Positive

- **Turns generic advice into specific action.** Instead of "you should network this semester," the timeline says "Message Sarah Chen at William Blair this week about her middle-market experience — here's a pre-drafted message." That specificity is what converts passive users into active ones.
- **Class-year aware.** A freshman sees a totally different timeline than a junior. Freshmen get "explore finance, join Bryant Finance Society, learn Excel"; juniors get "your applications close in six weeks, prep four hours a day". The same generic calendar would be useless for both.
- **Grounded in real posting data.** Every "apply" action in the timeline links to a live posting in the `postings` table. When Goldman closes their summer analyst application, the timeline action disappears. When Jefferies opens a new one, it appears. The timeline is never stale.
- **The "this week" summary is the daily use case.** Users don't want to scan a twelve-month calendar every day. They want to open the app, see what they should do today, and close the app. The Claude-generated weekly summary is optimized for that loop.
- **Phase model makes the calendar legible.** Dividing the year into named phases (Early Insights, Junior Summer Main Wave, Superdays) gives users a mental model of where they are in the process. Most generic calendars don't do this and users get lost.

### Negative

- **Timeline accuracy depends on historical data.** The phase date boundaries ("Junior summer main wave starts in December") are based on historical patterns. When firms shift their timelines (and they do, every year), the generated timeline is wrong until I update the phase templates manually. Mitigated by reviewing phase dates against Adventis's published timeline reports each quarter.
- **Not every student follows the IB timeline.** A quant-focused student has a different calendar than an IB student. Asset management students have yet another. The phase templates are keyed by target_role, which handles the common cases, but edge cases (private wealth, equity research, ESG investing) will have less accurate timelines until I build templates for them.
- **The weekly summary can hallucinate.** Claude can invent action items that don't exist or reference firms the user isn't targeting. Mitigated by constraining the prompt to only reference data from the user's actual profile, current phase, and active postings. Also by showing the structured actions below the summary, so users see the ground truth even if the narrative is slightly off.
- **Phase boundaries are sharp, but recruiting is continuous.** A student viewing the timeline on the last day of the "Main Wave" phase will see different recommendations than on the first day of "Interviews" — even though their actual situation is nearly identical. Mitigated by letting phases overlap by a week on either side and showing actions from both adjacent phases during the overlap window.

### Why this is bigger than it looks

Every other tool in the finance recruiting space treats the timeline as static content. Adventis publishes an article. RecruitU has a blog post. WSO has a sticky thread. None of them personalize, and none of them update when new postings appear. InternshipMatch's timeline is a live artifact that reflects the user's specific situation and the current state of the 200-firm posting database. That combination — personalized AND live — is the real feature. A static timeline is information; a live personalized timeline is an assistant.

---

## Alternatives Considered

**Static blog-post-style timeline.** Rejected because it ignores the user's profile and doesn't update with new postings. This is what competitors already do; copying it would provide no differentiation.

**LLM-generated timeline from scratch on every load.** Rejected because it's non-deterministic and expensive. Two different users with identical profiles should see identical timelines, and two dashboard loads by the same user an hour apart should show the same timeline. Deterministic generation with a cached LLM summary layer gives both.

**Gantt-chart style visualization.** Considered. Rejected because Gantt charts are hard to read on mobile and overkill for the information density. A phase-based vertical calendar with a "this week" highlight is simpler and more actionable.

**Google Calendar integration.** Considered and deferred to Phase 2. The right version is: user connects their Google Calendar, InternshipMatch pushes application deadlines as calendar events with reminders. Good idea, meaningful engineering work, not critical for launch.

**Email digest instead of in-app timeline.** Considered as a complement, not a replacement. Phase 2 adds a weekly email summarizing the "this week" recommendation plus any new high-fit postings. The in-app timeline remains the source of truth; the email is a prompt to come back.

---

## References

- `backend/app/timeline_builder.py` — the timeline generation logic
- `backend/app/prompts.py` — the `WEEKLY_SUMMARY_PROMPT` constant
- `backend/app/models.py` — `TimelinePhase` and `TimelineAction` models
- `frontend/app/timeline/page.tsx` — the calendar UI
- `docs/adr/0003-hybrid-fit-scoring.md` — the fit scoring system that feeds "apply" actions in the timeline
