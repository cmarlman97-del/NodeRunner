import * as React from "react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getFollowUpDate, formatAbsoluteDate } from "@/lib/utils";

type Props = {
  label?: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
};

export function FollowUpPicker({ label = "Due date", value, onChange }: Props) {
  const [followUpOption, setFollowUpOption] = useState<string>('3-business-days');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Initialize with 3 business days default if no value
  React.useEffect(() => {
    if (!value) {
      const defaultDate = getFollowUpDate('3-business-days');
      onChange(defaultDate);
    }
  }, [value, onChange]);

  const currentDate = value || getFollowUpDate('3-business-days');

  const getDisplayLabel = () => {
    const absDate = formatAbsoluteDate(currentDate, 
      followUpOption === '1-business-day' || followUpOption === '3-business-days');
    
    if (followUpOption === 'today') {
      return `Follow-up today (${absDate})`;
    } else if (followUpOption === 'tomorrow') {
      return `Follow-up tomorrow (${absDate})`;
    } else if (followUpOption === 'custom') {
      return `Follow-up – ${absDate}`;
    } else {
      const presetLabels: Record<string, string> = {
        '1-business-day': '1 business day',
        '3-business-days': '3 business days',
        '1-week': '1 week',
        '2-weeks': '2 weeks',
        '1-month': '1 month',
        '3-months': '3 months',
        '6-months': '6 months'
      };
      const presetLabel = presetLabels[followUpOption] || followUpOption;
      return `Follow-up in ${presetLabel} (${absDate})`;
    }
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
              setFollowUpOption('3-business-days');
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
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            onClick={() => setShowCustomDate(true)}
          >
            {getDisplayLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-2">
            {[
              { value: 'today', label: 'Today' },
              { value: 'tomorrow', label: 'Tomorrow' },
              { value: '1-business-day', label: '1 business day' },
              { value: '3-business-days', label: '3 business days' },
              { value: '1-week', label: '1 week' },
              { value: '2-weeks', label: '2 weeks' },
              { value: '1-month', label: '1 month' },
              { value: '3-months', label: '3 months' },
              { value: '6-months', label: '6 months' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                onClick={() => {
                  setFollowUpOption(option.value);
                  onChange(getFollowUpDate(option.value));
                  setShowCustomDate(false);
                }}
              >
                {option.label}
              </button>
            ))}
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
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        onChange(date);
                        setFollowUpOption('custom');
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
    </div>
  );
}
