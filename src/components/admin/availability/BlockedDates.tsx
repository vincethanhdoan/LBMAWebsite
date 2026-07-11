import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase/client'
import { getBlockedDates } from '../../../lib/supabase/queries'
import type { BlockedDate } from '../../../lib/types'

function blockDateLabel(block: BlockedDate): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return block.start_date === block.end_date
    ? fmt(block.start_date)
    : `${fmt(block.start_date)} – ${fmt(block.end_date)}`
}

export function BlockedDates() {
  const [blocks, setBlocks] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)

  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockStartDate, setBlockStartDate] = useState('')
  const [blockEndDate, setBlockEndDate] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)

  const loadBlocks = useCallback(async () => {
    setBlocks(await getBlockedDates())
  }, [])

  useEffect(() => {
    async function load() {
      await loadBlocks()
      setLoading(false)
    }
    load()
  }, [loadBlocks])

  async function addBlock() {
    setBlockSaving(true)
    try {
      const { data, error } = await supabase.rpc('add_blocked_dates', {
        p_start_date: blockStartDate,
        p_end_date: blockEndDate || null,
        p_reason: blockReason || null,
      })
      if (error || !data) { toast.error('Failed to block dates'); return }
      await loadBlocks()
      setBlockStartDate('')
      setBlockEndDate('')
      setBlockReason('')
      setShowBlockForm(false)
    } finally {
      setBlockSaving(false)
    }
  }

  async function removeBlock(blockId: string) {
    const { error } = await supabase.rpc('remove_blocked_dates', { p_block_id: blockId })
    if (error) { toast.error('Failed to remove blocked dates'); return }
    await loadBlocks()
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base">Blocked Dates</h3>
        <Button size="sm" variant="outline" onClick={() => setShowBlockForm(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />Block Dates
        </Button>
      </div>
      <div className="space-y-1.5">
        {blocks.map(b => (
          <div key={b.block_id} className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded border text-sm">
            <div>
              <span className="font-medium">{blockDateLabel(b)}</span>
              {b.reason && <span className="text-muted-foreground ml-2">— {b.reason}</span>}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeBlock(b.block_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        {blocks.length === 0 && <p className="text-sm text-muted-foreground">No blocked dates.</p>}
      </div>
      {showBlockForm && (
        <div className="mt-3 p-4 rounded border bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={blockStartDate} onChange={e => setBlockStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>To (optional)</Label>
              <Input type="date" value={blockEndDate} onChange={e => setBlockEndDate(e.target.value)} min={blockStartDate || undefined} className="mt-1" />
            </div>
          </div>
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
    </div>
  )
}
