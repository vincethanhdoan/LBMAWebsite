import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { EnrollmentLead } from '../../../lib/types';
import { formatGroupHeader } from './leadDisplay';

interface WeekStripDay {
  dateKey: string;
  dayName: string;
  dayNum: number;
  monthShort: string;
  count: number;
  isToday: boolean;
}

interface DateGroup {
  dateKey: string;
  leads: EnrollmentLead[];
}

interface LeadCalendarViewProps {
  dateGroups: DateGroup[];
  pastDateGroups: DateGroup[];
  pastAppointmentCount: number;
  showPastAppointments: boolean;
  onToggleShowPast: () => void;
  weekStripDays: WeekStripDay[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  selectedWeekDate: string | null;
  onSelectWeekDate: (dateKey: string | null) => void;
  weekRangeLabel: string;
  appointmentCountsByDate: Record<string, number>;
  renderCard: (lead: EnrollmentLead) => ReactNode;
  emptyMessage?: string | null;
}

export function LeadCalendarView({
  dateGroups,
  pastDateGroups,
  pastAppointmentCount,
  showPastAppointments,
  onToggleShowPast,
  weekStripDays,
  weekOffset,
  onWeekOffsetChange,
  selectedWeekDate,
  onSelectWeekDate,
  weekRangeLabel,
  renderCard,
  emptyMessage,
}: LeadCalendarViewProps) {
  function renderDateGroup({ dateKey, leads: groupLeads }: DateGroup) {
    if (!dateKey) {
      return (
        <div key="no-date">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">No date set</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-semibold">{groupLeads.length}</span>
          </div>
          <div className="space-y-2">{groupLeads.map(renderCard)}</div>
        </div>
      );
    }
    const { label, isToday, isTomorrow } = formatGroupHeader(dateKey);
    return (
      <div key={dateKey}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-bold tracking-wide uppercase ${isToday ? 'text-primary' : 'text-foreground/80'}`}>
            {label}
          </span>
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground tracking-wide uppercase">
              Today
            </span>
          )}
          {isTomorrow && (
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
              Tomorrow
            </span>
          )}
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">
            {groupLeads.length} {groupLeads.length === 1 ? 'appointment' : 'appointments'}
          </span>
        </div>
        <div className="space-y-2">{groupLeads.map(renderCard)}</div>
      </div>
    );
  }

  return (
    <>
      {/* Week strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { onWeekOffsetChange(weekOffset - 1); onSelectWeekDate(null); }}
            aria-label="Previous week"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground/80">
            {weekRangeLabel}
          </span>
          <button
            onClick={() => { onWeekOffsetChange(weekOffset + 1); onSelectWeekDate(null); }}
            aria-label="Next week"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1">
          {weekStripDays.map(day => {
            const isSelected = selectedWeekDate === day.dateKey;
            const hasApts = day.count > 0;
            return (
              <button
                key={day.dateKey}
                onClick={() => onSelectWeekDate(isSelected ? null : day.dateKey)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg flex-1 min-w-0 transition-colors border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : day.isToday
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <span className={`text-[10px] font-bold tracking-widest ${
                  isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
                }`}>
                  {day.dayName}
                </span>
                <span className={`text-lg font-bold leading-tight ${
                  isSelected ? 'text-primary-foreground' : day.isToday ? 'text-primary' : 'text-foreground'
                }`}>
                  {day.dayNum}
                </span>
                <div className="flex gap-0.5 mt-1 min-h-[6px] items-center">
                  {Array.from({ length: Math.min(day.count, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-primary-foreground/60' : 'bg-primary'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 ${
                  isSelected ? 'text-primary-foreground/75' : hasApts ? 'text-primary' : 'text-muted-foreground/35'
                }`}>
                  {hasApts ? day.count : '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date-grouped calendar view */}
      {emptyMessage != null ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {selectedWeekDate ? 'No appointments on this date.' : 'No appointments this week.'}
            </div>
          ) : (
            dateGroups.map(renderDateGroup)
          )}
          {pastAppointmentCount > 0 && (
            <div className="pt-2">
              <button
                onClick={onToggleShowPast}
                className="flex items-center gap-2 w-full text-left group"
              >
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${showPastAppointments ? '' : '-rotate-90'}`}
                />
                <span className="text-sm font-bold tracking-wide uppercase text-foreground/80">
                  Past appointments — needs follow-up
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">
                  {pastAppointmentCount}
                </span>
              </button>
              {showPastAppointments && (
                <div className="space-y-6 mt-4">
                  {pastDateGroups.map(renderDateGroup)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
