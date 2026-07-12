import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { SectionHeader } from '../components/SectionHeader';
import { CheckCircle2, Shield, Users, Heart, Star } from 'lucide-react';

const BASE = '/experimental/public';

export function AboutPageV2() {
  const navigate = useNavigate();
  const goToTrial = () => navigate(`${BASE}/contact?intent=trial`);

  return (
    <div>
      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <section className="py-20 border-b bg-slate-50">
        <div className="container mx-auto px-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            About Us
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-snug">
            A school that feels like family.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Los Banos Martial Arts Academy was built around one belief: that
            every child deserves a place where they feel safe, challenged, and
            supported. We're not a franchise. We're a local, family-run school
            and we know every student by name.
          </p>
        </div>
      </section>

      {/* ── OUR STORY ─────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-muted">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1555597673-b21d5c935865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Instructor teaching at LBMAA"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <SectionHeader heading="Our story." />
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  LBMAA started with a simple idea: that the best martial arts
                  school for a child isn't the most decorated one — it's the one
                  where they feel seen and respected every time they walk
                  through the door.
                </p>
                <p>
                  Our instructors aren't just skilled martial artists. They're
                  mentors who understand children — how to challenge them
                  without discouraging them, how to hold standards without
                  creating pressure, and how to make every student feel like
                  they belong.
                </p>
                <p>
                  Whether your child is shy and needs a confidence boost, full
                  of energy and needs focus, or just looking for something
                  positive to be part of — we meet them where they are.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ─────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="What we build in every student."
            subheading="These aren't just values we talk about — they're what you'll see in your child after a few months on the mat."
          />

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                heading: 'Discipline',
                body: "Self-control, focus, and the ability to work hard toward a goal. These habits don't stay in the dojo — they carry into school and home.",
              },
              {
                icon: Heart,
                heading: 'Respect',
                body: 'For themselves, for their peers, for instructors, and for their families. Respect is the first lesson and the one we never stop teaching.',
              },
              {
                icon: Star,
                heading: 'Confidence',
                body: 'The kind that comes from real achievement. When a student earns a belt, they know they earned it — and that feeling stays with them.',
              },
            ].map(({ icon: Icon, heading, body }) => (
              <div
                key={heading}
                className="bg-white border border-border rounded-xl p-6 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{heading}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT MAKES US DIFFERENT ───────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="What parents notice first."
            subheading="These are the things families tell us made the biggest difference."
          />

          <div className="grid md:grid-cols-2 gap-x-14 gap-y-8">
            {[
              {
                heading: 'Your child is not a number here',
                body: 'We keep classes small on purpose. Every instructor knows every student — their name, their goals, and where they started.',
              },
              {
                heading: 'Progress based on readiness, not schedule',
                body: "Students test for their next belt when their instructor says they're ready. There's no pressure, no fixed timeline. Skill drives the process.",
              },
              {
                heading: "You're always in the loop",
                body: 'Parents are welcome to watch any class. Our family portal keeps you connected with announcements, updates, and direct communication from staff.',
              },
              {
                heading: 'Mistakes are part of the plan',
                body: "We teach students that failing a technique isn't failure — it's the beginning of learning it. That mindset changes how kids approach challenges everywhere.",
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{heading}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTRUCTOR PREVIEW ────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="The people teaching your child."
            subheading="Certified, background-checked, and trained in working with children across all experience levels. They're coaches — not just technicians."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Head Instructor',
                credential: 'Black Belt — 10+ years teaching',
                note: "Specializes in children's programs, ages 4–12",
              },
              {
                name: 'Assistant Instructor',
                credential: 'Black Belt — 6+ years teaching',
                note: 'Focus: teen and advanced programs',
              },
              {
                name: 'Youth Coach',
                credential: 'Brown Belt — 4+ years teaching',
                note: 'Little Dragons program specialist',
              },
            ].map((instructor) => (
              <div
                key={instructor.name}
                className="bg-white border border-border rounded-xl p-5 flex flex-col gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-sm">{instructor.name}</p>
                <p className="text-xs text-primary font-medium">
                  {instructor.credential}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {instructor.note}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-muted-foreground">
              All instructors are background-checked and certified in first aid.
            </p>
            <button
              onClick={() => navigate(`${BASE}/instructors`)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Meet the full team →
            </button>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-lg">
          <div className="w-8 h-0.5 bg-primary rounded-full mx-auto mb-8" />
          <h2 className="text-2xl font-bold mb-3">Come see it for yourself.</h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            The best way to know if LBMAA is right for your child is to bring
            them in. First class is free, no strings attached.
          </p>
          <Button size="lg" className="px-10 font-semibold" onClick={goToTrial}>
            Book a Free Trial Class
          </Button>
          <p className="text-sm text-muted-foreground mt-5">
            Questions?{' '}
            <a
              href="tel:+12095550123"
              className="font-medium text-foreground hover:underline"
            >
              Call us at (209) 555-0123
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
