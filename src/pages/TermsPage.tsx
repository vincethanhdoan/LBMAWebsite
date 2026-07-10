// src/pages/TermsPage.tsx
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-foreground px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span
              className="text-primary-foreground text-xs font-bold leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LB
            </span>
          </div>
          <div>
            <p
              className="text-sm font-semibold text-primary-foreground leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LBMAA Family Portal
            </p>
            <p className="text-[11px] text-primary-foreground/40 leading-tight">
              Los Banos Martial Arts Academy
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Terms of Use
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Los Banos Martial Arts Academy — Last updated May 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              1. Acceptance
            </h2>
            <p className="text-muted-foreground">
              By accessing or using the LBMAA Family Portal, you agree to these Terms of Use.
              If you do not agree, do not use the portal.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              2. Eligibility
            </h2>
            <p className="text-muted-foreground">
              Access is by invitation only. Accounts are issued exclusively to authorized LBMAA
              families. You may not use an account that was not issued to you.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              3. Account responsibility
            </h2>
            <p className="text-muted-foreground">
              You are responsible for keeping your login credentials secure. Do not share your
              account with others.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              4. Acceptable use
            </h2>
            <p className="text-muted-foreground">
              The portal is provided for family-school communication related to LBMAA enrollment.
              You may not use it to harass others, attempt unauthorized access, or for any purpose
              outside its intended scope.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              5. Content you submit
            </h2>
            <p className="text-muted-foreground">
              You are responsible for the accuracy of information and messages you submit through
              the portal.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              6. Service availability
            </h2>
            <p className="text-muted-foreground">
              We do not guarantee uninterrupted or error-free access to the portal. We may modify
              or discontinue the service at any time without notice.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              7. Limitation of liability
            </h2>
            <p className="text-muted-foreground">
              The portal is provided "as is." Los Banos Martial Arts Academy is not liable for
              data loss, service interruptions, or any indirect or consequential damages arising
              from your use of the website.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              8. Governing law
            </h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the State of California.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              9. Changes to terms
            </h2>
            <p className="text-muted-foreground">
              We may update these terms at any time. Changes will be communicated by email.
            </p>
          </section>

          <section>
            <h2
              className="text-base font-semibold mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              10. Contact
            </h2>
            <p className="text-muted-foreground">
              Los Banos Martial Arts Academy
              <br />
              <a
                href="mailto:westcoastlosbanos@gmail.com"
                className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
              >
                westcoastlosbanos@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
