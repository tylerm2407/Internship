import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy -- InternshipMatch",
  description: "How InternshipMatch collects, processes, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <Link href="/terms" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
            Terms of Service
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink-secondary mb-10">Last updated: April 23, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-ink-primary">
          <section>
            <h2 className="font-serif text-xl mb-3">1. Who We Are</h2>
            <p className="leading-relaxed">
              InternshipMatch is an AI-powered recruiting platform for undergraduate business students targeting finance internships. This policy describes how we collect, use, store, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">2. Data We Collect</h2>
            <p className="leading-relaxed mb-3">We collect only data necessary to provide career preparation services:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><span className="font-medium">Account information:</span> Email address and password (hashed with bcrypt)</li>
              <li><span className="font-medium">Profile data:</span> Name, university, major, GPA, class year, coursework, skills, work experience, clubs, certifications, and languages</li>
              <li><span className="font-medium">Resume PDF:</span> Uploaded by you for AI parsing; stored in encrypted cloud storage</li>
              <li><span className="font-medium">Application records:</span> Firms applied to, status, notes, and deadlines you enter</li>
              <li><span className="font-medium">Prep session data:</span> Practice answers and AI-generated feedback</li>
              <li><span className="font-medium">System-generated data:</span> Fit scores, timeline events, notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">3. Data We Do Not Collect</h2>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li>Social Security numbers</li>
              <li>Financial aid information</li>
              <li>Disciplinary or health records</li>
              <li>Location tracking or device fingerprinting</li>
              <li>Third-party analytics cookies (no Google Analytics, no Facebook Pixel)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">4. How We Use Your Data</h2>
            <p className="leading-relaxed mb-3">Your data is used exclusively to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li>Parse your resume and build your career profile</li>
              <li>Score your fit against finance internship opportunities</li>
              <li>Generate personalized recruiting timelines</li>
              <li>Track your application status and deadlines</li>
              <li>Surface alumni networking opportunities</li>
              <li>Provide AI-powered interview preparation</li>
            </ul>
            <p className="leading-relaxed mt-3">
              Your data is <span className="font-medium">never sold</span>, <span className="font-medium">never shared with employers</span>, <span className="font-medium">never used for advertising</span>, and <span className="font-medium">never used to train AI models</span>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">5. AI Processing (Anthropic Claude)</h2>
            <p className="leading-relaxed mb-3">
              InternshipMatch uses Anthropic&apos;s Claude API for resume parsing, fit scoring, outreach drafting, and interview prep evaluation. When these features are used, relevant profile data is sent to Anthropic for processing.
            </p>
            <p className="leading-relaxed">
              Per Anthropic&apos;s API Terms of Service: API inputs and outputs are <span className="font-medium">not used to train</span> Anthropic&apos;s models. API data is retained for up to 30 days for trust and safety review, then automatically deleted. Anthropic holds SOC 2 Type II certification.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">6. Data Storage and Security</h2>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li>All data is stored in the United States (AWS us-east-1)</li>
              <li>All connections use TLS 1.2 or higher</li>
              <li>Data at rest is encrypted with AES-256 via AWS KMS</li>
              <li>Row-Level Security ensures you can only access your own data</li>
              <li>Passwords are hashed with bcrypt and never stored in plaintext</li>
              <li>Resume PDFs are stored in encrypted cloud storage, separate from the database</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">7. Data Retention</h2>
            <p className="leading-relaxed">
              Your data is retained for the lifetime of your account plus 30 days after deletion. Application logs are retained for 90 days. Database backups are retained for 30 days with automatic rotation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">8. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><span className="font-medium">Access:</span> View all your data through the application at any time</li>
              <li><span className="font-medium">Export:</span> Download your complete profile, scores, and records in JSON format</li>
              <li><span className="font-medium">Correction:</span> Edit any profile field through the settings page</li>
              <li><span className="font-medium">Deletion:</span> Delete your account and all associated data at any time; deletion completes within 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">9. Subprocessors</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-surface-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-hover">
                    <th className="text-left px-4 py-2 font-medium">Provider</th>
                    <th className="text-left px-4 py-2 font-medium">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  <tr><td className="px-4 py-2">Supabase</td><td className="px-4 py-2">Database, auth, file storage</td><td className="px-4 py-2">US</td></tr>
                  <tr><td className="px-4 py-2">Anthropic</td><td className="px-4 py-2">AI resume parsing, scoring, prep</td><td className="px-4 py-2">US</td></tr>
                  <tr><td className="px-4 py-2">Railway</td><td className="px-4 py-2">Backend API hosting</td><td className="px-4 py-2">US</td></tr>
                  <tr><td className="px-4 py-2">Vercel</td><td className="px-4 py-2">Frontend hosting and CDN</td><td className="px-4 py-2">US</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-ink-secondary mt-2">
              All subprocessors hold SOC 2 Type II certification. We will notify institutional partners at least 30 days before adding any new subprocessor that handles student data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">10. FERPA</h2>
            <p className="leading-relaxed">
              When deployed by an educational institution, InternshipMatch operates as a school official under the FERPA school official exception (34 CFR 99.31(a)(1)). We use student data only for authorized career preparation purposes, do not re-disclose data to third parties, and operate under the institution&apos;s direct control. See our full FERPA alignment documentation for details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">11. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We will notify you of material changes to this policy via email or in-app notification at least 30 days before the changes take effect.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">12. Contact</h2>
            <p className="leading-relaxed">
              For privacy questions, data requests, or concerns:
            </p>
            <p className="font-mono text-sm mt-2">security@internshipmatch.app</p>
            <p className="text-sm text-ink-secondary mt-1">Response time: 2 business days</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-surface-border py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-ink-tertiary">
          <p>&copy; {new Date().getFullYear()} InternshipMatch. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-secondary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
