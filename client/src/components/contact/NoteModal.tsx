const __TRACE_NOTES__ = true;
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// TODO: Consider migrating to use the shared Modal component in a future pass
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import { getFollowUpDate, formatAbsoluteDate } from "@/lib/utils";
import { createTasksService, type TaskCreateInput } from "@/lib/tasksService";
import { useToast } from "@/hooks/use-toast";
import type { NoteCreate } from "@shared/schema";
import type { Contact } from "@shared/schema";

// Define the form schema with explicit handling of optional fields
export const formSchema = z.object({
  title: z.string().min(1, "Title is required").nullish(), // Handles null | undefined
  body: z.string().min(1, "Note content is required"),
  occurredAt: z.string().datetime().nullish(), // Handles null | undefined
  createTask: z.boolean().default(false).optional(),
  contactId: z.string().min(1, "Contact ID is required"),
});
type FormData = z.infer<typeof formSchema>;

// Type for note being edited
type EditableNote = {
  id: string;
  title?: string | null;
  body: string;
  occurredAt?: string | Date | null;
};

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NoteCreate) => Promise<void>;
  contactId: string;
  isSubmitting?: boolean;
  initialNote?: EditableNote | null;
}

export function NoteModal({
  isOpen,
  onClose,
  onSubmit,
  contactId,
  isSubmitting = false,
  initialNote = null,
}: NoteModalProps) {
  const isEditMode = !!initialNote;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [occurredAt, setOccurredAt] = useState<Date | undefined>(new Date());
  const [followUpOption, setFollowUpOption] = useState<string>('3-business-days');
  const [dueDate, setDueDate] = useState<Date | null>(() => getFollowUpDate('3-business-days'));
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Create tasks service instance
  const tasksService = createTasksService(queryClient);
  
  // Get contact name for task title derivation
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => [],
    enabled: false, // Don't fetch, just read from cache
  });
  const contact = contacts?.find(c => c.id === contactId);
  const contactName = contact?.name || 'Contact';
  
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      body: "",
      occurredAt: new Date().toISOString(),
      createTask: false,
      contactId,
    },
    mode: 'onChange',
  });

  const resetForm = useCallback(() => {
    if (initialNote) {
      // Edit mode: pre-fill with existing note data
      const occurredAtStr = initialNote.occurredAt 
        ? (typeof initialNote.occurredAt === 'string' ? initialNote.occurredAt : initialNote.occurredAt.toISOString())
        : new Date().toISOString();
      reset({
        title: initialNote.title || "",
        body: initialNote.body || "",
        occurredAt: occurredAtStr,
        createTask: false,
        contactId,
      });
    } else {
      // Create mode: empty form
      reset({
        title: "",
        body: "",
        occurredAt: new Date().toISOString(),
        createTask: false,
        contactId,
      });
    }
  }, [contactId, reset, initialNote]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Helper to compute due date with 8:00 AM default time
  const computeDueAt = (dueDate: Date | null): string | null => {
    if (!dueDate) return null;
    
    // Set time to 8:00 AM (default)
    const dateWithTime = new Date(dueDate);
    dateWithTime.setHours(8, 0, 0, 0);
    return dateWithTime.toISOString();
  };
  
  // Helper to derive task title
  const deriveTaskTitle = (formData: FormData): string => {
    if (formData.title?.trim()) return formData.title.trim();
    return `Follow up: Note from ${contactName}`;
  };

  const handleFormSubmit = async (formData: FormData) => {
    console.log('[DEBUG] Form data received by handleFormSubmit:', formData);
    console.log('[DEBUG] createTask checkbox value:', formData.createTask);
    
    if (isSubmitting || isSaving) {
      console.log('[DEBUG] Form is already submitting, ignoring');
      return;
    }
    
    if (typeof onSubmit !== 'function') {
      const errorMsg = 'Save handler not connected';
      console.error('[NoteModal] Error:', errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitError(null);
    setIsSaving(true);
    
    try {
      // Prepare the data with proper types and ensure required fields are present
      const noteData: NoteCreate = {
        title: formData.title ?? null,
        body: formData.body,
        occurredAt: formData.occurredAt || new Date().toISOString(),
        createTask: formData.createTask ?? false,
        contactId,
      };
      
      console.log('[DEBUG] Submitting note with data:', noteData);
      
      // Validate against the schema
      const validatedData = formSchema.parse(noteData);
      
      // Ensure we're only passing the expected fields to onSubmit
      const submission: NoteCreate = {
        title: validatedData.title ?? null,
        body: validatedData.body,
        occurredAt: validatedData.occurredAt ?? null,
        createTask: validatedData.createTask ?? false,
        contactId,
      };
      
      // First, save the note
      await onSubmit(submission);
      console.log('[DEBUG] Note submitted successfully');
      
      // Then, create task if requested
      if (validatedData.createTask) {
        try {
          const taskInput: TaskCreateInput = {
            title: deriveTaskTitle(validatedData),
            notes: validatedData.body?.trim() || null,
            contactId: contactId,
            source: "note",
            status: "open",
            dueAt: computeDueAt(dueDate),
            remindAt: null,
          };
          
          await tasksService.create(taskInput);
          console.log('[DEBUG] Task created successfully from note');
          
          toast({
            title: "Task created",
            description: "Follow-up task has been created successfully.",
          });
        } catch (taskError) {
          console.error('[DEBUG] Error creating task from note:', taskError);
          // Don't fail the whole operation, just show a warning
          toast({
            title: "Note saved, but task creation failed",
            description: taskError instanceof Error ? taskError.message : "Failed to create follow-up task",
            variant: "destructive",
          });
        }
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error('[NoteModal] Error in form submission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save note';
      setSubmitError(errorMessage);
      toast({
        title: "Error saving note",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Log form reference on mount/update
  useEffect(() => {
    if (isOpen) {
      console.log('[DEBUG] Form ref:', formRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Note' : 'Add Note'}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSaving}
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form 
          ref={formRef}
          onSubmit={(e) => {
            console.log('[DEBUG] Form submit event triggered');
            e.preventDefault();
            handleSubmit(handleFormSubmit)(e).catch(error => {
              console.error('[DEBUG] Form submission error:', error);
            });
          }} 
          className="p-6 space-y-6"
        >
          <div className="space-y-4">
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
                {submitError}
              </div>
            )}
            
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Note title"
                disabled={isSaving}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="body">Note <span className="text-red-500">*</span></Label>
              <Textarea
                id="body"
                placeholder="Write your note here..."
                className="min-h-[120px]"
                disabled={isSaving}
                {...register("body", { required: 'Note is required' })}
              />
              {errors.body && (
                <p className="text-sm text-red-500 mt-1">{errors.body.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="createTask"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="createTask"
                    disabled={isSaving}
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="createTask" className="text-sm">
                Create as task
              </Label>
              <span className="text-sm text-muted-foreground">•</span>
              <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    onClick={() => setShowCustomDate(true)}
                  >
                    {(() => {
                      const absDate = formatAbsoluteDate(dueDate || new Date(), 
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
                          setDueDate(getFollowUpDate(option.value));
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
                            selected={dueDate || undefined}
                            onSelect={(date) => {
                              if (date) {
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
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString()}
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || isSubmitting}
                className="min-w-[100px]"
              >
                {(isSaving || isSubmitting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update Note' : 'Save Note'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
