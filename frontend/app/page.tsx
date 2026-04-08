import Link from "next/link";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { SecondaryButton } from "../components/SecondaryButton";
import { EyebrowLabel } from "../components/EyebrowLabel";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload your resume",
    description:
      "Drop a PDF. Our AI reads it in seconds and extracts your GPA, coursework, experience, and target roles.",
  },
  {
    step: "02",
    title: "Get ranked matches",
    description:
      "A six-factor scoring engine compares your profile against every open posting at 200+ finance firms.",
  },
  {
    step: "03",
    title: "See your fit scores",
    description:
      "Each opportunity gets a 0-100 score with a plain-English rationale explaining exactly why it fits or doesn't.",
  },
  {
    step: "04",
    title: "Apply with confidence",
    description:
      "Deadlines, networking contacts, and interview prep — everything you need, organized by priority.",
  },
];

const COMPARISON = [
  { label: "Personalized fit scores", sheet: false, match: true },
  { label: "Auto-parsed resume data", sheet: false, match: true },
  { label: "Live posting updates", sheet: false, match: true },
  { label: "Deadline tracking", sheet: true, match: true },
  { label: "Networking recommendations", sheet: false, match: true },
  { label: "Interview prep by firm", sheet: false, match: true },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </span>

          <nav className="hidden md:flex items-center gap-8 text-sm text-ink-secondary">
            <a
              href="#how-it-works"
              className="hover:text-ink-primary transition-colors"
            >
              How it works
            </a>
            <a
              href="#compare"
              className="hover:text-ink-primary transition-colors"
            >
              Compare
            </a>
          </nav>

          <Link href="/upload">
            <PrimaryButton className="text-xs px-4 py-2">
              Get started
            </PrimaryButton>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left — copy */}
          <div className="lg:col-span-7 space-y-6">
            <EyebrowLabel>AI recruiting agent for finance students</EyebrowLabel>

            <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] tracking-tight">
              Break into finance
              <br />
              without the spreadsheet.
            </h1>

            <p className="text-lg text-ink-secondary max-w-xl leading-relaxed">
              Upload your resume. Get a ranked list of every open internship at
              200 finance firms — scored, explained, and sorted by how well you
              fit.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link href="/upload">
                <PrimaryButton>
                  Upload your resume
                  <span aria-hidden="true" className="ml-1">
                    &rarr;
                  </span>
                </PrimaryButton>
              </Link>
              <SecondaryButton>See a demo</SecondaryButton>
            </div>
          </div>

          {/* Right — mock fit score card */}
          <div className="lg:col-span-5">
            <Card className="space-y-5">
              <div className="flex items-center justify-between">
                <EyebrowLabel>Top match</EyebrowLabel>
                <span className="font-mono text-xs text-ink-tertiary">
                  Updated 2h ago
                </span>
              </div>

              <div>
                <h3 className="font-sans text-lg font-semibold">
                  Goldman Sachs
                </h3>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Investment Banking Division — Summer Analyst 2027
                </p>
              </div>

              {/* Score bar */}
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-3xl font-medium text-accent">
                    73
                  </span>
                  <span className="font-mono text-xs text-ink-secondary">
                    / 100
                  </span>
                </div>
                <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: "73%" }}
                  />
                </div>
              </div>

              {/* Factor breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: "GPA", value: "22/25" },
                  { label: "Class year", value: "18/20" },
                  { label: "Role match", value: "14/20" },
                ].map((factor) => (
                  <div
                    key={factor.label}
                    className="bg-surface-hover rounded-md px-3 py-2 text-center"
                  >
                    <p className="font-mono text-sm font-medium">
                      {factor.value}
                    </p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      {factor.label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-ink-secondary leading-relaxed">
                Strong GPA and relevant coursework offset limited prior IB
                experience. Sophomore timeline aligns with early insight
                programs.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <EyebrowLabel>How it works</EyebrowLabel>
          <h2 className="font-serif text-3xl mt-3 mb-12">
            Four steps. Five minutes.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="space-y-3">
                <span className="font-mono text-sm text-accent font-medium">
                  {item.step}
                </span>
                <h3 className="font-sans text-base font-semibold">
                  {item.title}
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section
        id="compare"
        className="border-t border-surface-border bg-surface"
      >
        <div className="max-w-7xl mx-auto px-6 py-24">
          <EyebrowLabel>Compare</EyebrowLabel>
          <h2 className="font-serif text-3xl mt-3 mb-12">
            Why this beats the Google Sheet.
          </h2>

          <div className="max-w-2xl">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_100px] gap-4 pb-3 border-b border-surface-border">
              <span className="text-sm text-ink-secondary">Feature</span>
              <span className="text-sm text-ink-secondary text-center">
                Spreadsheet
              </span>
              <span className="text-sm text-accent text-center font-medium">
                Match
              </span>
            </div>

            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_100px_100px] gap-4 py-3 border-b border-surface-border last:border-b-0"
              >
                <span className="text-sm">{row.label}</span>
                <span className="text-center text-sm">
                  {row.sheet ? (
                    <span className="text-ink-secondary">Yes</span>
                  ) : (
                    <span className="text-ink-tertiary">No</span>
                  )}
                </span>
                <span className="text-center text-sm font-medium text-accent">
                  Yes
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="font-serif text-lg font-medium text-accent">
                InternshipMatch
              </span>
              <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
                Built for undergraduate finance students recruiting for
                investment banking, sales and trading, private equity, and more.
              </p>
            </div>

            <div>
              <h4 className="font-sans text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-ink-secondary">
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Fit Scoring
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Timeline
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans text-sm font-semibold mb-3">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-ink-secondary">
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Firm database
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Privacy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans text-sm font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-ink-secondary">
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-ink-primary transition-colors"
                  >
                    Feedback
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-ink-tertiary">
              &copy; {new Date().getFullYear()} InternshipMatch. All rights
              reserved.
            </p>
            <p className="text-xs text-ink-tertiary">
              Built by Owen Ash at Bryant University.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
