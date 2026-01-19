import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FollowUpPicker } from "@/components/shared/FollowUpPicker";
import { ReminderPicker } from "@/components/shared/ReminderPicker";

export type TaskCreateInput = {
  title: string;
  contactId?: string | null;
  dueAt?: string | null; // ISO date string or yyyy-mm-dd
  notes?: string | null;
  remindAt?: string | null;
};

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  contactId: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
});

export type ContactLite = { id: string; name: string; phone?: string | null; company?: string | null; email?: string | null };

interface TaskCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: TaskCreateInput) => Promise<void> | void;
  contacts?: ContactLite[];
}

export function TaskCreateDrawer({ open, onOpenChange, onCreate, contacts }: TaskCreateDrawerProps) {
  // Combobox input + debounce state
  const [contactInput, setContactInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  // Local pickers state
  const [dueAtDate, setDueAtDate] = useState<Date | null>(null);
  const [dueAtTime, setDueAtTime] = useState<string>("8:00 AM");
  const [remindAtDate, setRemindAtDate] = useState<Date | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(contactInput), 180);
    return () => clearTimeout(t);
  }, [contactInput]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<TaskCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
    mode: "onChange",
  });

  // Filter by name only; prefix matches first, then substring, then alpha
  const filteredContacts = useMemo(() => {
    const list = contacts ?? [];
    const q = searchDebounced.trim().toLowerCase();
    if (q.length < 1) return [];
    const matches = list.filter((c) => (c.name ?? "").toLowerCase().includes(q));
    const starts = matches.filter((c) => (c.name ?? "").toLowerCase().startsWith(q));
    const subs = matches.filter((c) => !(c.name ?? "").toLowerCase().startsWith(q));
    starts.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    subs.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return [...starts, ...subs];
  }, [contacts, searchDebounced]);

  // Keep input display in sync if contactId changes
  const selectedContactId = watch("contactId") ?? null;
  useEffect(() => {
    if (!contacts) return;
    if (!selectedContactId) {
      // do not override user typing if they are typing
      return;
    }
    const found = contacts.find((c) => c.id === selectedContactId);
    if (found) setContactInput(found.name ?? "");
  }, [selectedContactId, contacts]);

  // Helper to convert 12-hour format to 24-hour
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

  const submit = async (values: TaskCreateInput) => {
    // Combine date + time for dueAt
    let combinedDueAt: Date | null = null;
    if (dueAtDate) {
      combinedDueAt = new Date(dueAtDate);
      const { hours, minutes } = parseTime12Hour(dueAtTime);
      combinedDueAt.setHours(hours, minutes, 0, 0);
    }

    const payload: TaskCreateInput = {
      title: values.title.trim(),
      contactId: values.contactId ?? null,
      dueAt: combinedDueAt ? combinedDueAt.toISOString() : null,
      notes: values.notes?.trim() ? values.notes : null,
      remindAt: remindAtDate ? remindAtDate.toISOString() : null,
    };
    await Promise.resolve(onCreate(payload));
    reset();
    setDueAtDate(null);
    setDueAtTime("8:00 AM");
    setRemindAtDate(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full">
        <SheetHeader className="mb-4">
          <SheetTitle>Create Task</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(submit)(e).catch(() => {});
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="title">Title<span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="Task title" {...register("title")} />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label>Associate Contact (optional)</Label>
            <div className="mt-1 relative">
              <div className="relative">
                <input
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls="contact-combobox-listbox"
                  aria-autocomplete="list"
                  className="w-full border rounded-md px-3 py-2 pr-8"
                  placeholder="Search contacts…"
                  value={contactInput}
                  onChange={(e) => {
                    setContactInput(e.target.value);
                    setListOpen(e.target.value.length >= 1);
                    setActiveIndex(-1);
                    // when typing, clear selection so submit uses typed search selection
                    if (!e.target.value) setValue("contactId", null);
                  }}
                  onFocus={() => {
                    // do not open on focus; only open after typing >=1 char
                    if (contactInput.length >= 1) setListOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!listOpen && contactInput.length >= 1) setListOpen(true);
                    if (!listOpen) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveIndex((prev) => Math.min(prev + 1, filteredContacts.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveIndex((prev) => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter") {
                      if (activeIndex >= 0 && activeIndex < filteredContacts.length) {
                        const c = filteredContacts[activeIndex];
                        if (!c) return;
                        setValue("contactId", c.id);
                        setContactInput(c.name ?? "");
                        setListOpen(false);
                        setActiveIndex(-1);
                      }
                    } else if (e.key === "Escape") {
                      setListOpen(false);
                    }
                  }}
                />
                {(contactInput || selectedContactId) && (
                  <button
                    type="button"
                    aria-label="Clear selection"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setContactInput("");
                      setValue("contactId", null);
                      setListOpen(false);
                      setActiveIndex(-1);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {listOpen && filteredContacts.length === 0 && contactInput && (
                <div
                  id="contact-combobox-listbox"
                  role="listbox"
                  className="absolute z-50 mt-1 w-full border rounded-md bg-background shadow max-h-28 overflow-auto"
                >
                  <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                </div>
              )}
              {listOpen && filteredContacts.length > 0 && (
                <div
                  id="contact-combobox-listbox"
                  role="listbox"
                  className="absolute z-50 mt-1 w-full border rounded-md bg-background shadow max-h-28 overflow-auto"
                >
                  {filteredContacts.map((c, idx) => (
                    <div
                      key={c.id}
                      role="option"
                      aria-selected={selectedContactId === c.id}
                      className={`px-3 py-2 text-sm cursor-pointer ${idx === activeIndex ? "bg-muted" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => {
                        // prevent input blur before click selection
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setValue("contactId", c.id);
                        setContactInput(c.name ?? "");
                        setListOpen(false);
                        setActiveIndex(-1);
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FollowUpPicker label="Due date" value={dueAtDate} onChange={(d) => {
                  setDueAtDate(d);
                  // Clear relative reminder if due date removed
                  if (!d) {
                    setRemindAtDate(null);
                    setDueAtTime("8:00 AM"); // Reset time when date cleared
                  }
                }} />
              </div>
              {dueAtDate && (
                <div className="flex flex-col">
                  <Label htmlFor="dueTime" className="sr-only">Time</Label>
                  <select
                    id="dueTime"
                    value={dueAtTime}
                    onChange={(e) => setDueAtTime(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-24"
                    aria-label="Time"
                  >
                    {[
                      "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
                      "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
                      "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
                      "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                      "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
                      "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
                      "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
                      "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
                    ].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <ReminderPicker 
              label="Reminder" 
              dueAt={dueAtDate} 
              dueAtTime={dueAtTime}
              value={remindAtDate} 
              onChange={setRemindAtDate} 
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={4} placeholder="Add details..." {...register("notes")} />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Create Task
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
