const __TRACE_NOTES__ = true;
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoteModal } from "./NoteModal";
import { NoteItem } from "./NoteItem";
import { useToast } from "@/components/ui/use-toast";
import type { Note, NoteCreate } from "@shared/schema";

interface NotesPanelProps {
  contactId: string;
}

type NoteWithAuthor = Omit<Note, 'occurredAt' | 'createdAt' | 'updatedAt' | 'authorName'> & {
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorId: string;
  _optimistic?: boolean;
};

export function NotesPanel({ contactId }: NotesPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteWithAuthor | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notes
  const {
    data: notesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notes", contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`GET notes failed: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON, got ${contentType} — sample: ${text.slice(0, 80)}`);
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!contactId, // Only run query when we have a contactId
  });

  // Create note mutation with optimistic updates
  const createNote = useMutation({
    mutationFn: async (data: NoteCreate) => {
      console.log('[DEBUG] createNote mutation called with data:', data);
      
      const url = `/api/contacts/${data.contactId}/notes`;
      const payload = {
        title: data.title || null,
        body: data.body,
        occurredAt: data.occurredAt || new Date().toISOString(),
        createTask: data.createTask ?? false,
      };
      
      console.log('[DEBUG] Sending POST request to:', url);
      console.log('[DEBUG] Request payload:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      const responseContentType = response.headers.get('content-type') || '';
      console.log(`[DEBUG] Response status: ${response.status}, Content-Type: ${responseContentType}`);

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error('[ERROR] Create note failed:', { status: response.status, errorMessage });
        throw new Error(errorMessage);
      }

      if (!responseContentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response, got ${responseContentType}. Response: ${text}`);
      }

      return response.json();
    },
    onMutate: async (newNote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes', contactId] });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<{ items: NoteWithAuthor[] }>(['notes', contactId]);

      // Optimistically update the cache
      if (previousNotes) {
        const now = new Date().toISOString();
        const optimisticNote: NoteWithAuthor = {
          id: `temp-${Date.now()}`,
          contactId: newNote.contactId,
          title: newNote.title ?? null,
          body: newNote.body,
          occurredAt: newNote.occurredAt || now,
          createdAt: now,
          updatedAt: now,
          authorId: 'current-user',
          authorName: 'You',
          _optimistic: true,
        };

        queryClient.setQueryData(['notes', contactId], {
          ...previousNotes,
          items: [optimisticNote, ...previousNotes.items],
        });
      }

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      console.error('[ERROR] Error in createNote mutation:', error);
      
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', contactId], context.previousNotes);
      }
      
      toast({
        title: 'Failed to save note',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['notes', contactId] });
    },
  });

  // Update note mutation (cache-only for now)
  const updateNote = useMutation({
    mutationFn: async (data: { id: string; title?: string | null; body: string; occurredAt?: string | null }) => {
      // Cache-only update - no API call until backend supports it
      return data;
    },
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes', contactId] });
      const previousNotes = queryClient.getQueryData<{ items: NoteWithAuthor[] }>(['notes', contactId]);

      if (previousNotes) {
        const now = new Date().toISOString();
        queryClient.setQueryData(['notes', contactId], {
          ...previousNotes,
          items: previousNotes.items.map(note =>
            note.id === updatedNote.id
              ? { ...note, ...updatedNote, updatedAt: now }
              : note
          ),
        });
      }

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', contactId], context.previousNotes);
      }
      toast({
        title: 'Failed to update note',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Note updated',
        description: 'Your note has been updated successfully.',
      });
    },
  });

  // Delete note mutation (cache-only for now)
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      // Cache-only delete - no API call until backend supports it
      return noteId;
    },
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
    onError: (error, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', contactId], context.previousNotes);
      }
      toast({
        title: 'Failed to delete note',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      });
    },
  });

  const notes: NoteWithAuthor[] = notesData?.items || [];

  // Group notes by month
  const groupedNotes = Object.entries(
    notes.reduce<Record<string, NoteWithAuthor[]>>((acc, note) => {
      const date = note.occurredAt 
        ? new Date(note.occurredAt) 
        : new Date(note.createdAt);
      const monthYear = format(date, 'MMMM yyyy');
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      // Ensure the note has all required fields
      const noteWithAuthor: NoteWithAuthor = {
        ...note,
        occurredAt: note.occurredAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        authorName: note.authorName || 'Unknown',
        authorId: (note as any).authorId || 'unknown',
      };
      acc[monthYear].push(noteWithAuthor);
      return acc;
    }, {})
  ).sort(([a], [b]) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return isNaN(dateB.getTime()) ? -1 : isNaN(dateA.getTime()) ? 1 : dateB.getTime() - dateA.getTime();
  });

  const handleCreateNote = async (data: Omit<NoteCreate, 'contactId'>) => {
    try {
      console.log('[DEBUG] handleCreateNote called with data:', data);
      
      // Ensure all required fields are present
      const noteData: NoteCreate = {
        title: data.title ?? null,
        body: data.body,
        occurredAt: data.occurredAt ?? new Date().toISOString(),
        createTask: data.createTask ?? false,
        contactId,
      };
      
      console.log('[DEBUG] Creating note with data:', noteData);
      
      // The mutation will handle the API call and cache updates
      await createNote.mutateAsync(noteData);
      
      // Close the modal on success
      setIsModalOpen(false);
      
      // Show success toast (error is handled by the mutation's onError)
      toast({
        title: 'Note saved',
        description: 'Your note has been saved successfully.',
      });
    } catch (error) {
      // This should only be reached if there's an error in this function,
      // not for API errors (which are handled by the mutation's onError)
      console.error('[ERROR] Unexpected error in handleCreateNote:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving the note.',
        variant: 'destructive',
      });
      // Re-throw to be handled by the form
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add Note button */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="text-lg font-semibold">Notes</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="cta"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorAlert
          message={`Failed to load notes: ${error instanceof Error ? error.message : 'Unknown error'}`}
          onRetry={() => refetch()}
          isRetrying={isLoading}
        />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)] overscroll-contain pr-2 -mr-2">
        {/* Loading state */}
        {isLoading && <LoadingSpinner />}

        {/* No notes yet */}
        {!isLoading && !isError && notes.length === 0 && (
          <EmptyState description="No notes yet. Click 'Add Note' to create one." />
        )}

        {/* Notes list */}
        {!isLoading && !isError && notes.length > 0 && (
          <div className="space-y-8 pb-4">
            {groupedNotes.map(([monthYear, monthNotes]) => (
              <div key={monthYear} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">{monthYear}</h3>
                <div className="space-y-4">
                  {(monthNotes as NoteWithAuthor[]).map((note) => {
                    // Create a new object with the correct types for NoteItem
                    const noteForItem = {
                      ...note,
                      occurredAt: note.occurredAt ? new Date(note.occurredAt) : null,
                      createdAt: new Date(note.createdAt),
                      updatedAt: new Date(note.updatedAt),
                      // Ensure authorName is always a string
                      authorName: note.authorName || 'Unknown',
                    } as unknown as Note; // Cast to Note since we've ensured the types match
                    
                    return (
                      <NoteItem 
                        key={note.id} 
                        note={noteForItem} 
                        onEdit={() => {
                          setEditingNote(note);
                          setIsModalOpen(true);
                        }} 
                        onDelete={() => deleteNote.mutate(note.id)} 
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
          // Reset any mutation errors when closing
          if (createNote.error) {
            createNote.reset();
          }
          if (updateNote.error) {
            updateNote.reset();
          }
        }}
        onSubmit={async (data) => {
          try {
            if (editingNote) {
              // Edit mode: update existing note
              await updateNote.mutateAsync({
                id: editingNote.id,
                title: data.title ?? null,
                body: data.body,
                occurredAt: data.occurredAt ?? null,
              });
              setIsModalOpen(false);
              setEditingNote(null);
            } else {
              // Create mode: create new note
              await handleCreateNote(data);
            }
          } catch (error) {
            if (__TRACE_NOTES__) console.error('[P4] Error in onSubmit handler:', error);
            throw error; // Re-throw to let NoteModal handle the error
          }
        }}
        contactId={contactId}
        isSubmitting={createNote.isPending || updateNote.isPending}
        initialNote={editingNote}
      />
    </div>
  );
}
