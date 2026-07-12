import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import type { EnrollmentLead } from '../../lib/types';

const DEFAULT_MESSAGE =
  'Thank you for your interest in LBMAA. After careful consideration, we are unable to accommodate your enrollment inquiry at this time. We wish your family the best.';

interface DenyModalProps {
  lead: EnrollmentLead;
  onConfirm: (leadId: string, message: string) => Promise<void>;
  onCancel: () => void;
}

export function DenyModal({ lead, onConfirm, onCancel }: DenyModalProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty = message !== DEFAULT_MESSAGE;

  async function handleSend() {
    setLoading(true);
    try {
      await onConfirm(lead.lead_id, message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onCancel();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deny enrollment for {lead.parent_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="denial-message">Message to applicant</Label>
            <Textarea
              id="denial-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length} characters
            </p>
          </div>
          {confirmDiscard && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive mb-2">
                Discard changes?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={onCancel}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Keep editing
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              'Send Denial'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
