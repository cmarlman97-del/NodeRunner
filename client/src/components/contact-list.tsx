import { useState, useMemo, useCallback } from "react";
import type { Contact, ContactTypeItem } from "@shared/schema";
import { Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patchContact } from "@/lib/api/contacts";
import { useToast } from "@/hooks/use-toast";
import { EditableCell } from "@/components/ui/EditableCell";
import { US_STATES } from "@/constants/us-states";
import { DEFAULT_CONTACT_TYPES } from "@/constants/contact-types";
import { logTelemetryEvent } from "@/lib/telemetry";
import { Link } from "wouter";
import { SortableHeader } from "@/components/table/SortableHeader";
import { getComparator, toggleSort, type SortState, type SortKey } from "@/lib/sort-utils";
import { filterAndRank } from "@/lib/search";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  error: Error | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function ContactList({ contacts, isLoading, error, searchQuery = '', onSearchChange }: ContactListProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Contact } | null>(null);
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch contact types for the select dropdown
  const { data: contactTypes = [] } = useQuery<ContactTypeItem[]>({
    queryKey: ["/api/contact-types"],
  });

  // Mutation for updating contacts
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Contact> }) => 
      patchContact(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["contacts"] });
      
      // Snapshot the previous value
      const previousContacts = queryClient.getQueryData<Contact[]>(["contacts"]);
      
      // Optimistically update to the new value
      if (previousContacts) {
        const updatedContacts = previousContacts.map(contact => 
          contact.id === id ? { ...contact, ...updates } : contact
        );
        queryClient.setQueryData<Contact[]>(["contacts"], updatedContacts);
      }

      return { previousContacts };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContacts) {
        queryClient.setQueryData(["contacts"], context.previousContacts);
      }
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
      
      // Log telemetry for failed edit
      if (editingCell) {
        logTelemetryEvent({
          type: 'contact.inlineEdit.failed',
          contactId: variables.id,
          field: String(editingCell.field),
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      
      // Log telemetry for successful edit
      if (editingCell) {
        logTelemetryEvent({
          type: 'contact.inlineEdit.succeeded',
          contactId: variables.id,
          field: String(editingCell.field)
        });
      }
    },
    onSettled: () => {
      setEditingCell(null);
    },
  });

  // Handle field update
  const handleFieldUpdate = async (contactId: string, field: keyof Contact, value: string | null) => {
    try {
      await updateMutation.mutateAsync({ id: contactId, updates: { [field]: value } });
    } catch (error) {
      // Error handling is done in onError
      console.error("Error updating field:", error);
    }
  };

  // Handle cell click to start editing
  const handleCellClick = useCallback((contactId: string, field: keyof Contact) => {
    setEditingCell({ id: contactId, field });
    logTelemetryEvent({
      type: 'contact.inlineEdit.started',
      contactId,
      field: String(field)
    });
  }, []);

  // Handle cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Prefetch contact detail for snappier navigation
  const prefetchContact = useCallback((id: string) => () => {
    queryClient.prefetchQuery({
      queryKey: ["contact", id],
      queryFn: () => fetch(`/api/contacts/${id}`).then((r) => r.json()),
      staleTime: 10_000,
    });
  }, [queryClient]);

  // Memoize options for select fields to prevent recreation
  const stateOptions = useMemo(() => 
    US_STATES.map(state => ({ value: state.code, label: `${state.code} - ${state.name}` })),
    []
  );

  const contactTypeOptions = useMemo(() => 
    contactTypes.map(type => ({ value: type.label, label: type.label })),
    [contactTypes]
  );

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

  // Apply search filtering first, then sorting
  const processedContacts = useMemo(() => {
    const hasSearchQuery = debouncedSearchQuery.trim().length >= 3 || 
                          (debouncedSearchQuery.match(/\d/g) || []).length >= 3;
    
    // First apply search filtering with relevance ranking
    let filtered = filterAndRank(contacts, debouncedSearchQuery);
    
    // Handle sorting behavior:
    // - If no search query: apply column sort (or default name asc)
    // - If search query active and user clicked sort: apply column sort to filtered results
    // - If search query active and no user sort: use relevance ranking from filterAndRank
    
    if (!hasSearchQuery) {
      // No search - use column sorting or default
      if (sort) {
        filtered = [...contacts].sort(getComparator(sort.key, sort.dir));
      } else {
        // Default to name ascending when no search and no sort
        filtered = [...contacts].sort(getComparator('name', 'asc'));
      }
    } else if (sort) {
      // Search active + user clicked a sort header - override relevance with column sort
      filtered = [...filtered].sort(getComparator(sort.key, sort.dir));
    }
    // If search active and no sort override, filtered already has relevance ranking
    
    return filtered;
  }, [contacts, debouncedSearchQuery, sort]);

  // Handle sort toggle for a specific column
  const handleSortToggle = useCallback((key: SortKey) => {
    setSort(currentSort => toggleSort(currentSort, key));
  }, []);

  // Render editable cell content
  const renderEditableCell = useCallback((contact: Contact, field: keyof Contact) => {
    // Special handling for Name field - make it a link, not editable
    if (field === 'name') {
      return (
        <Link
          href={`/contacts/${contact.id}`}
          onMouseEnter={prefetchContact(contact.id)}
          className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          aria-label={`Open contact: ${contact.name}`}
          title={`Open ${contact.name}`}
        >
          {contact.name}
        </Link>
      );
    }

    const isEditing = editingCell?.id === contact.id && editingCell?.field === field;
    const value = contact[field] as string | null;
    
    if (isEditing) {
      // Determine cell type and options
      let cellType: 'text' | 'email' | 'phone' | 'select' = 'text';
      let options: Array<{ value: string; label: string }> = [];
      
      if (field === 'email') {
        cellType = 'email';
      } else if (field === 'phone') {
        cellType = 'phone';
      } else if (field === 'state') {
        cellType = 'select';
        options = stateOptions;
      } else if (field === 'contactType') {
        cellType = 'select';
        options = contactTypeOptions;
      }
      
      return (
        <EditableCell
          field={field as any}
          value={value}
          onSave={(newValue) => handleFieldUpdate(contact.id, field, newValue)}
          onCancel={handleCancelEdit}
          type={cellType}
          options={options}
          ariaLabel={`Edit ${field} for ${contact.name}`}
        />
      );
    }
    
    // Display mode - clickable to edit
    return (
      <div
        className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 min-h-[32px] flex items-center"
        onClick={() => handleCellClick(contact.id, field)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCellClick(contact.id, field);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Edit ${field} for ${contact.name}`}
      >
        {value || "—"}
      </div>
    );
  }, [editingCell, handleCellClick, handleFieldUpdate, handleCancelEdit, stateOptions, contactTypeOptions, prefetchContact]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-material p-12">
        <LoadingSpinner size="lg" />
        <p className="text-center text-gray-600">Loading contacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-material p-12 text-center">
        <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-error-500 h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Contacts</h3>
        <p className="text-gray-600">Failed to load contacts. Please try again.</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-material p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-gray-400 h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
        <p className="text-gray-600 mb-6">Add your first contact to get started with managing your network.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-material border border-gray-100">
      {/* Screen reader status announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
      >
        {updateMutation.isPending && "Saving contact changes..."}
        {updateMutation.isSuccess && "Contact updated successfully"}
        {updateMutation.isError && "Failed to update contact"}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              label="Name"
              isActive={sort?.key === 'name'}
              dir={sort?.key === 'name' ? sort.dir : null}
              onToggle={() => handleSortToggle('name')}
              ariaLabel="Sort by contact name"
            />
            <SortableHeader
              label="Email"
              isActive={sort?.key === 'email'}
              dir={sort?.key === 'email' ? sort.dir : null}
              onToggle={() => handleSortToggle('email')}
              ariaLabel="Sort by email address"
            />
            <TableHead>Phone</TableHead>
            <SortableHeader
              label="Company"
              isActive={sort?.key === 'company'}
              dir={sort?.key === 'company' ? sort.dir : null}
              onToggle={() => handleSortToggle('company')}
              ariaLabel="Sort by company name"
            />
            <SortableHeader
              label="City"
              isActive={sort?.key === 'city'}
              dir={sort?.key === 'city' ? sort.dir : null}
              onToggle={() => handleSortToggle('city')}
              ariaLabel="Sort by city"
            />
            <SortableHeader
              label="State"
              isActive={sort?.key === 'state'}
              dir={sort?.key === 'state' ? sort.dir : null}
              onToggle={() => handleSortToggle('state')}
              ariaLabel="Sort by state"
            />
            <SortableHeader
              label="Contact Type"
              isActive={sort?.key === 'contactType'}
              dir={sort?.key === 'contactType' ? sort.dir : null}
              onToggle={() => handleSortToggle('contactType')}
              ariaLabel="Sort by contact type"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedContacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">
                {renderEditableCell(contact, 'name')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'email')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'phone')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'company')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'city')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'state')}
              </TableCell>
              <TableCell>
                {renderEditableCell(contact, 'contactType')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Results counter */}
      {debouncedSearchQuery.trim() && (
        <div className="text-xs text-gray-500 mt-2 px-1">
          {processedContacts.length} result{processedContacts.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
