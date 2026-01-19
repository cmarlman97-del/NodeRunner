const __TRACE_CALLS__ = true;
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callsKey, generateLocalCallId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { CallModal } from "./CallModal";
import { CallItem } from "./CallItem";
import { useToast } from "@/components/ui/use-toast";
import type { CallRow, CallCreate } from "@shared/schema";

interface CallsPanelProps {
  contactId: string;
}

type CallWithAuthor = Omit<CallRow, 'occurredAt' | 'createdAt'> & {
  occurredAt: string | null;
  createdAt: string;
  authorName: string;
  authorId: string;
  _optimistic?: boolean;
};

export function CallsPanel({ contactId }: CallsPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<CallWithAuthor | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch calls (local-only, no network)
  const {
    data: callsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: callsKey(contactId),
    queryFn: async () => {
      // Return empty data structure for local-only mode
      return { items: [] };
    },
    enabled: !!contactId, // Only run query when we have a contactId
  });

  // Create call mutation with local-only updates (no network)
  const createCall = useMutation({
    mutationFn: async (data: CallCreate) => {
      console.log('[DEBUG] createCall mutation called with data:', data);
      
      // Local-only: simulate successful creation without network call
      const now = new Date().toISOString();
      const newCall: CallWithAuthor = {
        id: generateLocalCallId(),
        contactId: data.contactId,
        summary: data.summary || null,
        transcript: data.transcript || null,
        occurredAt: data.occurredAt || now,
        createdAt: now,
        authorId: 'current-user',
        authorName: 'You',
      };
      
      console.log('[DEBUG] Created local call:', newCall);
      return newCall;
    },
    onMutate: async (newCall) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: callsKey(contactId) });

      // Snapshot the previous value
      const previousCalls = queryClient.getQueryData<{ items: CallWithAuthor[] }>(callsKey(contactId));

      // Optimistically update the cache
      const now = new Date().toISOString();
      const optimisticCall: CallWithAuthor = {
        id: generateLocalCallId(),
        contactId: newCall.contactId,
        summary: newCall.summary || null,
        transcript: newCall.transcript || null,
        occurredAt: newCall.occurredAt || now,
        createdAt: now,
        authorId: 'current-user',
        authorName: 'You',
        _optimistic: true,
      };

      const updatedCalls = {
        items: [optimisticCall, ...(previousCalls?.items || [])],
      };

      queryClient.setQueryData(callsKey(contactId), updatedCalls);

      return { previousCalls };
    },
    onError: (error, variables, context) => {
      console.error('[ERROR] Error in createCall mutation:', error);
      
      // Rollback on error
      if (context?.previousCalls) {
        queryClient.setQueryData(callsKey(contactId), context.previousCalls);
      }
      
      toast({
        title: 'Failed to save call',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // No need to refetch in local-only mode
      // queryClient.invalidateQueries({ queryKey: callsKey(contactId) });
    },
  });

  // Update call mutation (cache-only)
  const updateCall = useMutation({
    mutationFn: async (data: { id: string; summary?: string | null; transcript?: string | null; occurredAt?: string | null }) => {
      return data;
    },
    onMutate: async (updatedCall) => {
      await queryClient.cancelQueries({ queryKey: callsKey(contactId) });
      const previousCalls = queryClient.getQueryData<{ items: CallWithAuthor[] }>(callsKey(contactId));

      if (previousCalls) {
        queryClient.setQueryData(callsKey(contactId), {
          ...previousCalls,
          items: previousCalls.items.map(call =>
            call.id === updatedCall.id
              ? { ...call, ...updatedCall }
              : call
          ),
        });
      }

      return { previousCalls };
    },
    onError: (error, variables, context) => {
      if (context?.previousCalls) {
        queryClient.setQueryData(callsKey(contactId), context.previousCalls);
      }
      toast({
        title: 'Failed to update call',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Call updated',
        description: 'Your call has been updated successfully.',
      });
    },
  });

  // Delete call mutation (cache-only)
  const deleteCall = useMutation({
    mutationFn: async (callId: string) => {
      return callId;
    },
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
    onError: (error, variables, context) => {
      if (context?.previousCalls) {
        queryClient.setQueryData(callsKey(contactId), context.previousCalls);
      }
      toast({
        title: 'Failed to delete call',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Call deleted',
        description: 'Your call has been deleted successfully.',
      });
    },
  });

  const calls: CallWithAuthor[] = callsData?.items || [];

  // Group calls by month
  const groupedCalls = Object.entries(
    calls.reduce<Record<string, CallWithAuthor[]>>((acc, call) => {
      const date = call.occurredAt 
        ? new Date(call.occurredAt) 
        : new Date(call.createdAt);
      const monthYear = format(date, 'MMMM yyyy');
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      // Ensure the call has all required fields
      const callWithAuthor: CallWithAuthor = {
        ...call,
        occurredAt: call.occurredAt,
        createdAt: call.createdAt,
        authorName: call.authorName || 'Unknown',
        authorId: (call as any).authorId || 'unknown',
      };
      acc[monthYear].push(callWithAuthor);
      return acc;
    }, {})
  ).sort(([a], [b]) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return isNaN(dateB.getTime()) ? -1 : isNaN(dateA.getTime()) ? 1 : dateB.getTime() - dateA.getTime();
  });

  const handleCreateCall = async (data: Omit<CallCreate, 'contactId'>) => {
    try {
      console.log('[DEBUG] handleCreateCall called with data:', data);
      
      // Ensure all required fields are present
      const callData: CallCreate = {
        summary: data.summary ?? null,
        transcript: data.transcript,
        occurredAt: data.occurredAt ?? new Date().toISOString(),
        createTask: data.createTask ?? false,
        contactId,
      };
      
      console.log('[DEBUG] Creating call with data:', callData);
      
      // The mutation will handle the API call and cache updates
      await createCall.mutateAsync(callData);
      
      // Close the modal on success
      setIsModalOpen(false);
      
      // Show success toast (error is handled by the mutation's onError)
      toast({
        title: 'Call saved',
        description: 'Your call has been saved successfully.',
      });
    } catch (error) {
      // This should only be reached if there's an error in this function,
      // not for API errors (which are handled by the mutation's onError)
      console.error('[ERROR] Unexpected error in handleCreateCall:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving the call.',
        variant: 'destructive',
      });
      // Re-throw to be handled by the form
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Log Call button */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="text-lg font-semibold">Calls</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="cta"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Log Call
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorAlert
          message={`Failed to load calls: ${error instanceof Error ? error.message : 'Unknown error'}`}
          onRetry={() => refetch()}
          isRetrying={isLoading}
        />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)] overscroll-contain pr-2 -mr-2">
        {/* Loading state */}
        {isLoading && <LoadingSpinner />}

        {/* No calls yet */}
        {!isLoading && !isError && calls.length === 0 && (
          <EmptyState description="No calls logged yet. Click 'Log Call' to create one." />
        )}

        {/* Calls list */}
        {!isLoading && !isError && calls.length > 0 && (
          <div className="space-y-8 pb-4">
            {groupedCalls.map(([monthYear, monthCalls]) => (
              <div key={monthYear} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">{monthYear}</h3>
                <div className="space-y-4">
                  {(monthCalls as CallWithAuthor[]).map((call) => {
                    // Create a new object with the correct types for CallItem
                    const callForItem = {
                      ...call,
                      occurredAt: call.occurredAt ? new Date(call.occurredAt) : null,
                      createdAt: new Date(call.createdAt),
                      // Ensure authorName is always a string
                      authorName: call.authorName || 'Unknown',
                    } as unknown as CallRow; // Cast to CallRow since we've ensured the types match
                    
                    return (
                      <CallItem 
                        key={call.id} 
                        call={callForItem} 
                        onEdit={() => {
                          setEditingCall(call);
                          setIsModalOpen(true);
                        }} 
                        onDelete={() => deleteCall.mutate(call.id)} 
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCall(null);
          // Reset any mutation errors when closing
          if (createCall.error) {
            createCall.reset();
          }
          if (updateCall.error) {
            updateCall.reset();
          }
        }}
        onSubmit={async (data) => {
          try {
            if (editingCall) {
              // Edit mode: update existing call
              await updateCall.mutateAsync({
                id: editingCall.id,
                summary: data.summary ?? null,
                transcript: data.transcript ?? null,
                occurredAt: data.occurredAt ?? null,
              });
              setIsModalOpen(false);
              setEditingCall(null);
            } else {
              // Create mode: create new call
              await handleCreateCall(data);
            }
          } catch (error) {
            if (__TRACE_CALLS__) console.error('[P4] Error in onSubmit handler:', error);
            throw error; // Re-throw to let CallModal handle the error
          }
        }}
        contactId={contactId}
        isSubmitting={createCall.isPending || updateCall.isPending}
        initialCall={editingCall}
      />
    </div>
  );
}
