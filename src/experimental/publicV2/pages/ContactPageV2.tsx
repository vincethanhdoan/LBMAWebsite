import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { submitEnrollmentLeadWithTimeout } from '../../../lib/supabase/client';

const TRIAL_MESSAGE = "I'd like to schedule a free trial class.";

export function ContactPageV2() {
  const [searchParams] = useSearchParams();
  const isTrialIntent = searchParams.get('intent') === 'trial';

  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    phone: '',
    studentName: '',
    studentAge: '',
    message: isTrialIntent ? TRIAL_MESSAGE : '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync message if intent param changes after mount
  useEffect(() => {
    if (isTrialIntent) {
      // Prototype: prefills the message once when the trial intent param appears; deriving is not worth it here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        message: prev.message || TRIAL_MESSAGE,
      }));
    }
  }, [isTrialIntent]);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <section className="py-20 border-b bg-slate-50">
        <div className="container mx-auto px-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-snug">
            {isTrialIntent ? 'Book your free trial class.' : 'Get in touch.'}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {isTrialIntent
              ? "Fill out the form and we'll get back to you within 24 hours to schedule your child's free trial class."
              : "Whether you have questions or you're ready to book a free trial class — fill out the form and we'll get back to you within 24 hours."}
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-14">
            {/* ── Left: Contact info ── */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-semibold text-base mb-5">
                  Contact information
                </h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-0.5">Phone</p>
                      <a
                        href="tel:+12095550123"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        (209) 555-0123
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-0.5">Email</p>
                      <a
                        href="mailto:info@lbmaa.com"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        info@lbmaa.com
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-0.5">Location</p>
                      <p className="text-sm text-muted-foreground">
                        1209 South 6th Street Suite E<br />
                        Los Banos, CA 93635
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Drop-ins welcome during class hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-0.5">Hours</p>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Mon–Fri: 3:00 – 8:30 PM</p>
                        <p>Saturday: 9:00 AM – 2:00 PM</p>
                        <p>Sunday: Closed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reassurance */}
              <div className="border-t pt-6 space-y-3">
                {[
                  'First class is free — no commitment',
                  'We respond within 24 hours',
                  "We're here to help, not to sell",
                ].map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Form ── */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-border rounded-xl p-8 shadow-sm">
                {submitted ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <CheckCircle2 className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      We got your message.
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                      We'll be in touch within 24 hours to answer your questions
                      and get your child scheduled for a free trial class.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {isTrialIntent && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg px-4 py-3 text-sm text-foreground">
                        You're booking a{' '}
                        <span className="font-semibold">free trial class</span>.
                        Fill in your details and we'll reach out to schedule it.
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="parentName">Your name *</Label>
                      <Input
                        id="parentName"
                        name="parentName"
                        placeholder="Maria Garcia"
                        value={formData.parentName}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="parentEmail">Email address *</Label>
                      <Input
                        id="parentEmail"
                        name="parentEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.parentEmail}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">
                        Phone number{' '}
                        <span className="text-muted-foreground font-normal">
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
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="studentName">
                          Child's name{' '}
                          <span className="text-muted-foreground font-normal">
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
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="studentAge">
                          Child's age{' '}
                          <span className="text-muted-foreground font-normal">
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
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message">
                        Questions or notes{' '}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Preferred schedule, any questions you have, or what you're hoping your child gets out of martial arts."
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

                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Sending...'
                        : isTrialIntent
                          ? 'Request Free Trial Class'
                          : 'Send Message'}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      * Required. We'll never share your information.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP ───────────────────────────────────────────── */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-5xl mx-auto overflow-hidden rounded-xl border">
            <iframe
              title="LBMAA Location"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=1209+South+6th+Street+Suite+E+Los+Banos+CA+93635`}
              width="100%"
              height="340"
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
