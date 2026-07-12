import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { SectionHeader } from '../components/SectionHeader';
import { TrustStatsBar } from '../components/TrustStatsBar';
import {
  Shield,
  Users,
  Star,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  Heart,
  Clock,
} from 'lucide-react';

const BASE = '/experimental/public';

const PROGRAMS = [
  {
    icon: Sparkles,
    name: 'Little Dragons',
    ages: 'Ages 4–6',
    description:
      'Fun, movement-based classes where young children learn to listen, follow direction, and move with confidence. Big growth in small bodies.',
  },
  {
    icon: Shield,
    name: 'Junior Warriors',
    ages: 'Ages 7–12',
    description:
      'Structured classes with real belt progression. Students develop focus, self-discipline, and the ability to work hard toward a goal.',
  },
  {
    icon: Zap,
    name: 'Teen Program',
    ages: 'Ages 13–16',
    description:
      'Advanced training, leadership responsibilities, and genuine self-defense skills. A positive peer environment during the years it matters most.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'My son has completely changed since joining. He listens better, focuses in school, and actually looks forward to going to class.',
    name: 'Maria G.',
    detail: 'Parent of a 9-year-old',
  },
  {
    quote:
      'The instructors are patient and genuinely care. My daughter went from shy to confident in just a few months.',
    name: 'James T.',
    detail: 'Parent of a 7-year-old',
  },
  {
    quote:
      'We tried another school first. LBMAA is different — it feels like a real community. Best decision we made for our kids.',
    name: 'Priya S.',
    detail: 'Parent of two students',
  },
];

const WHY_US = [
  {
    icon: Users,
    heading: 'Small classes',
    body: 'Every instructor knows every student by name — not just their face.',
  },
  {
    icon: Shield,
    heading: 'Safe environment',
    body: 'Background-checked instructors. Fully padded facility. Age-appropriate training.',
  },
  {
    icon: Star,
    heading: 'Progress-based belts',
    body: "Students test when they're ready — no pressure, no fixed timeline.",
  },
  {
    icon: Heart,
    heading: 'Month-to-month',
    body: 'No long-term contracts. Families stay because they love it.',
  },
];

const FAQ = [
  {
    q: 'Does my child need any experience?',
    a: "None at all. Every student starts at the beginning. Our instructors work at each child's pace.",
  },
  {
    q: 'What should they wear to the trial class?',
    a: 'Just comfortable athletic clothes. No uniform or equipment needed.',
  },
  {
    q: 'Are there long-term contracts?',
    a: "No. We're month-to-month. We want families here because they love it, not because they're locked in.",
  },
  {
    q: 'How do belt promotions work?',
    a: "Students test when their instructor says they're ready — based on skill, not a fixed schedule.",
  },
  {
    q: 'Is this safe for kids with no martial arts background?',
    a: 'Safety is the first thing we teach. Classes are supervised, training areas are fully padded, and contact is always age-appropriate.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer items-center justify-between gap-4 min-h-[44px] py-3 text-sm font-semibold text-foreground list-none select-none">
        {q}
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="pb-4 text-sm text-muted-foreground leading-relaxed pr-6">
        {a}
      </p>
    </details>
  );
}

export function HomePageV2() {
  const navigate = useNavigate();
  const goToTrial = () => navigate(`${BASE}/contact?intent=trial`);

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[88svh] flex items-center">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1769095211505-fbcbf6530f02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
            alt="Children training martial arts at LBMAA"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
        </div>

        <div className="relative container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-xl">
            <div className="w-10 h-1 bg-primary rounded-full mb-6" />

            <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] text-white mb-5">
              Where Kids Build Confidence, Discipline, and Respect.
            </h1>
            <p className="text-base md:text-lg text-white/85 mb-10 leading-relaxed max-w-md">
              Safe, structured martial arts for children ages 4–16 in Los Banos.
              Family-run. No pressure. First class is free.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-md"
                onClick={goToTrial}
              >
                Book a Free Trial Class
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/60 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm font-medium px-8"
                onClick={() => navigate(`${BASE}/programs`)}
              >
                See Our Programs
              </Button>
            </div>

            <p className="text-white/55 text-sm mt-5">
              No commitment · No uniform needed · We'll guide you
            </p>
          </div>
        </div>
      </section>

      {/* ── TRUST STATS BAR ───────────────────────────────── */}
      <TrustStatsBar />

      {/* ── WHY CHOOSE US ─────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <SectionHeader
            eyebrow="Why parents choose LBMAA"
            heading="More than just martial arts."
            subheading="Every class at LBMAA is built around safety, respect, and real progress. Our instructors know every student's name, remember where they started, and celebrate every step forward."
          />

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl">
            {WHY_US.map(({ icon: Icon, heading, body }) => (
              <div
                key={heading}
                className="bg-slate-50 border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{heading}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ──────────────────────────────────────── */}
      <section id="programs" className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6">
          <SectionHeader
            eyebrow="Programs"
            heading="Find the right class for your child."
            subheading="Every program is age-appropriate and taught by certified instructors who know every student by name."
          />

          <div className="grid gap-5 md:grid-cols-3 max-w-4xl">
            {PROGRAMS.map((program) => {
              const Icon = program.icon;
              return (
                <div
                  key={program.name}
                  className="bg-white border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/8 px-2.5 py-1 rounded-full">
                      {program.ages}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{program.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {program.description}
                    </p>
                  </div>
                  <button
                    onClick={goToTrial}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-150 mt-auto"
                  >
                    Book a trial class <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Not sure which program fits?{' '}
            <button
              onClick={() => navigate(`${BASE}/programs`)}
              className="font-medium text-primary hover:underline inline-flex items-center min-h-[44px] px-1"
            >
              See all programs
            </button>{' '}
            or{' '}
            <button
              onClick={goToTrial}
              className="font-medium text-primary hover:underline inline-flex items-center min-h-[44px] px-1"
            >
              contact us — we'll help you figure it out.
            </button>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <SectionHeader
            eyebrow="From LBMAA families"
            heading="What parents are saying."
            subheading="From parents who were exactly where you are right now."
          />

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground flex-1">
                  "{t.quote}"
                </p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={() => navigate(`${BASE}/reviews`)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-150"
            >
              Read all reviews <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── WHAT TO EXPECT ────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              heading="What to expect at your first visit."
              subheading="Most parents aren't sure what to expect. Here's exactly how a trial class works."
            />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  heading: 'Arrive and meet the team',
                  body: "You and your child will be greeted by an instructor. We'll answer any questions before the class starts.",
                },
                {
                  step: '02',
                  heading: 'Your child joins the class',
                  body: "We pair your child with students at their level. You're welcome to watch from the side — most parents do.",
                },
                {
                  step: '03',
                  heading: 'Talk to us afterward',
                  body: "After class we'll share what we observed and which program fits best. No pressure to sign up that day.",
                },
              ].map(({ step, heading, body }) => (
                <div key={step} className="flex flex-col gap-3">
                  <span className="text-5xl font-bold text-primary/12 leading-none">
                    {step}
                  </span>
                  <h3 className="font-semibold text-base">{heading}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button
                size="lg"
                className="font-semibold px-8"
                onClick={goToTrial}
              >
                Book a Free Trial Class
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>We'll be in touch within 24 hours to schedule</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY LBMAA DEEPER ──────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-muted order-last md:order-first">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1555597673-b21d5c935865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Instructor working with a young student at LBMAA"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <SectionHeader heading="We're not just teaching martial arts." />
              <ul className="space-y-4">
                {[
                  'Certified, background-checked instructors',
                  'Small classes — every child gets individual attention',
                  'Structured belt progression with clear milestones',
                  'Karate, BJJ, and Taekwondo — find the right fit',
                  'A welcoming environment for the whole family',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button
                  onClick={() => navigate(`${BASE}/about`)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-150"
                >
                  Learn more about us <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-2xl">
          <SectionHeader heading="Common questions" />
          <div className="border-t border-border">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            More questions?{' '}
            <button
              onClick={() => navigate(`${BASE}/faq`)}
              className="font-medium text-primary hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              See all FAQs
            </button>
          </p>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-lg">
          <div className="w-8 h-0.5 bg-primary rounded-full mx-auto mb-8" />
          <h2 className="text-3xl font-bold mb-3">
            Ready to see if it's a good fit?
          </h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            The first class is free. No uniform, no commitment — just come and
            see what we're about.
          </p>
          <Button size="lg" className="px-10 font-semibold" onClick={goToTrial}>
            Book a Free Trial Class
          </Button>
          <p className="text-sm text-muted-foreground mt-5">
            Prefer to call first?{' '}
            <a
              href="tel:+12095550123"
              className="font-medium text-foreground hover:underline"
            >
              (209) 555-0123
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
