import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { SectionHeader } from '../components/SectionHeader';
import {
  Shield,
  Wind,
  Eye,
  Ruler,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const BASE = '/experimental/public';

const GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Instructor working with a student',
  },
  {
    src: 'https://images.unsplash.com/photo-1635962005741-a9c4904d110b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Young students in class',
  },
  {
    src: 'https://images.unsplash.com/photo-1769095211505-fbcbf6530f02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Students training on the mat',
  },
  {
    src: 'https://images.unsplash.com/photo-1720495369604-289694ddabb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Teen students in training',
  },
  {
    src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Training floor overview',
  },
  {
    src: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Students lined up in class',
  },
];

export function FacilitiesPageV2() {
  const navigate = useNavigate();
  const goToTrial = () => navigate(`${BASE}/contact?intent=trial`);

  return (
    <div>
      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <section className="py-20 border-b bg-slate-50">
        <div className="container mx-auto px-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Facilities
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-snug">
            A space designed for kids to train safely.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Before you enroll your child, you should know exactly what kind of
            environment they'll be in. Here's what our facility looks like and
            how we keep it safe, clean, and structured.
          </p>
        </div>
      </section>

      {/* ── THE TRAINING FLOOR ────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-muted">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Martial arts training floor with mats"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <SectionHeader heading="The training floor." />
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Our main floor is fully matted from wall to wall — no hard
                surfaces, no gaps. The space is sized to give each student room
                to move without crowding. Good lighting, clear sightlines, and
                no clutter.
              </p>
              <ul className="space-y-3">
                {[
                  'Full-coverage foam mats, professionally installed',
                  'Adequate square footage per student per class',
                  'Open layout — no hidden areas, full visibility',
                  'Padded walls along the training perimeter',
                  'Dedicated stretching and warm-up area',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFETY & CLEANLINESS ──────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="Safety and cleanliness."
            subheading="We treat the facility the way we'd want our own kids' school treated. These aren't policies we invented for a webpage — they're just how we operate."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Wind,
                heading: 'Mats cleaned after every class',
                body: 'Training surfaces are wiped down with disinfectant at the end of each session, every day. Not weekly — daily.',
              },
              {
                icon: Eye,
                heading: 'Instructors present at all times',
                body: 'No student is unsupervised on the floor. An instructor is always present from the moment class begins to the moment it ends.',
              },
              {
                icon: Shield,
                heading: 'Age-appropriate contact only',
                body: 'Training contact is calibrated to each age group. Younger students do not spar at full intensity. Safety is the first technique we teach.',
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

      {/* ── TRAINING ENVIRONMENT ──────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader heading="What the environment feels like." />

          <div className="grid md:grid-cols-2 gap-x-14 gap-y-8">
            {[
              {
                icon: Users,
                heading: 'Small classes by design',
                body: 'We cap enrollment per class intentionally. Every instructor knows every student — not just their name, but where they are in their development.',
              },
              {
                icon: Ruler,
                heading: 'Structured, not chaotic',
                body: 'Classes follow a consistent format: warm-up, technique, practice, cool-down. Students know what to expect. That structure is part of what makes them feel safe.',
              },
              {
                icon: Clock,
                heading: 'Predictable schedule',
                body: 'Classes start and end on time. Parents can set a pickup time and rely on it. We respect your schedule.',
              },
              {
                icon: Shield,
                heading: 'Respectful atmosphere',
                body: 'Students address instructors formally and treat each other with respect. That tone is set from day one and consistently maintained.',
              },
            ].map(({ icon: Icon, heading, body }) => (
              <div key={heading} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
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

      {/* ── PHOTO GALLERY ─────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="See the space."
            subheading="A few shots of the facility. The best way to see it is in person — come by during class hours any time."
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GALLERY.map((photo) => (
              <div
                key={photo.alt}
                className="rounded-xl overflow-hidden aspect-square bg-muted"
              >
                <ImageWithFallback
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-5">
            Photos will be replaced with real facility images. Drop-ins welcome
            during class hours — come see it for yourself.
          </p>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-lg">
          <div className="w-8 h-0.5 bg-primary rounded-full mx-auto mb-8" />
          <h2 className="text-2xl font-bold mb-3">Come see it in person.</h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            No appointment needed during class hours. Walk in, look around, meet
            the instructors. If you want to book a free trial class, we're ready
            for that too.
          </p>
          <Button
            size="lg"
            className="px-10 font-semibold shadow-sm"
            onClick={goToTrial}
          >
            Book a Free Trial Class
          </Button>
          <p className="text-sm text-muted-foreground mt-5">
            Or call us:{' '}
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
