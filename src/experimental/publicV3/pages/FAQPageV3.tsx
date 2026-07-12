import { useState } from 'react';
import { V3 } from '../design';

const FAQS = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'Does my child need any experience?',
        a: 'None at all. Every student starts at the beginning. Our instructors are trained to work with students at every level, from the very first day.',
      },
      {
        q: 'What should my child wear to the trial class?',
        a: 'Just comfortable athletic clothes. No uniform, no equipment, and no gear needed. We provide everything for the first class.',
      },
      {
        q: 'How does the free trial class work?',
        a: "You and your child come in, meet the instructors, and your child joins a real class with students at their age and level. You watch from the side. Afterward, we'll answer any questions — no pressure to sign up that day.",
      },
      {
        q: 'What age can my child start?',
        a: 'Our youngest program, Little Dragons, starts at age 4. We have programs for all ages up through adults. Call us and we can help figure out which class is the right fit.',
      },
    ],
  },
  {
    category: 'Programs & Schedule',
    items: [
      {
        q: 'What programs do you offer?',
        a: 'We offer Kids Martial Arts (split into Little Dragons for ages 4–6, and Juniors for ages 7–12), a Teens & Adults program for age 13 and up, and Kickboxing Fitness for all ages. All programs are taught by ERWCMAA-certified instructors.',
      },
      {
        q: 'What days and times are classes?',
        a: "Classes run Monday through Friday from 3:00 PM – 8:30 PM, and Saturday from 9:00 AM – 2:00 PM. Specific class times vary by program — contact us and we'll match you with a schedule that works.",
      },
      {
        q: 'Do you offer adult classes?',
        a: 'Yes. Our Teens & Adults program is for ages 13+ and covers the full WCWMA mixed martial arts curriculum. Adults are very welcome — many join with no prior experience.',
      },
    ],
  },
  {
    category: 'Enrollment & Commitment',
    items: [
      {
        q: 'Are there long-term contracts?',
        a: "No. We're month-to-month. We want families here because they love it, not because they're locked in.",
      },
      {
        q: 'How much does it cost?',
        a: "Tuition varies by program. Contact us and we'll walk you through current rates — there's no obligation.",
      },
      {
        q: 'Do I need to buy a uniform right away?',
        a: "No. For the first few classes, athletic clothes are fine. When your child is enrolled and ready to start training regularly, we'll guide you through getting a uniform.",
      },
    ],
  },
  {
    category: 'Belt Progression',
    items: [
      {
        q: 'How do belt promotions work?',
        a: "Students are promoted when their instructor determines they're ready — based on demonstrated skill, effort, and character. There's no fixed schedule or mandatory testing fee cycle.",
      },
      {
        q: 'How long does it take to earn a black belt?',
        a: 'It varies significantly by student. A dedicated student training consistently might earn a black belt in 4–7 years. But the journey is the point — each rank represents real growth.',
      },
      {
        q: 'Is there pressure to test or advance quickly?',
        a: "None at all. We never rush promotions. Students advance when they're genuinely ready, which makes every belt meaningful.",
      },
    ],
  },
  {
    category: 'Safety',
    items: [
      {
        q: 'Is martial arts safe for young kids?',
        a: 'Safety is the first thing we teach. All classes are supervised by certified instructors. Training areas are fully padded. Contact is always age-appropriate — Little Dragons, for example, focuses on movement, not sparring.',
      },
      {
        q: 'Are instructors background-checked?',
        a: 'Yes. All LBMAA instructors are background-checked and certified through the ERWCMAA.',
      },
      {
        q: 'My child is shy or has anxiety. Is this a good fit?',
        a: "Many of our students start out shy or anxious — and that's exactly why they benefit so much. Our instructors are patient and encouraging. We've seen remarkable transformations in students who struggled with confidence.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: `1px solid ${V3.border}` }}>
      <button
        className="w-full flex items-center justify-between gap-4 min-h-[56px] py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className="text-sm font-semibold leading-snug"
          style={{ color: V3.text }}
        >
          {q}
        </span>
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base font-bold leading-none transition-colors"
          style={{
            backgroundColor: open ? V3.primaryBg : V3.surface,
            color: open ? V3.primary : V3.muted,
            fontFamily: 'monospace',
          }}
          aria-hidden="true"
        >
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed" style={{ color: V3.muted }}>
          {a}
        </p>
      )}
    </div>
  );
}

export function FAQPageV3() {
  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section
        className="py-20"
        style={{
          backgroundColor: V3.surface,
          borderBottom: `1px solid ${V3.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Common Questions</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            Everything You Need to Know
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            If you don't find your answer here, just reach out. We're happy to
            help.
          </p>
        </div>
      </section>

      {/* ── FAQ SECTIONS ── */}
      <section className="py-24" style={{ backgroundColor: 'white' }}>
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <div className="flex flex-col gap-14">
            {FAQS.map(({ category, items }) => (
              <div key={category}>
                <h2
                  className="v3-h text-xl font-bold mb-1"
                  style={{ color: V3.text }}
                >
                  {category}
                </h2>
                <div
                  className="mb-6"
                  style={{
                    width: '2.5rem',
                    height: '3px',
                    backgroundColor: V3.primary,
                    borderRadius: '2px',
                  }}
                />
                <div style={{ borderTop: `1px solid ${V3.border}` }}>
                  {items.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
