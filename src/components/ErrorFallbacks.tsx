import type React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

export function RootErrorFallback(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
        <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          The page ran into an unexpected problem. Reloading usually fixes it.
          If it keeps happening, please let us know.
        </p>
        <Button onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
    </div>
  );
}

export function TabErrorFallback(reset: () => void): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-md text-center">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-3" />
        <h2 className="font-semibold mb-2">This section could not be shown</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Something went wrong loading this view. You can try again, or switch
          to another section in the menu.
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
