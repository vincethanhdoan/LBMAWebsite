import { SlotSettings } from './availability/SlotSettings'
import { BlockedDates } from './availability/BlockedDates'
import { NotificationRecipients } from './availability/NotificationRecipients'

export function AdminAvailabilitySettings() {
  return (
    <div className="space-y-6">
      <SlotSettings />
      <BlockedDates />
      <NotificationRecipients />
    </div>
  )
}
