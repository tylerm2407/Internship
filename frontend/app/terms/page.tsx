import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service -- InternshipMatch",
  description: "Terms governing your use of the InternshipMatch platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-medium text-accent">
            InternshipMatch
          </Link>
          <Link href="/privacy" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-ink-secondary mb-10">Last updated: April 23, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-ink-primary">
          <section>
            <h2 className="font-serif text-xl mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By creating an account or using InternshipMatch, you agree to these Terms of Service and our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. If you are using InternshipMatch through an institutional deployment, your institution&apos;s agreement with us may supplement these terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">2. Eligibility</h2>
            <p className="leading-relaxed">
              InternshipMatch is available to students at partner educational institutions. You must use a valid institutional email address (.edu) to create an account. You must be at least 18 years old or the age of majority in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">3. Your Account</h2>
            <p className="leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate, current, and complete information during registration and to update your information as needed.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">4. Permitted Use</h2>
            <p className="leading-relaxed mb-3">InternshipMatch is provided for personal career preparation purposes. You agree to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li>Use the platform only for your own career preparation and job search activities</li>
              <li>Provide accurate information in your profile and resume</li>
              <li>Not share your account credentials with others</li>
              <li>Not attempt to access another user&apos;s data</li>
              <li>Not use automated tools to scrape, crawl, or extract data from the platform</li>
              <li>Not reverse engineer, decompile, or attempt to extract the source code of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">5. AI-Generated Content</h2>
            <p className="leading-relaxed">
              InternshipMatch uses AI to parse resumes, generate fit scores, draft outreach messages, and evaluate interview answers. AI-generated content is provided as a tool to assist your decision-making, not as professional career advice. Fit scores are estimates based on available data and should not be the sole basis for your application decisions. You are responsible for reviewing all AI-parsed profile data for accuracy before saving.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">6. Your Data</h2>
            <p className="leading-relaxed">
              You retain ownership of all data you provide to InternshipMatch, including your resume, profile information, and application records. We process your data only to provide the services described in our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. You may export or delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">7. Intellectual Property</h2>
            <p className="leading-relaxed">
              The InternshipMatch platform, including its design, code, algorithms, and documentation, is the intellectual property of InternshipMatch. The firm database, posting data, and alumni information are compiled for your use on the platform and may not be extracted, copied, or redistributed.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">8. Third-Party Links</h2>
            <p className="leading-relaxed">
              InternshipMatch links to external career pages and application portals operated by third-party firms. We are not responsible for the content, privacy practices, or availability of these external sites. Your use of external application portals is governed by those sites&apos; own terms and policies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">9. Service Availability</h2>
            <p className="leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access. The platform may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control. We will make reasonable efforts to provide advance notice of planned downtime.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">10. Limitation of Liability</h2>
            <p className="leading-relaxed">
              InternshipMatch is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that using InternshipMatch will result in interviews, offers, or employment. Our liability for any claim arising from your use of the platform is limited to the amount you paid for the service in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">11. Termination</h2>
            <p className="leading-relaxed">
              You may close your account at any time by using the account settings page or contacting us. We may suspend or terminate your account if you violate these terms. Upon termination, your data will be handled according to our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> (deletion within 30 days).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">12. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use of InternshipMatch after changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">13. Governing Law</h2>
            <p className="leading-relaxed">
              These terms are governed by the laws of the State of Rhode Island, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">14. Contact</h2>
            <p className="leading-relaxed">
              Questions about these terms should be directed to:
            </p>
            <p className="font-mono text-sm mt-2">security@internshipmatch.app</p>
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
