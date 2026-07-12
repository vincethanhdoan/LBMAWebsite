import { useNavigate } from 'react-router-dom';
import { ChevronDown, Phone } from 'lucide-react';

const BASE = '/experimental/public';

const FAQ_SECTIONS = [
  {
    heading: 'Getting started',
    items: [
      {
        q: 'Does my child need any prior experience?',
        a: 'None at all. Every student starts at the beginning. Our instructors meet each child where they are and work at their pace.',
      },
      {
        q: 'How does the free trial class work?',
        a: "Just come in. Your child will join a regular class alongside students at a similar level. You're welcome to watch from the sideline. After class, an instructor will share observations and answer your questions — no pressure to sign up that day.",
      },
      {
        q: 'What should they wear?',
        a: 'Comfortable athletic clothes are perfect for the trial. No uniform or equipment needed. Bare feet are required on the mat.',
      },
      {
        q: 'Are there long-term contracts?',
        a: "No. We're month-to-month. Families stay because they love it, not because they're locked in.",
      },
    ],
  },
  {
    heading: 'Programs and age groups',
    items: [
      {
        q: 'Which program is right for my child?',
        a: "Programs are grouped by age — Little Dragons (4–6), Junior Warriors (7–12), and Teen Program (13–16). We'll help you figure out the best fit when you visit.",
      },
      {
        q: 'Which martial art should my child learn?',
        a: "We teach Karate, BJJ, and Taekwondo. Each has different strengths — Karate emphasizes striking and discipline, BJJ focuses on grappling and problem-solving, and Taekwondo builds athleticism and kicking technique. Come in and we'll help you decide based on your child's personality and goals.",
      },
      {
        q: 'How long is each class?',
        a: "Little Dragons classes run 30 minutes. Junior Warriors run 45 minutes. Teen Program classes are 60 minutes. Each is designed to match that age group's attention span and physical development.",
      },
      {
        q: 'What if my child has special needs or learning differences?',
        a: 'Please talk to us before the trial class. Our instructors adapt their teaching to individual needs and we want every child to feel set up to succeed from day one.',
      },
    ],
  },
  {
    heading: 'Belt progression and testing',
    items: [
      {
        q: 'How do belt promotions work?',
        a: "Students test when their instructor says they're ready — based on demonstrated skill, effort, and attitude, not a fixed schedule. We won't rush it.",
      },
      {
        q: 'How long does it take to reach black belt?',
        a: 'Typically 4–6 years of consistent training. The focus is on genuine skill and character development, not speed.',
      },
      {
        q: 'What if my child misses a class?',
        a: 'Life happens. Makeup options are available and can be managed through the parent portal. Just let us know.',
      },
    ],
  },
  {
    heading: 'Safety and environment',
    items: [
      {
        q: 'Is this safe for children?',
        a: 'Safety is the first thing we teach. All instructors are background-checked and CPR/First Aid certified. Training areas are fully padded and contact is always age-appropriate. Class ratios stay low so every child is supervised.',
      },
      {
        q: 'Will my child be taught to fight?',
        a: "They'll learn self-defense techniques, but the emphasis is on discipline, respect, and de-escalation. Students learn when — and when not — to use their skills.",
      },
      {
        q: 'Do you address bullying?',
        a: 'Yes. Anti-bullying principles are integrated throughout the curriculum — how to recognize it, how to respond, and when to ask for help.',
      },
    ],
  },
  {
    heading: 'Practical details',
    items: [
      {
        q: 'Where are you located?',
        a: '1209 South 6th Street Suite E, Los Banos, CA 93635. There is ample parking.',
      },
      {
        q: 'What are your hours?',
        a: 'Classes run Monday–Friday from 3:00–8:30 PM and Saturday 9:00 AM–2:00 PM.',
      },
      {
        q: 'Do you offer family discounts?',
        a: 'Yes — ask us about multi-sibling rates when you visit or get in touch.',
      },
      {
        q: "How do I stay informed about my child's progress?",
        a: 'Enrolled families get access to the parent portal, where you can view belt progress, read instructor feedback, and receive announcements directly.',
      },
    ],
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

export function FAQPageV2() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <section className="py-14 border-b bg-slate-50">
        <div className="container mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            FAQ
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Frequently asked questions.
          </h1>
          <p className="text-muted-foreground text-base max-w-xl">
            Common questions from parents who are new to LBMAA. Don't see yours?{' '}
            <span className="font-medium text-foreground">
              Call or message us anytime.
            </span>
          </p>
        </div>
      </section>

      {/* ── FAQ SECTIONS ── */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="space-y-14">
            {FAQ_SECTIONS.map((section) => (
              <div key={section.heading}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-5 h-0.5 bg-primary rounded-full flex-shrink-0" />
                  <h2 className="text-base font-bold text-foreground">
                    {section.heading}
                  </h2>
                </div>
                <div className="border-t border-border mt-3">
                  {section.items.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className="py-16 bg-slate-50 border-t">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            We're a family-run school and we're happy to talk through anything —
            before you ever step through the door. There's no sales pitch.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
            <a
              href="tel:+12095550123"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 font-medium text-foreground hover:underline"
            >
              <Phone className="w-4 h-4 text-primary" />
              (209) 555-0123
            </a>
            <span className="hidden sm:block text-muted-foreground">·</span>
            <a
              href="mailto:info@lbmaa.com"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 font-medium text-foreground hover:underline"
            >
              info@lbmaa.com
            </a>
            <span className="hidden sm:block text-muted-foreground">·</span>
            <button
              onClick={() => navigate(`${BASE}/contact?intent=trial`)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 font-semibold text-primary hover:underline"
            >
              Book a free trial class
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
