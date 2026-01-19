import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { Contact, ContactTypeItem } from "@shared/schema";
import { AppShell } from "@/components/layout/AppShell";
import ContactForm from "@/components/contact-form";
import { GlobalTable } from "@/components/table/GlobalTable";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { EditTableModal } from "@/components/table/EditTableModal";
import { DEFAULT_CONTACTS_COLUMNS, type ColumnKey } from "@/components/table/columnRegistry";
import { patchContact } from "@/lib/api/contacts";
import { useToast } from "@/hooks/use-toast";
import { US_STATES } from "@/constants/us-states";
import { DEFAULT_CONTACT_TYPES } from "@/constants/contact-types";
import { DEFAULT_PROPERTY_TYPES } from "@/constants/property-types";
import { logTelemetryEvent } from "@/lib/telemetry";
import { Link } from "wouter";
import { Users, X } from "lucide-react";


export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  // slide-over state (mounted for exit animation)
  const [formMounted, setFormMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Edit table modal state
  const [isEditTableOpen, setIsEditTableOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_CONTACTS_COLUMNS);
  
  // Filter state management
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [clearFiltersFunction, setClearFiltersFunction] = useState<(() => void) | null>(null);

  const openForm = () => {
    setFormMounted(true);
    requestAnimationFrame(() => setFormOpen(true)); // allow transition
  };
  const closeForm = () => {
    setFormOpen(false);
    setTimeout(() => setFormMounted(false), 300); // match duration classes
  };

  // Esc closes panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && formOpen) closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
  });

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
      await qc.cancelQueries({ queryKey: ["contacts"] });

      // Snapshot the previous value
      const previousContacts = qc.getQueryData<Contact[]>(["contacts"]);

      // Optimistically update to the new value
      qc.setQueryData<Contact[]>(["contacts"], (old) => {
        if (!old) return [];
        return old.map((contact) =>
          contact.id === id ? { ...contact, ...updates } : contact
        );
      });

      // Return a context object with the snapshotted value
      return { previousContacts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousContacts) {
        qc.setQueryData(["contacts"], context.previousContacts);
      }
      
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });

      logTelemetryEvent({
        type: 'contact.inlineEdit.failed',
        contactId: variables.id,
        field: Object.keys(variables.updates)[0] || 'unknown',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      qc.invalidateQueries({ queryKey: ["contacts"] });
      // Also invalidate individual contact queries for real-time sync with detail pages
      qc.invalidateQueries({ queryKey: ["contact", variables.id] });
      
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });

      logTelemetryEvent({
        type: 'contact.inlineEdit.succeeded',
        contactId: variables.id,
        field: Object.keys(variables.updates)[0] || 'unknown'
      });
    },
  });

  // Prepare select options for dropdowns
  const stateOptions = useMemo(() => 
    US_STATES.map(state => ({ value: state.code, label: `${state.name} (${state.code})` })),
    []
  );

  const contactTypeOptions = useMemo(() => 
    contactTypes.map(type => ({ 
      value: typeof type === 'string' ? type : type.label, 
      label: typeof type === 'string' ? type : type.label 
    })),
    [contactTypes]
  );

  const selectOptions = useMemo(() => ({
    state: stateOptions,
    contactType: contactTypeOptions,
    propertyTypes: DEFAULT_PROPERTY_TYPES,
  }), [stateOptions, contactTypeOptions]);

  // Handle row updates for inline editing
  const handleRowUpdate = async (id: string, field: string, value: any): Promise<void> => {
    // Normalize empty strings to null for database consistency
    const normalizedValue = value === '' ? null : value;
    
    logTelemetryEvent({
      type: 'contact.inlineEdit.started',
      contactId: id,
      field: field
    });

    await updateMutation.mutateAsync({ 
      id, 
      updates: { [field]: normalizedValue } 
    });
  };

  // Handle filter state changes
  const handleFiltersChange = (hasFilters: boolean) => {
    setHasActiveFilters(hasFilters);
  };

  // Handle clear filters callback
  const handleClearFilters = (clearFunction: () => void) => {
    setClearFiltersFunction(() => clearFunction);
  };

  // Clear all filters
  const clearAllFilters = () => {
    clearFiltersFunction?.();
  };

  // Custom cell renderers for specific columns
  const cellRenderers = useMemo(() => ({
    name: (row: Contact, value: any) => (
      <Link
        href={`/contacts/${row.id}`}
        className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
        aria-label={`Open contact: ${row.name}`}
        title={`Open ${row.name}`}
      >
        {row.name}
      </Link>
    ),
    createdAt: (row: Contact, value: any) => {
      if (!value) return '—';
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return '—';
      }
    },
  }), []);

  // Called when ContactForm successfully creates a contact
  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["contacts"] });
    closeForm();
  };

  return (
    <AppShell>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Compact Toolbar */}
          <ContactsToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNew={openForm}
            onEditTable={() => setIsEditTableOpen(true)}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
          />

        {/* Contact List with Inline Editing */}
        <GlobalTable
          rows={contacts}
          columns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          enableInlineEditing={true}
          enableColumnReordering={true}
          onRowUpdate={handleRowUpdate}
          cellRenderers={cellRenderers}
          isLoading={isLoading}
          selectOptions={selectOptions}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          emptyState={{
            icon: <Users className="text-gray-400 h-8 w-8" />,
            title: "No contacts yet",
            description: "Add your first contact to get started with managing your network."
          }}
        />

          <div className="text-xs text-gray-500">
            {contacts.length} contacts
          </div>
        </div>
      </div>

      {/* Slide-over (overlay) */}
      {formMounted && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="Close"
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${formOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeForm}
          />
          {/* Panel */}
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl transition-transform duration-300
                        ${formOpen ? "translate-x-0" : "translate-x-full"}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Add New Contact</h3>
              <button className="p-2 rounded hover:bg-gray-100" onClick={closeForm} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
              {/* IMPORTANT: ContactForm must call onCreated() on success, onCancel() when cancel is clicked */}
              <ContactForm onCreated={handleCreated} onCancel={closeForm} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      <EditTableModal
        open={isEditTableOpen}
        onOpenChange={setIsEditTableOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={(newColumns) => {
          setVisibleColumns(newColumns);
          console.log('Visible columns updated:', newColumns);
        }}
        resource="contacts"
      />
    </AppShell>
  );
}
