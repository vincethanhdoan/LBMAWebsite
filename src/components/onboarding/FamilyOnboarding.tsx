// src/components/onboarding/FamilyOnboarding.tsx
import { useState } from 'react'
import type { Relationship } from '../../lib/types'
import { GuardianStep } from './GuardianStep'
import { ChildrenStep } from './ChildrenStep'
import { AddressStep } from './AddressStep'
import { AgreementStep } from './AgreementStep'
import { updateProfile, createFamily, createGuardian, createStudent } from '../../lib/supabase/mutations'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '../ui/button'

export type GuardianForm = {
  firstName: string
  lastName: string
  phone: string
  relationship: Relationship | ''
}

export type ChildForm = {
  id: string
  firstName: string
  lastName: string
  dob: string
}

export type AddressForm = {
  street: string
  city: string
  state: string
  zip: string
}

type User = {
  id: string
  email: string
  role: 'admin' | 'family'
  displayName: string
}

interface FamilyOnboardingProps {
  user: User
  onComplete: () => void | Promise<void>
  onLogout: () => Promise<void>
}

const PROGRESS: Record<0 | 1 | 2 | 3, number> = { 0: 8, 1: 33, 2: 66, 3: 90 }

export function FamilyOnboarding({ user, onComplete, onLogout }: FamilyOnboardingProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 'done'>(0)
  const [guardian, setGuardian] = useState<GuardianForm>({
    firstName: '', lastName: '', phone: '', relationship: '',
  })
  const [children, setChildren] = useState<ChildForm[]>([
    { id: crypto.randomUUID(), firstName: '', lastName: '', dob: '' },
  ])
  const [address, setAddress] = useState<AddressForm>({
    street: '', city: '', state: 'CA', zip: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedData, setSavedData] = useState<{
    guardianName: string
    childNames: string[]
    hasAddress: boolean
  } | null>(null)

  const progressPct = step === 'done' ? 100 : PROGRESS[step as 0 | 1 | 2 | 3]

  async function handleSubmit(skipAddress: boolean) {
    setSubmitting(true)
    setError(null)
    try {
      const fullName = `${guardian.firstName.trim()} ${guardian.lastName.trim()}`

      await updateProfile(user.id, { display_name: fullName })

      const addrFields: { address: string | null; city: string | null; state: string | null; zip: string | null } = skipAddress
        ? { address: null, city: null, state: null, zip: null }
        : {
            address: address.street.trim() || null,
            city: address.city.trim() || null,
            state: address.state.trim() || null,
            zip: address.zip.trim() || null,
          }

      const family = await createFamily({
        owner_user_id: user.id,
        primary_email: user.email,
        ...addrFields,
      })

      await createGuardian({
        family_id: family.family_id,
        first_name: guardian.firstName.trim(),
        last_name: guardian.lastName.trim(),
        email: user.email,
        phone_number: guardian.phone.trim(),
        relationship: guardian.relationship || null,
        is_primary_contact: true,
      })

      for (const child of children) {
        await createStudent({
          family_id: family.family_id,
          first_name: child.firstName.trim(),
          last_name: child.lastName.trim(),
          date_of_birth: child.dob,
          belt_level: null,
          status: 'active',
          notes: null,
          photo_url: null,
        })
      }

      setSavedData({
        guardianName: fullName,
        childNames: children.map(c => c.firstName.trim()),
        hasAddress: !skipAddress && !!(address.street.trim() || address.city.trim()),
      })
      setStep('done')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Brand header */}
      <div className="bg-foreground px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span
              className="text-primary-foreground text-xs font-bold leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LB
            </span>
          </div>
          <div>
            <p
              className="text-sm font-semibold text-primary-foreground leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LBMAA Family Portal
            </p>
            <p className="text-[11px] text-primary-foreground/40 leading-tight">
              Los Banos Martial Arts Academy
            </p>
          </div>
        </div>
        <button
          className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
          onClick={() => void onLogout()}
        >
          Sign out
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-muted w-full">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Step area */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {step === 0 && (
            <AgreementStep onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <GuardianStep
              email={user.email}
              values={guardian}
              onChange={updates => setGuardian(g => ({ ...g, ...updates }))}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ChildrenStep
              values={children}
              onChange={setChildren}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <AddressStep
              values={address}
              onChange={updates => setAddress(a => ({ ...a, ...updates }))}
              onFinish={() => void handleSubmit(false)}
              onSkip={() => void handleSubmit(true)}
              onBack={() => setStep(2)}
              submitting={submitting}
              error={error}
            />
          )}
          {step === 'done' && savedData && (
            <div className="text-center">
              <div className="mx-auto mb-5 w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Welcome to the family!
              </h2>
              <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
                Your profile is set up. You can update any details from your dashboard.
              </p>

              <div className="bg-muted rounded-xl p-4 text-left mb-7 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Guardian</span>
                  <span className="font-medium">{savedData.guardianName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Children</span>
                  <span className="font-medium">{savedData.childNames.join(', ')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Address</span>
                  <span className={savedData.hasAddress ? 'font-medium' : 'text-muted-foreground'}>
                    {savedData.hasAddress ? 'Saved' : 'Not added yet'}
                  </span>
                </div>
              </div>

              <Button type="button" className="w-full" onClick={() => void onComplete()}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
