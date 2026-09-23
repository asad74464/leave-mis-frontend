import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-display text-6xl font-medium text-primary">404</p>
      <p className="mt-3 text-sm text-muted-foreground">This page isn't in the register.</p>
      <Button asChild variant="accent" className="mt-6">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
