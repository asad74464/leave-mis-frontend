import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left: the one deliberate hero moment - ink panel, serif display line */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <ScrollText className="h-6 w-6 text-accent" strokeWidth={1.75} />
          <span className="font-display text-lg">Leave MIS</span>
        </div>

        <div className="max-w-md">
          <p className="font-display text-4xl font-medium leading-[1.15] text-primary-foreground">
            Every leave request, recorded and reviewed in one register.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
            Built for ministry and enterprise teams to file, confirm, and track leave without the
            back-and-forth of email threads and paper forms.
          </p>
        </div>

        <p className="text-xs text-primary-foreground/40">Leave Management Information System</p>
      </div>

      {/* Right: the form, on paper */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <ScrollText className="h-6 w-6 text-accent" strokeWidth={1.75} />
            <span className="font-display text-lg text-foreground">Leave MIS</span>
          </div>

          <h1 className="font-display text-2xl font-medium text-foreground">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your credentials to reach your dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ministry.gov.af"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="rounded-md border-l-2 border-l-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="accent" size="lg" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
