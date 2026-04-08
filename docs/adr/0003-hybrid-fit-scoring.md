# ADR 0003 — Hybrid Deterministic + LLM Fit Scoring

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Hybrid Fit Scoring
**Deciders:** Owen Ash

---

## Context

Fit scoring is the single most important feature in InternshipMatch. It's the answer to the user's core question: "out of these 200 firms, where do I actually have a chance?" Every downstream feature depends on the scores being trustworthy. If users don't trust the scores, they don't trust the product, and InternshipMatch becomes yet another job board people scroll past.

The naive approach is to throw the whole thing at Claude. Load the user's resume, load the job posting, ask Claude to return a fit score from 0 to 100. This is tempting because it's simple to implement and Claude is genuinely good at this kind of fuzzy judgment. It's also the wrong answer for three reasons.

First, **cost**. Running Claude against 200 firms for every user on every dashboard load would be expensive and slow. At ~2 seconds per call, a full-dashboard scoring pass would take 6-7 minutes and cost ~$4 per load. Unsustainable.

Second, **consistency**. LLM outputs have inherent variance. A user who loads the dashboard twice in a row might see two different scores for the same firm, which destroys trust instantly.

Third, **explainability**. "Claude gave this a 73" is not a useful answer when the user wants to know *why*. Users need to see the reasoning — what matched, what didn't, what the gaps are.

At the same time, a pure deterministic keyword-match approach has its own problems. Keyword matching is dumb. It can't distinguish between "I worked on a DCF valuation for a live transaction" and "I took a class where we briefly discussed DCF," even though one is an IB-quality bullet and the other isn't. It can't understand that a 3.5 GPA is fine at a middle-market firm but a non-starter at Goldman TMT. It produces numbers that look precise but mean nothing.

The right approach uses both techniques where each shines.

---

## Decision

InternshipMatch computes fit scores in two phases. The deterministic phase handles everything that can be scored mechanically — GPA cutoffs, class year eligibility, geographic fit, coursework progression. The LLM phase handles nuanced judgment calls on the top matches — whether a student's experience bullets actually demonstrate relevant skills, whether a reach application is worth the time given timeline constraints, whether the student has the right narrative fit for the firm's culture.

### Phase 1: Deterministic base score (0-100) for all firms

Python computes a base score for every (user, posting) pair using a six-factor weighted model:

1. **GPA fit (weight: 25)** — compared against the firm's `gpa_floor_estimated` field. Above floor: full points. At floor: 80%. Below by <0.3: partial credit scaled to distance. Below by 0.3+: heavy penalty.
2. **Class year eligibility (weight: 20)** — does the posting target the user's current class year? This is actually a hard filter rather than a score modifier: if the class year doesn't match, the posting is excluded from the results entirely.
3. **Role match (weight: 20)** — does the posting's `role_type` appear in the user's `target_roles`? Exact match: full points. Adjacent match (S&T when user wants IB): 50%. No match: 0.
4. **Coursework progression (weight: 15)** — has the user completed or is currently taking the foundational coursework typically expected for this role at this firm's tier?
5. **Geographic fit (weight: 10)** — is the posting in the user's target geographies? Includes proximity scoring so Boston and NYC get partial credit for a user targeting the Northeast.
6. **Experience relevance (weight: 10)** — keyword overlap between the posting's `requirements` bullets and the user's `prior_experience` bullets, with weighted terms (domain-specific keywords like "DCF", "LBO", "M&A" worth more than generic words).

This runs in milliseconds against all 200 firms. Output: a base score from 0-100 for every posting.

### Phase 2: Claude qualitative pass for the top 30

Python sorts all the base scores descending and takes the top 30. For each of those 30, Claude is called with a prompt like:

> Given this student profile: {full StudentProfile JSON}
> And this job posting: {full Posting JSON}
> The deterministic base score is {base_score}/100.
>
> Review this match carefully. Consider:
> - Does the student's prior experience demonstrate the specific skills this role requires, beyond keyword overlap?
> - Is the student's narrative (coursework progression, clubs, certifications) coherent with this role?
> - Is this application worth the student's time given the competitive landscape?
>
> Adjust the base score by up to ±15 points. Return: the final score, a tier (strong_match/reach/long_shot/not_recommended), a 2-3 sentence rationale, 2-3 specific strengths, and 2-3 specific gaps.

Claude's adjustment is added to the base score, clamped to 0-100, and persisted to the `fit_scores` table with a 24-hour TTL.

### The tier mapping

- **85-100: strong_match** — apply with confidence, prepare thoroughly
- **70-84: reach** — worth applying but not your top priority
- **55-69: long_shot** — apply if you have time, don't waste prep cycles here
- **0-54: not_recommended** — the honest warning that this isn't worth the effort

---

## Consequences

### Positive

- **Fast.** Scoring 200 firms takes ~200 milliseconds for the deterministic pass plus ~30 parallel Claude calls for the qualitative pass, or about 5 seconds end-to-end for a first-time dashboard load. Subsequent loads read from cache and return instantly.
- **Consistent.** Same profile + same posting + same base score always produces the same result because the deterministic phase is deterministic and the Claude phase is cached. Users see stable scores across sessions.
- **Explainable.** Every score comes with strengths, gaps, and a rationale. Users understand why they scored where they did, which is the foundation of trust.
- **Cost-bounded.** Only 30 Claude calls per dashboard load means each refresh costs roughly $0.60. Cached for 24 hours, the amortized per-user cost is manageable even at scale.
- **Honest.** A 54 is a 54. No inflation to make users feel better. The scoring model is calibrated to match reality and users can tell.
- **Uses each tool where it shines.** Deterministic code handles the mechanical parts (GPA cutoffs, class year) that must be right. Claude handles the nuance (experience relevance, narrative coherence) that mechanical rules can't capture.

### Negative

- **The six-factor weights are opinions.** I picked them based on my own understanding of finance recruiting. They might be wrong. Mitigated by calibrating against a test set of known outcomes (students I know who did and didn't get interviews at specific firms) and tuning weights accordingly.
- **Claude can disagree with the deterministic pass in confusing ways.** Sometimes Claude wants to adjust a score by more than ±15 and the clamp prevents it. The user doesn't see the clamping happen, which means the rationale might imply a different score than the final number. Mitigated by instructing Claude to only justify adjustments within the allowed range.
- **The prep corpus doesn't feed back into scoring.** If a user does great on a prep session, that signal is not used to boost their score on related firms. Intentional scoping decision — the scoring model only uses profile data, not behavioral data — but worth revisiting.
- **Only the top 30 get qualitative scoring.** A user whose base score is 31st on a firm never sees the Claude-adjusted view, even if that firm would be a sleeper hit. Mitigated by letting users manually trigger a Claude pass on any firm they're curious about (one-off button on the firm detail page).

### The honest warning

The most controversial design choice in the fit scorer is showing users low scores honestly. Most competing tools inflate their numbers — Jobscan's "match rate" rarely shows below 50 because that would make users feel bad. InternshipMatch will tell a student "you scored 47 on Goldman Sachs TMT" and explain exactly why. This is a risk — some users will bounce from the product because they don't like what the scores say.

But the alternative is worse. A product that lies to users about their chances is a product that wastes their time. Finance recruiting is a high-stakes, time-limited process — users need accurate information to make good decisions about where to focus their energy. The honest scoring is the core differentiator and it has to stay honest even when it hurts.

---

## Alternatives Considered

**Pure LLM scoring.** Rejected for the cost, consistency, and latency reasons described above. LLMs are great at judgment but bad at being fast and consistent across 200 items.

**Pure keyword matching.** Rejected because it misses context. A keyword scorer can't tell the difference between a student who worked on real deals and one who took a class that mentioned deals.

**Embeddings-based similarity scoring.** Considered — compute a vector embedding of the resume and each posting, score fit by cosine similarity. Rejected because embeddings capture surface-level similarity but miss the structured requirements (GPA cutoffs, class year, specific coursework) that matter most in finance recruiting. A Goldman TMT job and a McKinsey consulting job would score similarly under cosine similarity because they use similar language, but they require totally different profiles.

**User self-rating instead of computed scoring.** Rejected because users are bad at assessing their own fit. Every finance student thinks they have a shot at Goldman and nobody thinks they have a shot at a no-name middle-market firm. The computed scoring corrects both biases.

**External resume scoring APIs (Jobscan, Teal).** Rejected because they're not finance-specific. Using a general-purpose scoring API and then adding finance context on top would be more complex and less accurate than building the scorer in-house with finance domain knowledge baked in.

---

## References

- `backend/app/fit_scorer.py` — the implementation
- `backend/app/prompts.py` — the `FIT_SCORE_QUALITATIVE_PROMPT` constant
- `backend/app/models.py` — the `FitScore` Pydantic model
- `backend/tests/test_fit_scorer.py` — unit tests against known profile/posting pairs
