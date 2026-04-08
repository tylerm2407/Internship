# ADR 0005 — Application Tracker with Status Sync

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Application Tracker with Status Sync
**Deciders:** Owen Ash

---

## Context

Every finance student who takes recruiting seriously ends up building a Google Sheet. Columns for firm, role, date applied, date heard back, interview round, notes, next steps, deadline for response. They keep it updated for two weeks, then stop, then lose track of which firms they've applied to, then apply to the same firm twice by accident, then miss a deadline to respond to an offer because it got buried in Gmail. Every finance student tells themselves they'll be more organized next time. They aren't.

The Google Sheet approach fails for the same reason every spreadsheet-based productivity system fails: the user has to remember to update it. Recruiting happens fast and in parallel — a student might submit five applications on a Sunday, have three screeners the next Thursday, get a Superday invite on Friday, and pick up two networking coffees the week after. The state changes faster than anyone wants to type.

The existing dedicated tools aren't much better. Trackr is essentially a sheet with a nicer UI — you still enter everything manually. WSO Academy has a tracker gated behind a $10,000 course. Simplify has an application tracker but it's generic and doesn't understand finance recruiting stages (what's a "Superday"?). None of them integrate with the source data: the firms, the postings, the user's profile, the timeline.

InternshipMatch is uniquely positioned to solve this because it already knows everything about the user's recruiting state. The firm database is there. The postings are there. The profile is there. Adding an application tracker is not a new dataset — it's a new view on existing data combined with a tiny bit of user-provided state (which postings have you applied to, what stage are you at).

---

## Decision

InternshipMatch includes an application tracker built on a single `applications` table, accessible from the dashboard and from a dedicated `/applications` page. Users log an application with one click from any opportunity card. Status updates happen inline — no separate edit screens, no modals, no forms. Every stage transition is a one-click interaction.

### The application model

```python
class Application(BaseModel):
    id: UUID
    user_id: UUID
    posting_id: UUID                     # links to the Posting row
    status: ApplicationStatus
    applied_at: datetime | None
    status_history: list[StatusChange]   # timestamped log of every transition
    notes: str                           # freeform user notes
    next_action: str | None              # "Follow up if no response by Friday"
    next_action_date: datetime | None
    interviewer_names: list[str]         # for prep and thank-you notes
    fit_score_at_application: int        # snapshot of the score when applied
    created_at: datetime
    updated_at: datetime

class ApplicationStatus(str, Enum):
    planned = "planned"                  # "I want to apply"
    applied = "applied"                  # submitted
    screened = "screened"                # HireVue / behavioral assessment done
    first_round = "first_round"          # first live interview
    second_round = "second_round"
    superday = "superday"                # final round
    offer = "offer"
    accepted = "accepted"
    rejected = "rejected"
    withdrew = "withdrew"                # user pulled out
    ghosted = "ghosted"                  # no response after 4+ weeks
```

### The interaction model

The tracker is built around two principles: **one-click status updates** and **zero duplicate data entry**.

1. **One click to log.** Every opportunity card on the dashboard has a "Mark as applied" button. Clicking it creates an `Application` row with status=applied, applied_at=now, and fit_score_at_application=current_score. No form. No modal. The card updates in place to show the applied state.

2. **Stage transitions via status pills.** On the `/applications` page, each application card shows the current status as a pill. Clicking the pill opens a dropdown of valid next statuses. Selecting one records the transition with a timestamp in `status_history` and updates `updated_at`. Two clicks total.

3. **Smart reminders without user input.** When an application has been in a given status for too long without a transition, the tracker surfaces it. Applied and waiting 3+ weeks? Mark it as likely ghosted unless the user says otherwise. Offer stage and deadline approaching? Pin to the top of the page with a countdown.

4. **Note-taking is optional.** The `notes` field is a single textarea on the application detail page. Users who want to log interviewer names, what questions they were asked, how they felt it went — can. Users who don't — don't. The tracker works either way.

5. **Next-action reminders.** The `next_action` and `next_action_date` fields let users set themselves a simple text reminder ("follow up with recruiter," "send thank you note," "decide by Friday"). These feed into the weekly timeline summary from ADR 0004 so the user sees them on the main dashboard without opening the tracker.

### The duplicate application prevention

A frequent Google Sheet failure mode is applying to the same firm twice. The tracker prevents this structurally: the opportunity cards on the dashboard check the `applications` table and swap the "Mark as applied" button for an "Already applied" badge on any posting the user has logged. A user physically cannot create two `applications` rows pointing at the same `posting_id`.

### The status history log

Every status transition is stored in `status_history` with a timestamp. This enables two things worth the storage cost:

1. **Velocity insights.** "You heard back from William Blair in 4 days. You heard back from Goldman after 18 days. You haven't heard from Jefferies in 32 days." This is the kind of data that tells a user whether to follow up or move on, and no other tracker provides it.

2. **Cycle analytics.** At the end of the recruiting cycle, the user can see exactly how their process worked — how many applications converted to screens, how many screens to first-rounds, where they dropped out. Useful for reflection, and extremely useful if I ever add a "recruiting coach" feature that compares a user's funnel to the Bryant student average.

---

## Consequences

### Positive

- **Zero duplicate entry.** Every field the tracker needs (firm name, role, fit score, deadline) is already in the posting row. The user only enters two things: "I applied" and status transitions. That's 90% less typing than the Google Sheet approach.
- **Impossible to apply twice.** The duplicate prevention is structural, not a UI warning that users ignore.
- **Status transitions are two clicks.** This is the single most important UX decision. Every added step in updating a tracker is a step users skip, and a skipped step means stale data, and stale data means the tracker is useless. Two clicks is fast enough that users actually do it.
- **Integrates with everything else.** The timeline from ADR 0004 pulls from applications to show "you're waiting on 5 firms" and "you have a decision due Friday." The dashboard suppresses opportunities the user has already applied to. The prep coach from Feature 7 knows which firms the user has an upcoming interview with and surfaces the right practice questions. The tracker is not a separate feature — it's the connective tissue between everything else.
- **Snapshot scoring for honest reflection.** Storing `fit_score_at_application` lets users look back at the end of the cycle and see whether their fit-score-to-offer conversion rate matches the product's predictions. If a student with consistent 85+ scores never got past first rounds at middle-market firms, that's important signal for both the student and the scoring model.
- **Status history enables velocity insight.** Knowing that a firm typically responds within 5 days and hearing nothing for 20 is actionable information. Nobody else's tracker surfaces this.

### Negative

- **Users have to self-report every stage transition.** Ideally, InternshipMatch would auto-detect when a user moved from "applied" to "first_round" by reading their email. That's email integration, which is a big engineering project (Gmail OAuth, email parsing, ambiguity handling) and introduces privacy concerns. Phase 1 is manual transitions. Phase 2 might add opt-in email parsing.
- **Ghosting is a real status but socially awkward to show.** Calling a firm "ghosted" is accurate but potentially upsetting. Mitigated by only applying the label after 4+ weeks of silence and showing it neutrally ("no response") rather than judgmentally ("ghosted you").
- **Status model is opinionated about finance recruiting.** The enum (planned/applied/screened/first_round/second_round/superday/offer/accepted/rejected/withdrew/ghosted) reflects IB recruiting specifically. A student recruiting for quant roles might have different stages (e.g., coding assessment before phone screen). The model covers the 80% case and adds role-specific stages as Phase 2 refinement.
- **Notes field is just a textarea.** Power users might want structured fields (interviewer name, question asked, answer given, self-rating). The textarea keeps things simple for launch but will probably grow into something richer if users start using the tracker heavily.
- **No calendar integration means deadlines can be missed.** The `next_action_date` field creates an in-app reminder but doesn't push to the user's actual calendar. Mitigated by the weekly email digest from ADR 0004, which surfaces upcoming deadlines. Full calendar integration is Phase 2.

### The quiet superpower

The application tracker's biggest value isn't visible on the tracker page. It's the fact that every other part of the product becomes smarter when it knows what the user has applied to. The dashboard stops showing postings the user already handled. The timeline recommendations adapt based on current application load. The fit scorer can be recalibrated based on actual outcomes. The networking radar prioritizes alumni at firms where the user has a live application. The prep coach knows which interviews are upcoming. None of this works without the tracker, and the tracker only works if users actually use it — which is why the two-click interaction model is non-negotiable.

---

## Alternatives Considered

**Just embed a Google Sheet via iframe.** Rejected because it doesn't integrate with the rest of the product's data and it puts the user back in manual-entry mode. The whole point of building this in-house is the integration.

**Third-party tracker integration (Huntr, Teal, Notion templates).** Rejected for the same integration reason. InternshipMatch's value is that the tracker knows about the firms, postings, profiles, and timeline. A third-party tracker knows about none of that.

**Email-based tracking (auto-detect applications from sent email).** Considered, deferred to Phase 2. The engineering work for Gmail OAuth + email parsing is substantial and the false positive rate on "is this an application?" is high. Manual two-click logging is simpler and more reliable for launch.

**Kanban board instead of a list.** Considered. A kanban view (columns for each status with cards you drag between them) is visually appealing but harder to navigate on mobile and slower for the common case of a single status update. The status pill dropdown is faster for the most common interaction. A kanban view might make sense as an optional "dashboard view" toggle in Phase 2.

**Separate tables for different application types (insights vs sophomore vs junior).** Rejected because the application lifecycle is nearly identical across types — applied, screened, first round, final, decision. One table with a `posting_id` foreign key is simpler and lets users see their full recruiting history in one place.

**Skip the tracker entirely, rely on the timeline.** Rejected. The timeline shows what the user *should* do; the tracker shows what they've *done*. Both are needed and they serve different mental models. Users will ask "what's next?" (timeline) and "where am I?" (tracker) at different moments.

---

## References

- `backend/app/models.py` — `Application`, `ApplicationStatus`, `StatusChange` models
- `backend/app/main.py` — `POST /api/applications`, `PATCH /api/applications/{id}` routes
- `frontend/app/applications/page.tsx` — the tracker page
- `frontend/components/OpportunityCard.tsx` — where one-click "Mark as applied" lives
- `docs/adr/0004-recruiting-timeline.md` — the timeline that reads from this table
- `infra/supabase/migrations/` — the `applications` table schema
