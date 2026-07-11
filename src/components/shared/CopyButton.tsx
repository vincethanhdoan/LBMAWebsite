import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Small ghost icon button that copies `value` to the clipboard, swapping to a
 * check for 2s on success and surfacing a toast when copying is unavailable
 * (e.g. non-secure contexts) or fails.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!navigator.clipboard) {
      toast.error("Couldn't copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
