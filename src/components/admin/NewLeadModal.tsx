import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Loader2, X, Plus } from 'lucide-react'
import { createEnrollmentLead } from '../../lib/supabase/mutations'
import { edgeFunctionUserAuthHeaders, supabase } from '../../lib/supabase/client'
import type { EnrollmentLead } from '../../lib/types'
import { PickDateModal } from './PickDateModal'

type PostAction = 'send_link' | 'pick_date' | 'create_only'

interface NewLeadModalProps {
  onSuccess: (lead: EnrollmentLead) => void
  onCancel: () => void
}

export function NewLeadModal({ onSuccess, onCancel }: NewLeadModalProps) {
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [children, setChildren] = useState<Array<{ name: string; age: string }>>([{ name: '', age: '' }])
  const [notes, setNotes] = useState('')
  const [postAction, setPostAction] = useState<PostAction>('send_link')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ parentName?: string; parentEmail?: string; children?: string }>({})
  const [createdLead, setCreatedLead] = useState<EnrollmentLead | null>(null)

  function addChild() {
    setChildren(prev => [...prev, { name: '', age: '' }])
  }
  function removeChild(i: number) {
    setChildren(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateChild(i: number, field: 'name' | 'age', value: string) {
    setChildren(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function validate() {
    const errs: { parentName?: string; parentEmail?: string; children?: string } = {}
    if (!parentName.trim()) errs.parentName = 'Required'
    if (!parentEmail.trim()) errs.parentEmail = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) errs.parentEmail = 'Invalid email'
    for (const c of children) {
      const age = Number(c.age)
      if (!c.name.trim() || !c.age) { errs.children = 'Each child requires a name and age.'; break }
      if (!Number.isInteger(age) || age < 4 || age > 17) { errs.children = 'Child ages must be between 4 and 17.'; break }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const leadId = await createEnrollmentLead({
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        children: children.map(c => ({ name: c.name.trim(), age: Number(c.age) })),
      })

      const { data: leadData } = await supabase
        .from('enrollment_leads')
        .select('*')
        .eq('lead_id', leadId)
        .single()

      if (!leadData) {
        toast.error('Lead created but could not be fetched')
        setLoading(false)
        return
      }

      if (postAction === 'send_link') {
        const fnHeaders = await edgeFunctionUserAuthHeaders()
        if (!fnHeaders) {
          toast.error('Session expired. Lead was created; sign in again to send the invite.')
        } else {
          const { error: approveError } = await supabase.functions.invoke('approve-enrollment-lead', {
            body: { leadId },
            headers: fnHeaders,
          })
          if (approveError) {
            toast.error('Lead created but booking link failed to send')
          }
        }
        onSuccess(leadData as EnrollmentLead)
      } else if (postAction === 'create_only') {
        onSuccess(leadData as EnrollmentLead)
      } else if (postAction === 'pick_date') {
        setCreatedLead(leadData as EnrollmentLead)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handlePickDateConfirm(bookings: Array<{ programBookingId: string; slotId: string; appointmentDate: string }>) {
    const fnHeaders = await edgeFunctionUserAuthHeaders()
    if (!fnHeaders) throw new Error('Session expired. Please sign in again.')
    for (const b of bookings) {
      const { error: bookError } = await supabase.functions.invoke('admin-book-appointment', {
        body: { programBookingId: b.programBookingId, slotId: b.slotId, appointmentDate: b.appointmentDate },
        headers: fnHeaders,
      })
      if (bookError) throw bookError
    }
    if (!createdLead) return
    const { data: updatedLead } = await supabase
      .from('enrollment_leads')
      .select('*')
      .eq('lead_id', createdLead.lead_id)
      .single()
    if (!updatedLead) throw new Error('Lead not found after booking')
    onSuccess(updatedLead as EnrollmentLead)
  }

  const ctaLabel = loading
    ? undefined
    : postAction === 'send_link' ? 'Create & Send Link'
    : postAction === 'pick_date' ? 'Create & Pick Date'
    : 'Create Lead'

  if (createdLead) {
    return (
      <PickDateModal
        lead={createdLead}
        onConfirm={handlePickDateConfirm}
        onCancel={onCancel}
      />
    )
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New enrollment lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nl-parent-name">Parent name *</Label>
              <Input id="nl-parent-name" value={parentName} onChange={e => setParentName(e.target.value)} onBlur={validate} className="mt-1" />
              {errors.parentName && <p className="text-xs text-destructive mt-1">{errors.parentName}</p>}
            </div>
            <div>
              <Label htmlFor="nl-email">Email *</Label>
              <Input id="nl-email" type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} onBlur={validate} className="mt-1" />
              {errors.parentEmail && <p className="text-xs text-destructive mt-1">{errors.parentEmail}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="nl-phone">Phone</Label>
            <Input id="nl-phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" />
          </div>
          {/* Children */}
          <div className="flex flex-col gap-2">
            <Label>Children <span className="text-destructive">*</span></Label>
            {children.map((child, i) => {
              const age = Number(child.age)
              const progLabel = child.age
                ? (age >= 4 && age <= 7 ? { text: 'Little Dragons · 4–7', color: '#6d28d9' }
                  : age >= 8 && age <= 17 ? { text: 'Youth Program · 8–17', color: '#1d4ed8' }
                  : { text: 'Age must be 4–17', color: '#dc2626' })
                : null
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Name" value={child.name} onChange={e => updateChild(i,'name',e.target.value)} disabled={loading} required className="flex-1 h-9 text-sm" />
                    <Input type="number" min={4} max={17} placeholder="Age" value={child.age} onChange={e => updateChild(i,'age',e.target.value)} disabled={loading} required className="w-16 h-9 text-sm" />
                    {children.length > 1 && (
                      <button type="button" onClick={() => removeChild(i)} disabled={loading}
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#fee2e2', color: '#ef4444' }}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {progLabel && <p className="text-xs font-medium pl-0.5" style={{ color: progLabel.color }}>{progLabel.text}</p>}
                </div>
              )
            })}
            <button type="button" onClick={addChild} disabled={loading}
              className="flex items-center gap-1 text-xs text-primary self-start hover:opacity-70">
              <Plus className="w-3 h-3" /> Add another child
            </button>
            {errors.children && <p className="text-xs text-destructive">{errors.children}</p>}
          </div>
          <div>
            <Label htmlFor="nl-notes">Notes</Label>
            <Textarea id="nl-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1" />
          </div>
          <div>
            <Label>After creating</Label>
            <div className="flex gap-2 mt-1.5">
              {(['send_link', 'pick_date', 'create_only'] as PostAction[]).map(action => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setPostAction(action)}
                  className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                    postAction === action
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {action === 'send_link' ? 'Send Booking Link' : action === 'pick_date' ? 'Pick Date for Them' : 'Create Only'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
