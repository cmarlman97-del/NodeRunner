// src/pages/contacts-page.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Contact, ContactTypeItem } from "@shared/schema";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalTable } from "@/components/table/GlobalTable";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { DEFAULT_CONTACTS_COLUMNS, type ColumnKey } from "@/components/table/columnRegistry";
import { patchContact } from "@/lib/api/contacts";
import { useToast } from "@/hooks/use-toast";
import { US_STATES } from "@/constants/us-states";
import { DEFAULT_CONTACT_TYPES } from "@/constants/contact-types";
import { DEFAULT_PROPERTY_TYPES } from "@/constants/property-types";
import { logTelemetryEvent } from "@/lib/telemetry";
import { Link } from "wouter";
import { Users } from "lucide-react";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_CONTACTS_COLUMNS);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [clearFiltersFunction, setClearFiltersFunction] = useState<(() => void) | null>(null);
  
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const { data: contacts = [], isLoading, isError } = useQuery<Contact[]>({
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
      await qc.cancelQueries({ queryKey: ["contacts"] });
      const previousContacts = qc.getQueryData<Contact[]>(["contacts"]);
      qc.setQueryData<Contact[]>(["contacts"], (old) => {
        if (!old) return [];
        return old.map((contact) =>
          contact.id === id ? { ...contact, ...updates } : contact
        );
      });
      return { previousContacts };
    },
    onError: (err, variables, context) => {
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
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Success",
        description: "Contact updated successfully!",
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

  // Placeholder for add new contact
  const handleAddNew = () => {
    // TODO: Implement add new contact functionality
    console.log('Add new contact clicked');
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

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <ContactsToolbar
          title="Contacts"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onAddNew={handleAddNew}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
        />
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
          className="bg-white rounded-xl shadow-material border border-gray-100"
        />
      </div>
    </AppShell>
  );
}
