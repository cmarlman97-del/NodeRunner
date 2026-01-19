import { useState, useEffect, useRef } from "react";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Modal } from "@/components/ui/Modal";
import { Loader2 } from "lucide-react";
import { getFollowUpDate, formatAbsoluteDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  dueAt: z.string().datetime().nullish(),
  contactId: z.string().min(1, "Contact ID is required"),
});

export type TaskCreateLocal = z.infer<typeof formSchema> & {
  status?: 'open' | 'done';
};

// Type for task being edited
type EditableTask = {
  id: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  status?: 'open' | 'done';
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskCreateLocal) => Promise<void>;
  contactId: string;
  isSubmitting?: boolean;
  initialTask?: EditableTask | null;
}

export function TaskModal({ isOpen, onClose, onSubmit, contactId, isSubmitting = false, initialTask = null }: TaskModalProps) {
  const isEditMode = !!initialTask;
  const { toast } = useToast();
  const [followUpOption, setFollowUpOption] = useState<string>('3-business-days');
  const [dueDate, setDueDate] = useState<Date | null>(() => getFollowUpDate('3-business-days'));
  const [dueTime, setDueTime] = useState<string>('8:00 AM');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskCreateLocal>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueAt: new Date().toISOString(),
      contactId,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        // Edit mode: pre-fill with existing task data
        reset({
          title: initialTask.title || "",
          description: initialTask.description || "",
          dueAt: initialTask.dueAt || new Date().toISOString(),
          contactId,
        });
        // Set due date from initialTask if available
        if (initialTask.dueAt) {
          const taskDueDate = new Date(initialTask.dueAt);
          setDueDate(taskDueDate);
          setFollowUpOption('custom');
          // Extract time from the date
          const hours = taskDueDate.getHours();
          const minutes = taskDueDate.getMinutes();
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          const displayMinutes = minutes === 30 ? '30' : '00';
          setDueTime(`${displayHours}:${displayMinutes} ${period}`);
        } else {
          setFollowUpOption('3-business-days');
          setDueDate(getFollowUpDate('3-business-days'));
          setDueTime('8:00 AM');
        }
      } else {
        // Create mode: empty form
        reset({
          title: "",
          description: "",
          dueAt: new Date().toISOString(),
          contactId,
        });
        setFollowUpOption('3-business-days');
        setDueDate(getFollowUpDate('3-business-days'));
        setDueTime('8:00 AM');
      }
      setSubmitError(null);
    }
  }, [isOpen, reset, contactId, initialTask]);

  // Helper to convert 12-hour format to 24-hour (copied from TaskCreateDrawer)
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

  const handleFormSubmit = async (formData: TaskCreateLocal) => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSaving(true);
    try {
      // Combine date + time for dueAt (same logic as TaskCreateDrawer)
      let combinedDueAt: Date | null = null;
      if (dueDate) {
        combinedDueAt = new Date(dueDate);
        const { hours, minutes } = parseTime12Hour(dueTime);
        combinedDueAt.setHours(hours, minutes, 0, 0);
      }

      const submission: TaskCreateLocal = {
        title: formData.title,
        description: formData.description ?? null,
        dueAt: combinedDueAt ? combinedDueAt.toISOString() : null,
        status: 'open',
        contactId,
      };
      await onSubmit(submission);
      reset();
      onClose();
      toast({ title: 'Task saved', description: 'Your task has been saved successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save task';
      setSubmitError(message);
      toast({ title: 'Error saving task', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) {
      onClose();
    }
  };

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      title={isEditMode ? "Edit Task" : "Add Task"}
      size="xl"
      showCloseButton={!isSaving}
    >
      <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(handleFormSubmit)(e).catch(() => {});
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
                {submitError}
              </div>
            )}

            <div>
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="Task title" disabled={isSaving} {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any details for this task..."
                className="min-h-[100px]"
                disabled={isSaving}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{String(errors.description.message)}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">Due</span>
              <span className="text-sm text-muted-foreground">•</span>
              <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
                <PopoverTrigger asChild>
                  <button type="button" className="text-sm text-blue-600 hover:text-blue-800 underline" onClick={() => setShowCustomDate(true)}>
                    {(() => {
                      const absDate = formatAbsoluteDate(dueDate || new Date(), 
                        followUpOption === '1-business-day' || followUpOption === '3-business-days');
                      if (followUpOption === 'today') return `Due today (${absDate})`;
                      if (followUpOption === 'tomorrow') return `Due tomorrow (${absDate})`;
                      if (followUpOption === 'custom') return `Due – ${absDate}`;
                      const presetLabels: Record<string, string> = {
                        '1-business-day': '1 business day',
                        '3-business-days': '3 business days',
                        '1-week': '1 week',
                        '2-weeks': '2 weeks',
                        '1-month': '1 month',
                        '3-months': '3 months',
                        '6-months': '6 months',
                      };
                      const presetLabel = presetLabels[followUpOption] || followUpOption;
                      return `Due in ${presetLabel} (${absDate})`;
                    })()}
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
                          const d = getFollowUpDate(option.value);
                          setDueDate(d);
                          // Reset time to default when setting date for first time, preserve when changing
                          if (!dueDate && d) {
                            setDueTime('8:00 AM');
                          }
                          setShowCustomDate(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                    <div className="border-t pt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded">
                            Custom...
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate || undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Reset time to default when setting date for first time, preserve when changing
                                if (!dueDate) {
                                  setDueTime('8:00 AM');
                                }
                                setDueDate(date);
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
              
              {/* Time control - show inline when date is selected */}
              {dueDate && (
                <select
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-24"
                  aria-label="Time"
                  disabled={isSaving}
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
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString()}
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isSubmitting} className="min-w-[100px]">
                {(isSaving || isSubmitting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update Task' : 'Save Task'
                )}
              </Button>
            </div>
          </div>
        </form>
    </Modal>
  );
}
