import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { NotebookPen, ListChecks, PhoneCall } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { tasksKey, callsKey } from "@/lib/utils";
import { createTasksService } from "@/lib/tasksService";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoteItem } from "./NoteItem";
import { TaskItem } from "./TaskItem";
import { CallItem } from "./CallItem";
import { NoteModal } from "./NoteModal";
import { CallModal } from "./CallModal";
import { TaskModal } from "./TaskModal";
import { useToast } from "@/components/ui/use-toast";
import type { Note, CallRow, NoteCreate, CallCreate } from "@shared/schema";
import type { TaskItemModel } from "./TaskItem";
import type { TaskCreateLocal } from "./TaskModal";

interface ActivityPanelProps {
  contactId: string;
}

// Unified activity type
type ActivityItem = {
  id: string;
  type: 'note' | 'task' | 'call';
  title?: string | undefined;
  content?: string | undefined;
  occurredAt: Date | null;
  createdAt: Date;
  authorName: string;
  authorId?: string | undefined;
  originalData: Note | TaskItemModel | CallRow;
  _optimistic?: boolean | undefined;
};

// Type definitions matching existing panels
type NoteWithAuthor = Omit<Note, 'occurredAt' | 'createdAt' | 'updatedAt'> & {
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorId: string;
  _optimistic?: boolean;
};

type TaskWithAuthor = TaskItemModel & {
  _optimistic?: boolean;
};

type CallWithAuthor = Omit<CallRow, 'occurredAt' | 'createdAt'> & {
  occurredAt: string | null;
  createdAt: string;
  authorName: string;
  authorId?: string;
  _optimistic?: boolean;
};

export function ActivityPanel({ contactId }: ActivityPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tasksService = createTasksService(queryClient);

  // Modal states for each type
  const [editingNote, setEditingNote] = useState<NoteWithAuthor | null>(null);
  const [editingCall, setEditingCall] = useState<CallWithAuthor | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItemModel | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch notes
  const {
    data: notesData,
    isLoading: notesLoading,
    isError: notesError,
  } = useQuery({
    queryKey: ['notes', contactId],
    queryFn: async () => {
      const response = await apiRequest(`/api/contacts/${contactId}/notes`);
      return (response as any)?.items || [];
    },
    enabled: !!contactId,
  });

  // Fetch tasks (local-only)
  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery({
    queryKey: tasksKey(contactId),
    queryFn: async () => {
      return { items: [] as TaskWithAuthor[] };
    },
    enabled: !!contactId,
  });

  // Fetch calls (local-only)
  const {
    data: callsData,
    isLoading: callsLoading,
    isError: callsError,
  } = useQuery({
    queryKey: callsKey(contactId),
    queryFn: async () => {
      return { items: [] };
    },
    enabled: !!contactId,
  });

  // ============ MUTATIONS ============

  // Update note mutation (cache-only)
  const updateNote = useMutation({
    mutationFn: async (data: { id: string; title?: string | null; body: string; occurredAt?: string | null }) => data,
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes', contactId] });
      const previousNotes = queryClient.getQueryData<{ items: NoteWithAuthor[] }>(['notes', contactId]);
      if (previousNotes) {
        const now = new Date().toISOString();
        queryClient.setQueryData(['notes', contactId], {
          ...previousNotes,
          items: previousNotes.items.map(note =>
            note.id === updatedNote.id ? { ...note, ...updatedNote, updatedAt: now } : note
          ),
        });
      }
      return { previousNotes };
    },
    onError: (error, _, context) => {
      if (context?.previousNotes) queryClient.setQueryData(['notes', contactId], context.previousNotes);
      toast({ title: 'Failed to update note', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
    onSuccess: () => toast({ title: 'Note updated', description: 'Your note has been updated successfully.' }),
  });

  // Delete note mutation (cache-only)
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => noteId,
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes', contactId] });
      const previousNotes = queryClient.getQueryData<{ items: NoteWithAuthor[] }>(['notes', contactId]);
      if (previousNotes) {
        queryClient.setQueryData(['notes', contactId], {
          ...previousNotes,
          items: previousNotes.items.filter(note => note.id !== noteId),
        });
      }
      return { previousNotes };
    },
    onError: (error, _, context) => {
      if (context?.previousNotes) queryClient.setQueryData(['notes', contactId], context.previousNotes);
      toast({ title: 'Failed to delete note', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
    onSuccess: () => toast({ title: 'Note deleted', description: 'Your note has been deleted successfully.' }),
  });

  // Update call mutation (cache-only)
  const updateCall = useMutation({
    mutationFn: async (data: { id: string; summary?: string | null; transcript?: string | null; occurredAt?: string | null }) => data,
    onMutate: async (updatedCall) => {
      await queryClient.cancelQueries({ queryKey: callsKey(contactId) });
      const previousCalls = queryClient.getQueryData<{ items: CallWithAuthor[] }>(callsKey(contactId));
      if (previousCalls) {
        queryClient.setQueryData(callsKey(contactId), {
          ...previousCalls,
          items: previousCalls.items.map(call =>
            call.id === updatedCall.id ? { ...call, ...updatedCall } : call
          ),
        });
      }
      return { previousCalls };
    },
    onError: (error, _, context) => {
      if (context?.previousCalls) queryClient.setQueryData(callsKey(contactId), context.previousCalls);
      toast({ title: 'Failed to update call', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
    onSuccess: () => toast({ title: 'Call updated', description: 'Your call has been updated successfully.' }),
  });

  // Delete call mutation (cache-only)
  const deleteCall = useMutation({
    mutationFn: async (callId: string) => callId,
    onMutate: async (callId) => {
      await queryClient.cancelQueries({ queryKey: callsKey(contactId) });
      const previousCalls = queryClient.getQueryData<{ items: CallWithAuthor[] }>(callsKey(contactId));
      if (previousCalls) {
        queryClient.setQueryData(callsKey(contactId), {
          ...previousCalls,
          items: previousCalls.items.filter(call => call.id !== callId),
        });
      }
      return { previousCalls };
    },
    onError: (error, _, context) => {
      if (context?.previousCalls) queryClient.setQueryData(callsKey(contactId), context.previousCalls);
      toast({ title: 'Failed to delete call', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
    onSuccess: () => toast({ title: 'Call deleted', description: 'Your call has been deleted successfully.' }),
  });

  // ============ END MUTATIONS ============

  // Aggregate and sort all activities
  const activities = useMemo(() => {
    const allActivities: ActivityItem[] = [];

    // Add notes - notesData is {items: NoteWithAuthor[]} not an array
    const notes: NoteWithAuthor[] = notesData?.items || [];
    if (notes.length > 0) {
      notes.forEach((note) => {
        allActivities.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title || undefined,
          content: note.body || undefined,
          occurredAt: note.occurredAt ? new Date(note.occurredAt) : null,
          createdAt: new Date(note.createdAt),
          authorName: note.authorName || 'Unknown',
          authorId: note.authorId || undefined,
          originalData: {
            ...note,
            occurredAt: note.occurredAt ? new Date(note.occurredAt) : null,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
            authorName: note.authorName || 'Unknown',
          } as Note,
          _optimistic: note._optimistic || undefined,
        });
      });
    }

    // Add tasks
    if (tasksData?.items) {
      (tasksData.items as TaskWithAuthor[]).forEach((task) => {
        allActivities.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          content: task.description || undefined,
          occurredAt: task.dueAt ? new Date(task.dueAt) : null,
          createdAt: new Date(task.createdAt),
          authorName: task.authorName || 'Unknown',
          authorId: undefined, // TaskItemModel doesn't have authorId
          originalData: task,
          _optimistic: task._optimistic || undefined,
        });
      });
    }

    // Add calls
    if (callsData?.items) {
      (callsData.items as CallWithAuthor[]).forEach((call) => {
        allActivities.push({
          id: `call-${call.id}`,
          type: 'call',
          title: 'Call',
          content: call.summary || call.transcript || undefined,
          occurredAt: call.occurredAt ? new Date(call.occurredAt) : null,
          createdAt: new Date(call.createdAt),
          authorName: call.authorName || 'Unknown',
          authorId: call.authorId || undefined,
          originalData: {
            ...call,
            occurredAt: call.occurredAt ? new Date(call.occurredAt) : null,
            createdAt: new Date(call.createdAt),
            authorName: call.authorName || 'Unknown',
          } as CallRow,
          _optimistic: call._optimistic || undefined,
        });
      });
    }

    // Sort by newest first (occurredAt if available, otherwise createdAt)
    return allActivities.sort((a, b) => {
      const dateA = a.occurredAt || a.createdAt;
      const dateB = b.occurredAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [notesData, tasksData, callsData]);

  // Group activities by month/year for display
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    
    activities.forEach((activity) => {
      const date = activity.occurredAt || activity.createdAt;
      const monthYear = format(date, 'MMMM yyyy');
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(activity);
    });

    return Object.entries(groups).sort(([a], [b]) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [activities]);

  const isLoading = notesLoading || tasksLoading || callsLoading;
  const isError = notesError || tasksError || callsError;

  // Render activity item with type indicator
  const renderActivityItem = (activity: ActivityItem) => {
    const TypeIcon = activity.type === 'note' ? NotebookPen : 
                    activity.type === 'task' ? ListChecks : PhoneCall;
    
    const typeColor = activity.type === 'note' ? 'text-blue-600' :
                     activity.type === 'task' ? 'text-green-600' : 'text-purple-600';

    // Get the raw ID without the type prefix
    const rawId = activity.id.replace(/^(note|task|call)-/, '');

    return (
      <div key={activity.id} className="relative border-b border-gray-200 dark:border-gray-800 pb-4 last:border-0">
        {/* Type indicator */}
        <div className={`absolute -left-1 top-2 ${typeColor}`}>
          <TypeIcon className="h-3 w-3" />
        </div>
        
        {/* Activity content */}
        <div className="ml-4">
          {activity.type === 'note' && (
            <NoteItem 
              note={activity.originalData as Note}
              onEdit={() => {
                // Find the original note data from cache
                const notesCache = queryClient.getQueryData<{ items: NoteWithAuthor[] }>(['notes', contactId]);
                const noteData = notesCache?.items.find(n => n.id === rawId);
                if (noteData) {
                  setEditingNote(noteData);
                  setIsNoteModalOpen(true);
                }
              }} 
              onDelete={() => deleteNote.mutate(rawId)} 
            />
          )}
          {activity.type === 'task' && (
            <TaskItem 
              task={activity.originalData as TaskItemModel}
              onEdit={() => {
                setEditingTask(activity.originalData as TaskItemModel);
                setIsTaskModalOpen(true);
              }} 
              onDelete={() => tasksService.delete(rawId)} 
            />
          )}
          {activity.type === 'call' && (
            <CallItem 
              call={activity.originalData as CallRow}
              onEdit={() => {
                // Find the original call data from cache
                const callsCache = queryClient.getQueryData<{ items: CallWithAuthor[] }>(callsKey(contactId));
                const callData = callsCache?.items.find(c => c.id === rawId);
                if (callData) {
                  setEditingCall(callData);
                  setIsCallModalOpen(true);
                }
              }} 
              onDelete={() => deleteCall.mutate(rawId)} 
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Error state */}
      {isError && (
        <ErrorAlert message="Failed to load activity data. Please try refreshing the page." />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)] overscroll-contain pr-2 -mr-2">
        {/* Loading state */}
        {isLoading && <LoadingSpinner />}

        {/* No activity yet */}
        {!isLoading && !isError && activities.length === 0 && (
          <EmptyState description="No activity yet. Notes, tasks, and calls will appear here." />
        )}

        {/* Activity list */}
        {!isLoading && !isError && activities.length > 0 && (
          <div className="space-y-8 pb-4">
            {groupedActivities.map(([monthYear, monthActivities]) => (
              <div key={monthYear} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">{monthYear}</h3>
                <div className="space-y-4">
                  {monthActivities.map(renderActivityItem)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Modal for editing */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={async (data: NoteCreate) => {
          if (editingNote) {
            await updateNote.mutateAsync({
              id: editingNote.id,
              title: data.title ?? null,
              body: data.body,
              occurredAt: data.occurredAt ?? null,
            });
            setIsNoteModalOpen(false);
            setEditingNote(null);
          }
        }}
        contactId={contactId}
        isSubmitting={updateNote.isPending}
        initialNote={editingNote}
      />

      {/* Call Modal for editing */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setEditingCall(null);
        }}
        onSubmit={async (data: CallCreate) => {
          if (editingCall) {
            await updateCall.mutateAsync({
              id: editingCall.id,
              summary: data.summary ?? null,
              transcript: data.transcript ?? null,
              occurredAt: data.occurredAt ?? null,
            });
            setIsCallModalOpen(false);
            setEditingCall(null);
          }
        }}
        contactId={contactId}
        isSubmitting={updateCall.isPending}
        initialCall={editingCall}
      />

      {/* Task Modal for editing */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (data: TaskCreateLocal) => {
          if (editingTask) {
            await tasksService.update({
              id: editingTask.id,
              title: data.title,
              notes: data.description ?? null,
              dueAt: data.dueAt ?? null,
              status: data.status ?? editingTask.status,
            });
            setIsTaskModalOpen(false);
            setEditingTask(null);
            toast({ title: 'Task updated', description: 'Your task has been updated successfully.' });
          }
        }}
        contactId={contactId}
        isSubmitting={false}
        initialTask={editingTask}
      />
    </div>
  );
}
