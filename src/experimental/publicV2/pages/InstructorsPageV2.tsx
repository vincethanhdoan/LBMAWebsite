import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { SectionHeader } from '../components/SectionHeader';
import { Award, Heart, Users, Target, CheckCircle2 } from 'lucide-react';

const BASE = '/experimental/public';

const INSTRUCTORS = [
  {
    name: 'Master Carlos Reyes',
    title: 'Head Instructor & Founder',
    belt: 'Black Belt — 5th Dan',
    specialties: ['Leadership', 'Youth Development', 'Advanced Techniques'],
    bio: 'Master Reyes has over 20 years of martial arts experience and a passion for helping young people discover their potential. His patient, encouraging teaching style creates an environment where every student feels valued and supported.',
    certifications: [
      'Certified Youth Instructor',
      'Sports Safety Certified',
      'CPR/First Aid',
    ],
  },
  {
    name: 'Instructor Maria Santos',
    title: 'Little Dragons Program Director',
    belt: 'Black Belt — 3rd Dan',
    specialties: [
      'Early Childhood Education',
      'Motor Skills Development',
      'Positive Reinforcement',
    ],
    bio: 'With a background in early childhood education and years of experience teaching young children, Instructor Santos brings joy and enthusiasm to every Little Dragons class. She has a special gift for connecting with our youngest students.',
    certifications: [
      'Early Childhood Education Degree',
      'Youth Martial Arts Specialist',
      'CPR/First Aid',
    ],
  },
  {
    name: 'Instructor David Chen',
    title: 'Teen Program Instructor',
    belt: 'Black Belt — 4th Dan',
    specialties: [
      'Advanced Training',
      'Competition Coaching',
      'Fitness & Conditioning',
    ],
    bio: 'Instructor Chen specializes in working with teenage students, helping them develop discipline, confidence, and leadership skills. His high-energy classes challenge students while maintaining a supportive and encouraging atmosphere.',
    certifications: [
      'Sport Martial Arts Coach',
      'Strength & Conditioning Specialist',
      'CPR/First Aid',
    ],
  },
  {
    name: 'Instructor Emily Rodriguez',
    title: 'Youth Program Instructor',
    belt: 'Black Belt — 2nd Dan',
    specialties: [
      'Character Development',
      'Anti-Bullying Programs',
      'Student Mentorship',
    ],
    bio: 'Instructor Rodriguez is passionate about using martial arts as a tool for building confidence and character. She creates a warm, inclusive environment where every student feels they belong and can succeed.',
    certifications: [
      'Youth Development Specialist',
      'Anti-Bullying Instructor',
      'CPR/First Aid',
    ],
  },
];

const TEAM_QUALITIES = [
  {
    icon: Award,
    heading: 'Certified professionals',
    body: 'All instructors are certified and regularly trained in the latest teaching methods.',
  },
  {
    icon: Heart,
    heading: 'Passionate educators',
    body: "They don't just teach martial arts — they genuinely care about each student's success.",
  },
  {
    icon: Users,
    heading: 'Child development focus',
    body: 'Specialized training in age-appropriate teaching and child development.',
  },
  {
    icon: Target,
    heading: 'Safety first',
    body: 'CPR/First Aid certified with comprehensive safety training and background checks.',
  },
];

export function InstructorsPageV2() {
  const navigate = useNavigate();
  const goToTrial = () => navigate(`${BASE}/contact?intent=trial`);

  return (
    <div>
      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <section className="py-20 border-b bg-slate-50">
        <div className="container mx-auto px-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Our Team
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-snug">
            Meet our instructors.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Experienced, certified professionals dedicated to your child's
            growth. Not just martial artists — coaches who understand children.
          </p>
        </div>
      </section>

      {/* ── TEAM QUALITIES ────────────────────────────────── */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {TEAM_QUALITIES.map(({ icon: Icon, heading, body }) => (
              <div key={heading} className="flex flex-col gap-3">
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

      {/* ── INSTRUCTOR PROFILES ───────────────────────────── */}
      <section className="py-10 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            heading="The people teaching your child."
            subheading="Every instructor is background-checked, certified, and genuinely invested in each student's progress."
          />

          <div className="space-y-6">
            {INSTRUCTORS.map((instructor) => {
              const initials = instructor.name
                .split(' ')
                .map((n) => n[0])
                .join('');

              return (
                <div
                  key={instructor.name}
                  className="bg-white border border-border rounded-xl p-6 md:p-8"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar + belt */}
                    <div className="flex flex-col items-start gap-3 md:w-40 flex-shrink-0">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold">
                        {instructor.belt}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-0.5">
                        {instructor.name}
                      </h3>
                      <p className="text-sm text-primary font-semibold mb-4">
                        {instructor.title}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        {instructor.bio}
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Specialties
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {instructor.specialties.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Certifications
                          </p>
                          <ul className="space-y-1">
                            {instructor.certifications.map((cert) => (
                              <li
                                key={cert}
                                className="flex items-start gap-2 text-xs text-muted-foreground"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                                {cert}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TEACHING PHILOSOPHY ───────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y">
        <div className="container mx-auto px-6 max-w-3xl">
          <SectionHeader heading="Our teaching philosophy." />
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              At LBMAA, we believe every child learns differently and progresses
              at their own pace. Our instructors are trained to recognize
              individual learning styles and adapt their teaching to meet each
              student's needs.
            </p>
            <p>
              We use positive reinforcement to build confidence and motivation.
              Every improvement — no matter how small — is celebrated. Mistakes
              are viewed as valuable learning opportunities, not failures.
            </p>
            <p>
              Our instructors serve as role models, demonstrating the values we
              teach: respect, integrity, discipline, and kindness. Beyond
              martial arts techniques, we focus on developing the whole child —
              building character, fostering leadership skills, and teaching life
              lessons that extend far beyond our dojo walls.
            </p>
          </div>

          {/* Safety notice */}
          <div className="mt-10 bg-white border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                Your child's safety is our top priority.
              </span>{' '}
              All instructors undergo comprehensive background checks and are
              CPR/First Aid certified. We maintain strict safety protocols and a
              zero-tolerance policy for any behavior that compromises student
              wellbeing.
            </p>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ───────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center max-w-lg">
          <div className="w-8 h-0.5 bg-primary rounded-full mx-auto mb-8" />
          <h2 className="text-2xl font-bold mb-3">
            Come meet the team in person.
          </h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            The first class is free. Bring your child in and let the instructors
            introduce themselves — no pressure to sign up that day.
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
