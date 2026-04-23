import { useState } from 'react';
import { CheckCircle2, AlertCircle, X, Plus } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { submitEnrollmentLeadWithTimeout } from '../../lib/supabase/client';
import { V3 } from './design';

const REASSURANCES = [
  'First class is free — no commitment',
  'We respond within 24 hours',
  "We're here to help, not to pressure",
];

const CONTACT_INFO = [
  { label: 'Phone', value: '(209) 555-0123', href: 'tel:+12095550123' },
  { label: 'Email', value: 'info@lbmaa.com', href: 'mailto:info@lbmaa.com' },
];

const HOURS = [
  { day: 'Mon – Fri', time: '3:00 – 8:30 PM' },
  { day: 'Saturday',  time: '9:00 AM – 2:00 PM' },
  { day: 'Sunday',    time: 'Closed' },
];

type ChildRow = { name: string; age: string };

function programLabel(age: string): { text: string; color: string } | null {
  const n = Number(age);
  if (!age || isNaN(n)) return null;
  if (n >= 4 && n <= 7)  return { text: 'Little Dragons · ages 4–7',  color: '#6d28d9' };
  if (n >= 8 && n <= 17) return { text: 'Youth Program · ages 8–17', color: '#1d4ed8' };
  return { text: 'Age must be 4–17', color: '#dc2626' };
}

export function ContactPage() {
  const [parentName,  setParentName]  = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [phone,       setPhone]       = useState('');
  const [message,     setMessage]     = useState('');
  const [children,    setChildren]    = useState<ChildRow[]>([{ name: '', age: '' }]);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addChild() {
    setChildren(prev => [...prev, { name: '', age: '' }]);
  }

  function removeChild(i: number) {
    setChildren(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateChild(i: number, field: 'name' | 'age', value: string) {
    setChildren(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    for (const c of children) {
      if (!c.name.trim() || !c.age) {
        setSubmitError('Each child must have a name and age.');
        return;
      }
      const age = Number(c.age);
      if (!Number.isInteger(age) || age < 4 || age > 17) {
        setSubmitError('We currently enroll ages 4–17. Please contact us directly for other inquiries.');
        return;
      }
    }

    setIsSubmitting(true);
    const { data, error } = await submitEnrollmentLeadWithTimeout(
      {
        parentName,
        parentEmail,
        phone: phone || undefined,
        message: message || undefined,
        sourcePage: 'contact',
        children: children.map(c => ({ name: c.name.trim(), age: Number(c.age) })),
      },
      12000,
    );

    if (error || !data) {
      setSubmitError(error?.message || 'Unable to submit right now. Please try again or call us directly.');
      setIsSubmitting(false);
      return;
    }
    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section className="py-14" style={{ backgroundColor: V3.surface, borderBottom: `1px solid ${V3.border}` }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="v3-eyebrow mb-4">Get In Touch</p>
          <h1 className="v3-h font-black leading-[1.0] mb-5" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: V3.text }}>
            We'd Love to Hear From You
          </h1>
          <p className="text-base leading-relaxed max-w-xl" style={{ color: V3.muted }}>
            Questions about our programs? Ready to book a trial class? We'll respond within one business day — no sales calls, no pressure.
          </p>
        </div>
      </section>

      {/* ── CONTACT GRID ── */}
      <section className="py-16" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl items-start">

            {/* ── FORM ── */}
            <div>
              <h2 className="v3-h font-black text-3xl mb-2" style={{ color: V3.text }}>Send Us a Message</h2>
              <p className="text-sm mb-8" style={{ color: V3.muted }}>Fill out the form and we'll be in touch within one business day.</p>

              {submitted ? (
                <div className="py-16 text-center rounded-xl" style={{ backgroundColor: V3.surface, border: `1px solid ${V3.border}` }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: V3.primaryBg }}>
                    <CheckCircle2 className="w-8 h-8" style={{ color: V3.primary }} />
                  </div>
                  <h3 className="v3-h text-2xl font-black mb-2" style={{ color: V3.text }}>We Got Your Message</h3>
                  <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: V3.muted }}>
                    We'll be in touch within 24 hours to answer your questions and get your child scheduled for a free trial class.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="parentName">Your name <span style={{ color: V3.primary }}>*</span></Label>
                      <Input id="parentName" placeholder="Jane Smith" value={parentName} onChange={e => setParentName(e.target.value)} disabled={isSubmitting} required className="min-h-[48px]" autoComplete="name" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="phone">Phone <span className="font-normal" style={{ color: V3.muted }}>(optional)</span></Label>
                      <Input id="phone" type="tel" placeholder="(209) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} disabled={isSubmitting} className="min-h-[48px]" autoComplete="tel" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="parentEmail">Email address <span style={{ color: V3.primary }}>*</span></Label>
                    <Input id="parentEmail" type="email" placeholder="you@example.com" value={parentEmail} onChange={e => setParentEmail(e.target.value)} disabled={isSubmitting} required className="min-h-[48px]" autoComplete="email" />
                  </div>

                  {/* Children */}
                  <div className="flex flex-col gap-2 pt-1">
                    <Label>Children enrolling <span style={{ color: V3.primary }}>*</span></Label>
                    <p className="text-xs" style={{ color: V3.muted }}>Name and age required · We use age to place your child in the right program</p>
                    {children.map((child, i) => {
                      const pl = programLabel(child.age);
                      return (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Child's name"
                              value={child.name}
                              onChange={e => updateChild(i, 'name', e.target.value)}
                              disabled={isSubmitting}
                              required
                              className="min-h-[44px] flex-1"
                            />
                            <Input
                              type="number"
                              min={4}
                              max={17}
                              placeholder="Age"
                              value={child.age}
                              onChange={e => updateChild(i, 'age', e.target.value)}
                              disabled={isSubmitting}
                              required
                              className="min-h-[44px] w-20"
                            />
                            {children.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeChild(i)}
                                disabled={isSubmitting}
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                                style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {pl && (
                            <p className="text-xs font-medium pl-1" style={{ color: pl.color }}>{pl.text}</p>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addChild}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 text-sm self-start transition-opacity hover:opacity-70"
                      style={{ color: V3.primary }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add another child
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="message">Questions or notes <span className="font-normal" style={{ color: V3.muted }}>(optional)</span></Label>
                    <Textarea id="message" placeholder="Preferred schedule, questions about programs, or anything else on your mind." rows={4} value={message} onChange={e => setMessage(e.target.value)} disabled={isSubmitting} />
                  </div>

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <button type="submit" disabled={isSubmitting} className="v3-btn-primary w-full" style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                    {isSubmitting ? 'Sending…' : 'Send Message'}
                  </button>

                  <p className="text-xs text-center" style={{ color: V3.muted }}>* Required. We'll never share your information.</p>
                </form>
              )}
            </div>

            {/* ── INFO SIDE ── */}
            <div>
              <h2 className="v3-h font-black text-3xl mb-2" style={{ color: V3.text }}>Find Us</h2>
              <p className="text-sm mb-8" style={{ color: V3.muted }}>Stop by, call, or drop us a line.</p>
              <div className="mb-6">
                <p className="v3-eyebrow mb-2">Location</p>
                <p className="text-sm leading-relaxed" style={{ color: V3.muted }}>123 Main Street<br />Los Banos, CA 93635</p>
              </div>
              <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${V3.border}` }}>
                <p className="v3-eyebrow mb-3">Class Hours</p>
                <div className="flex flex-col gap-1.5">
                  {HOURS.map(({ day, time }) => (
                    <div key={day} className="flex justify-between text-sm gap-4">
                      <span style={{ color: V3.text }}>{day}</span>
                      <span style={{ color: V3.muted }}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-8 pt-6" style={{ borderTop: `1px solid ${V3.border}` }}>
                <p className="v3-eyebrow mb-3">Phone &amp; Email</p>
                <div className="flex flex-col gap-2">
                  {CONTACT_INFO.map(({ label, value, href }) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      <span className="w-10 flex-shrink-0 font-semibold" style={{ color: V3.muted }}>{label}</span>
                      <a href={href} className="transition-colors hover:opacity-80" style={{ color: V3.primary }}>{value}</a>
                    </div>
                  ))}
                  <p className="text-xs mt-1" style={{ color: V3.muted }}>We reply within 1 business day</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-6" style={{ borderTop: `1px solid ${V3.border}` }}>
                {REASSURANCES.map((pt) => (
                  <div key={pt} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: V3.primary }} />
                    <span className="text-sm" style={{ color: V3.muted }}>{pt}</span>
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
          <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${V3.border}` }}>
            <iframe
              title="LBMAA Location"
              src="https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=Los+Banos,CA"
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
