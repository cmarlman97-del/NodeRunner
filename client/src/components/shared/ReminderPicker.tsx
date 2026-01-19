import * as React from "react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatAbsoluteDate } from "@/lib/utils";

type Props = {
  label?: string;
  dueAt: Date | null;
  dueAtTime?: string; // time in HH:mm format
  value: Date | null; // absolute remindAt or null
  onChange: (d: Date | null) => void;
};

export function ReminderPicker({ label = "Reminder", dueAt, dueAtTime = "8:00 AM", value, onChange }: Props) {
  const [reminderOption, setReminderOption] = useState<string>('none');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const disabled = !dueAt;

  // Helper to parse 12-hour format time
  const parseTime12Hour = (timeStr: string): { hours: number; minutes: number } => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match || match.length < 4) return { hours: 8, minutes: 0 }; // fallback
    
    let hours = parseInt(match[1] || "8", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const period = (match[3] || "AM").toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return { hours, minutes };
  };

  const setRelative = (minutesBefore: number, optionKey: string) => {
    if (!dueAt) return;
    const d = new Date(dueAt);
    // Apply the selected time from dueAtTime (12-hour format)
    const { hours, minutes } = parseTime12Hour(dueAtTime);
    d.setHours(hours, minutes, 0, 0);
    // Then subtract the reminder offset
    d.setMinutes(d.getMinutes() - minutesBefore);
    onChange(d);
    setReminderOption(optionKey);
  };

  const getDisplayLabel = () => {
    if (!value) return "No reminder";
    
    if (reminderOption === 'custom') {
      const absDate = formatAbsoluteDate(value, true);
      return `Reminder – ${absDate}`;
    }
    
    const reminderLabels: Record<string, string> = {
      'at-time': 'at task time',
      '30-min': '30 min before',
      '1-day': '1 day before', 
      '1-week': '1 week before'
    };
    
    const label = reminderLabels[reminderOption];
    if (label) {
      return `Reminder ${label}`;
    }
    
    return value.toLocaleString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {value && (
          <button 
            type="button" 
            className="text-xs text-muted-foreground hover:underline" 
            onClick={() => {
              onChange(null);
              setReminderOption('none');
            }}
          >
            Clear
          </button>
        )}
      </div>
      
      <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`text-sm underline ${disabled ? 'text-muted-foreground cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
            onClick={() => !disabled && setShowCustomDate(true)}
            disabled={disabled}
          >
            {disabled ? "Set due date first" : getDisplayLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-2">
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
              onClick={() => {
                onChange(null);
                setReminderOption('none');
                setShowCustomDate(false);
              }}
            >
              No reminder
            </button>
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
              onClick={() => {
                setRelative(0, 'at-time');
                setShowCustomDate(false);
              }}
              disabled={disabled}
            >
              At task time
            </button>
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
              onClick={() => {
                setRelative(30, '30-min');
                setShowCustomDate(false);
              }}
              disabled={disabled}
            >
              30 min before
            </button>
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
              onClick={() => {
                setRelative(60 * 24, '1-day');
                setShowCustomDate(false);
              }}
              disabled={disabled}
            >
              1 day before
            </button>
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
              onClick={() => {
                setRelative(60 * 24 * 7, '1-week');
                setShowCustomDate(false);
              }}
              disabled={disabled}
            >
              1 week before
            </button>
            <div className="border-t pt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                  >
                    Custom...
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={value || undefined}
                    onSelect={(date) => {
                      if (date) {
                        onChange(date);
                        setReminderOption('custom');
                        setShowCustomDate(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {disabled && (
        <div className="text-xs text-muted-foreground">Set a due date first to use relative reminders</div>
      )}
    </div>
  );
}
