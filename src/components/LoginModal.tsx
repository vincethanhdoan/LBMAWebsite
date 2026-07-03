import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Mail, Lock, AlertCircle } from 'lucide-react';
import { supabase, checkEmailHasAccountWithTimeout } from '../lib/supabase/client';
import { Alert, AlertDescription } from './ui/alert';

type LoginModalProps = {
  onClose: () => void;
};

export function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const RPC_TIMEOUT_MS = 15000;
      const { data: hasAccount, error: checkError } = await checkEmailHasAccountWithTimeout(normalizedEmail, RPC_TIMEOUT_MS);

      if (checkError) {
        const isTimeout = checkError.message?.includes('timed out');
        setError(
          isTimeout
            ? 'Verification is taking too long. Please check your connection and try again. If this continues, the server may need the Supabase migration that adds account verification.'
            : 'Unable to verify account. Please try again.'
        );
        setLoading(false);
        return;
      }

      if (!hasAccount) {
        setError(
          'No account found for this email. Only enrolled families can sign in. Please contact the academy to get set up.'
        );
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        setEmailSent(true);
        setLoading(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <CardHeader className="text-center">
          <img src="/logo.png" alt="LBMAA Logo" className="mx-auto mb-4 h-16 w-auto" />
          <CardTitle className="text-2xl">Member Portal Login</CardTitle>
          <CardDescription>
            Enter your email to receive a secure login link. Only enrolled families and staff can sign in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {emailSent ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Check Your Email</h3>
              <p className="text-muted-foreground mb-6">
                We've sent a secure login link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Click the link in your email to sign in. The link will expire in 1 hour.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  maxLength={254}
                  autoFocus
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>

              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>No password needed!</strong> We'll send you a secure link to access your account. New to the academy? Contact us to get an account set up.
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
