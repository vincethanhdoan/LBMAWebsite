import { useState } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase/client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog'
import { SectionHeader, Surface } from '../leads/ui'
import type { BlockedDate } from '../../../lib/types'
import { blockDateLabel } from './blockDisplay'

interface BlockedDatesProps {
  blocks: BlockedDate[]
  loading: boolean
  onRefetch: () => Promise<void>
}

export function BlockedDates({ blocks, loading, onRefetch }: BlockedDatesProps) {
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockStartDate, setBlockStartDate] = useState('')
  const [blockEndDate, setBlockEndDate] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [removeBlockTarget, setRemoveBlockTarget] = useState<string | null>(null)

  async function addBlock() {
    setBlockSaving(true)
    try {
      const { data, error } = await supabase.rpc('add_blocked_dates', {
        p_start_date: blockStartDate,
        p_end_date: blockEndDate || null,
        p_reason: blockReason || null,
      })
      if (error || !data) { toast.error('Failed to block dates'); return }
      try {
        await onRefetch()
      } catch {
        toast.error('Saved, but the list failed to refresh')
      }
      setBlockStartDate('')
      setBlockEndDate('')
      setBlockReason('')
      setShowBlockForm(false)
      toast.success('Dates blocked')
    } finally {
      setBlockSaving(false)
    }
  }

  async function removeBlock(blockId: string) {
    const { error } = await supabase.rpc('remove_blocked_dates', { p_block_id: blockId })
    if (error) {
      toast.error('Failed to remove blocked dates')
    } else {
      try {
        await onRefetch()
      } catch {
        toast.error('Saved, but the list failed to refresh')
      }
      toast.success('Block removed')
    }
    setRemoveBlockTarget(null)
  }

  return (
    <section>
      <SectionHeader
        title="Blocked dates"
        action={
          <Button size="sm" variant="outline" onClick={() => setShowBlockForm(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />Block dates
          </Button>
        }
      />
      <p className="text-[13px] text-muted-foreground mb-3">No bookings on these days. Existing appointments are not cancelled.</p>
      <Surface>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : blocks.length === 0 ? (
          <p className="text-[13px] text-muted-foreground px-4 py-3">No blocked dates.</p>
        ) : (
          blocks.map(b => (
            <div key={b.block_id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
              <span className="text-[13px] font-semibold flex-shrink-0">{blockDateLabel(b)}</span>
              <span className="flex-1 min-w-0 text-[13px] text-muted-foreground truncate">{b.reason || 'No bookings'}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0" onClick={() => setRemoveBlockTarget(b.block_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))
        )}
      </Surface>
      {showBlockForm && (
        <div className="mt-3 p-4 rounded border bg-muted/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={blockStartDate} onChange={e => setBlockStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>To (optional)</Label>
              <Input type="date" value={blockEndDate} onChange={e => setBlockEndDate(e.target.value)} min={blockStartDate || undefined} className="mt-1" />
            </div>
          </div>
          {!!blockEndDate && blockEndDate < blockStartDate && (
            <p className="text-sm text-destructive">End date must be on or after the start date.</p>
          )}
          <div>
            <Label>Reason (optional)</Label>
            <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} className="mt-1" placeholder="Holiday, closed, etc." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setShowBlockForm(false); setBlockStartDate(''); setBlockEndDate(''); setBlockReason('') }}>Cancel</Button>
            <Button size="sm" onClick={addBlock} disabled={blockSaving || !blockStartDate || (!!blockEndDate && blockEndDate < blockStartDate)}>
              {blockSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={removeBlockTarget !== null} onOpenChange={open => { if (!open) setRemoveBlockTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this block?</AlertDialogTitle>
            <AlertDialogDescription>
              Families will be able to book these dates again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removeBlockTarget) removeBlock(removeBlockTarget) }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
