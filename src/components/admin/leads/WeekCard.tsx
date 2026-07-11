import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeekDay } from './leadViews';
import { Surface } from './ui';
import { formatWeekRange, getWeekStart } from './leadDisplay';

export function WeekCard({
  days, weekOffset, onWeekOffsetChange, selectedDate, onSelectDate,
  totalKids, confirmedKids, unconfirmedKids, showTodayButton = false, children,
}: {
  days: WeekDay[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  totalKids: number;
  confirmedKids: number;
  unconfirmedKids: number;
  showTodayButton?: boolean;
  children?: ReactNode;
}) {
  return (
    <Surface>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[13px] text-muted-foreground">
            <span className="text-[15px] font-semibold text-foreground mr-1.5">
              {totalKids} {totalKids === 1 ? 'kid' : 'kids'}
            </span>
            {formatWeekRange(getWeekStart(weekOffset))}
            <span className="inline-flex items-center gap-1 ml-2.5 text-[11px]">
              <span className="w-2 h-2 rounded-sm bg-[#15803D]" />{confirmedKids} confirmed
            </span>
            <span className="inline-flex items-center gap-1 ml-2 text-[11px]">
              <span className="w-2 h-2 rounded-sm bg-[#D97706]" />{unconfirmedKids} not confirmed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {showTodayButton && weekOffset !== 0 && (
              <button
                onClick={() => { onWeekOffsetChange(0); onSelectDate(null); }}
                className="text-[11px] font-semibold border border-border rounded-md px-2 py-1 hover:bg-muted"
              >
                Today
              </button>
            )}
            <button
              aria-label="Previous week"
              onClick={() => { onWeekOffsetChange(weekOffset - 1); onSelectDate(null); }}
              className="w-7 h-7 border border-border rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              aria-label="Next week"
              onClick={() => { onWeekOffsetChange(weekOffset + 1); onSelectDate(null); }}
              className="w-7 h-7 border border-border rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {days.map(day => {
            const selected = selectedDate === day.dateKey;
            const hasKids = day.confirmedKids > 0 || day.unconfirmedKids > 0;
            return (
              <button
                key={day.dateKey}
                onClick={() => onSelectDate(selected ? null : day.dateKey)}
                className={`flex-1 min-w-0 rounded-lg border px-1 py-2 text-center transition-colors ${
                  selected
                    ? 'border-foreground bg-muted'
                    : day.isToday
                      ? 'border-primary/40 bg-[#FFF5F5]'
                      : hasKids
                        ? 'border-border bg-background hover:bg-muted/50'
                        : 'border-transparent hover:bg-muted/50'
                } ${day.isBlocked ? 'bg-[repeating-linear-gradient(-45deg,#F1F0EF_0_4px,transparent_4px_8px)]' : ''}`}
              >
                <div className={`text-[9px] font-bold tracking-widest ${day.isToday ? 'text-primary' : 'text-muted-foreground/70'}`}>
                  {day.dayName}
                </div>
                <div className={`text-[15px] font-semibold ${day.isBlocked ? 'line-through text-muted-foreground' : ''}`}>
                  {day.dayNum}
                </div>
                <div className="min-h-[16px] text-[11px] font-bold space-x-1">
                  {day.confirmedKids > 0 && (
                    <span className="inline-block rounded-full px-1.5 bg-[#F0FDF4] text-[#15803D]">{day.confirmedKids}</span>
                  )}
                  {day.unconfirmedKids > 0 && (
                    <span className="inline-block rounded-full px-1.5 bg-[#FEF3C7] text-[#92400E]">{day.unconfirmedKids}</span>
                  )}
                  {!hasKids && !day.isBlocked && <span className="text-muted-foreground/30 font-normal">—</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {children && <div className="border-t border-border">{children}</div>}
    </Surface>
  );
}
