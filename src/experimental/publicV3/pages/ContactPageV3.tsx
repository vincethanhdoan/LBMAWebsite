import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { submitEnrollmentLeadWithTimeout } from '../../../lib/supabase/client';
import { V3 } from '../design';

const REASSURANCES = [
  'First class is free — no commitment',
  'We respond within 24 hours',
  "We're here to help, not to pressure",
];

const CONTACT_INFO = [
  {
    label: 'Phone',
    value: '(209) 555-0123',
    href: 'tel:+12095550123',
  },
  {
    label: 'Email',
    value: 'info@lbmaa.com',
    href: 'mailto:info@lbmaa.com',
  },
];

const HOURS = [
  { day: 'Mon – Fri', time: '3:00 – 8:30 PM' },
  { day: 'Saturday', time: '9:00 AM – 2:00 PM' },
  { day: 'Sunday', time: 'Closed' },
];

export function ContactPageV3() {
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    phone: '',
    studentName: '',
    studentAge: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const parsedAge = formData.studentAge.trim()
      ? Number(formData.studentAge)
      : undefined;
    if (
      parsedAge !== undefined &&
      (!Number.isInteger(parsedAge) || parsedAge < 3 || parsedAge > 99)
    ) {
      setSubmitError('Please enter a valid student age between 3 and 99.');
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await submitEnrollmentLeadWithTimeout(
      {
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        phone: formData.phone || undefined,
        message: formData.message || undefined,
        sourcePage: 'contact',
        children: formData.studentName.trim()
          ? [{ name: formData.studentName.trim(), age: parsedAge ?? 0 }]
          : [],
      },
      12000,
    );

    if (error || !data) {
      setSubmitError(
        error?.message ||
          'Unable to submit right now. Please try again or call us directly.',
      );
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
    setIsSubmitting(false);
  };

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
          <p className="v3-eyebrow mb-4">Get In Touch</p>
          <h1
            className="v3-h font-black leading-[1.0] mb-5"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}
          >
            We'd Love to Hear From You
          </h1>
          <p
            className="text-base leading-relaxed max-w-xl"
            style={{ color: V3.muted }}
          >
            Questions about our programs? Ready to book a trial class? We'll
            respond within one business day — no sales calls, no pressure.
          </p>
        </div>
      </section>

      {/* ── CONTACT GRID ── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl items-start">
            {/* ── FORM ── */}
            <div>
              <h2
                className="v3-h font-black text-3xl mb-2"
                style={{ color: V3.text }}
              >
                Send Us a Message
              </h2>
              <p className="text-sm mb-8" style={{ color: V3.muted }}>
                Fill out the form and we'll be in touch within one business day.
              </p>

              {submitted ? (
                <div
                  className="py-16 text-center rounded-xl"
                  style={{
                    backgroundColor: V3.surface,
                    border: `1px solid ${V3.border}`,
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: V3.primaryBg }}
                  >
                    <CheckCircle2
                      className="w-8 h-8"
                      style={{ color: V3.primary }}
                    />
                  </div>
                  <h3
                    className="v3-h text-2xl font-black mb-2"
                    style={{ color: V3.text }}
                  >
                    We Got Your Message
                  </h3>
                  <p
                    className="text-sm max-w-sm mx-auto leading-relaxed"
                    style={{ color: V3.muted }}
                  >
                    We'll be in touch within 24 hours to answer your questions
                    and get your child scheduled for a free trial class.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="parentName">
                        Your name <span style={{ color: V3.primary }}>*</span>
                      </Label>
                      <Input
                        id="parentName"
                        name="parentName"
                        placeholder="Jane Smith"
                        value={formData.parentName}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                        className="min-h-[48px]"
                        autoComplete="name"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="phone">
                        Phone{' '}
                        <span
                          className="font-normal"
                          style={{ color: V3.muted }}
                        >
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(209) 555-0100"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="min-h-[48px]"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="parentEmail">
                      Email address <span style={{ color: V3.primary }}>*</span>
                    </Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.parentEmail}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      required
                      className="min-h-[48px]"
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="studentName">
                        Child's name{' '}
                        <span
                          className="font-normal"
                          style={{ color: V3.muted }}
                        >
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="studentName"
                        name="studentName"
                        placeholder="Alex"
                        value={formData.studentName}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="min-h-[48px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="studentAge">
                        Child's age{' '}
                        <span
                          className="font-normal"
                          style={{ color: V3.muted }}
                        >
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="studentAge"
                        name="studentAge"
                        type="number"
                        min={3}
                        max={99}
                        placeholder="9"
                        value={formData.studentAge}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="message">
                      Questions or notes{' '}
                      <span className="font-normal" style={{ color: V3.muted }}>
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Preferred schedule, questions about programs, or anything else on your mind."
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="v3-btn-primary w-full"
                    style={{
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Sending…' : 'Send Message'}
                  </button>

                  <p
                    className="text-xs text-center"
                    style={{ color: V3.muted }}
                  >
                    * Required. We'll never share your information.
                  </p>
                </form>
              )}
            </div>

            {/* ── INFO SIDE ── */}
            <div>
              <h2
                className="v3-h font-black text-3xl mb-2"
                style={{ color: V3.text }}
              >
                Find Us
              </h2>
              <p className="text-sm mb-8" style={{ color: V3.muted }}>
                Stop by, call, or drop us a line.
              </p>

              {/* Contact details */}
              <div
                className="rounded-xl p-6 mb-5"
                style={{
                  backgroundColor: V3.surface,
                  border: `1px solid ${V3.border}`,
                }}
              >
                <h3
                  className="v3-h text-base font-bold mb-4"
                  style={{ color: V3.text }}
                >
                  Location
                </h3>
                <p className="text-sm" style={{ color: V3.muted }}>
                  1209 South 6th Street Suite E<br />
                  Los Banos, CA 93635
                </p>
              </div>

              <div
                className="rounded-xl p-6 mb-5"
                style={{
                  backgroundColor: V3.surface,
                  border: `1px solid ${V3.border}`,
                }}
              >
                <h3
                  className="v3-h text-base font-bold mb-4"
                  style={{ color: V3.text }}
                >
                  Class Hours
                </h3>
                <div className="flex flex-col gap-1.5">
                  {HOURS.map(({ day, time }) => (
                    <div
                      key={day}
                      className="flex justify-between text-sm gap-4"
                    >
                      <span style={{ color: V3.text }}>{day}</span>
                      <span style={{ color: V3.muted }}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-6 mb-8"
                style={{
                  backgroundColor: V3.surface,
                  border: `1px solid ${V3.border}`,
                }}
              >
                <h3
                  className="v3-h text-base font-bold mb-4"
                  style={{ color: V3.text }}
                >
                  Phone &amp; Email
                </h3>
                <div className="flex flex-col gap-2">
                  {CONTACT_INFO.map(({ label, value, href }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className="w-10 flex-shrink-0 font-semibold"
                        style={{ color: V3.muted }}
                      >
                        {label}
                      </span>
                      <a
                        href={href}
                        className="transition-colors hover:opacity-80"
                        style={{ color: V3.primary }}
                      >
                        {value}
                      </a>
                    </div>
                  ))}
                  <p className="text-xs mt-1" style={{ color: V3.muted }}>
                    We reply within 1 business day
                  </p>
                </div>
              </div>

              {/* Reassurances */}
              <div className="flex flex-col gap-3">
                {REASSURANCES.map((pt) => (
                  <div key={pt} className="flex items-center gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: V3.primary }}
                    />
                    <span className="text-sm" style={{ color: V3.muted }}>
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP ── */}
      <section style={{ borderTop: `1px solid ${V3.border}` }}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div
            className="overflow-hidden rounded-xl"
            style={{ border: `1px solid ${V3.border}` }}
          >
            <iframe
              title="LBMAA Location"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=1209+South+6th+Street+Suite+E+Los+Banos+CA+93635`}
              width="100%"
              height="320"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
