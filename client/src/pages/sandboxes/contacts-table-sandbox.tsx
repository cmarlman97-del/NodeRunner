import React, { useState } from "react";
import { AuthProvider } from "@/providers/AuthContext";
import { GlobalTable } from "@/components/table/GlobalTable";
import { ColumnPicker } from "@/components/table/ColumnPicker";
import { DEFAULT_CONTACTS_COLUMNS, type ColumnKey } from "@/components/table/columnRegistry";

// Mock contact data for testing
const MOCK_CONTACTS = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
    company: "Acme Corp",
    city: "New York",
    state: "NY",
    contactType: "Lead",
  },
  {
    id: "2", 
    name: "Sarah Johnson",
    email: "sarah.j@techstart.io",
    phone: "(555) 987-6543",
    company: "TechStart",
    city: "San Francisco",
    state: "CA",
    contactType: "Client",
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "m.brown@consulting.com",
    phone: "(555) 456-7890",
    company: "Brown Consulting",
    city: "Chicago",
    state: "IL",
    contactType: "Partner",
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily@startup.co",
    phone: "(555) 321-0987",
    company: "Startup Co",
    city: "Austin",
    state: "TX",
    contactType: "Prospect",
  },
  {
    id: "5",
    name: "Robert Wilson",
    email: "rwilson@enterprise.com",
    phone: "(555) 654-3210",
    company: "Enterprise Solutions",
    city: "Seattle",
    state: "WA",
    contactType: "Client",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "lisa.anderson@agency.net",
    phone: "(555) 789-0123",
    company: "Creative Agency",
    city: "Los Angeles",
    state: "CA",
    contactType: "Lead",
  },
  {
    id: "7",
    name: "David Miller",
    email: "dmiller@finance.org",
    phone: null,
    company: null,
    city: "Boston",
    state: "MA",
    contactType: "Prospect",
  },
  {
    id: "8",
    name: "Jennifer Taylor",
    email: null,
    phone: "(555) 234-5678",
    company: "Taylor & Associates",
    city: "Denver",
    state: "CO",
    contactType: "Partner",
  },
];

function ContactsTableSandboxContent() {
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_CONTACTS_COLUMNS);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              GlobalTable Sandbox
            </h1>
            <p className="text-gray-600 mt-2">
              Testing the reusable GlobalTable component with contacts data
            </p>
          </div>
          <ColumnPicker
            resource="contacts"
            visibleColumns={visibleColumns}
            onColumnsChange={setVisibleColumns}
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Features to Test:</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Sorting:</strong> Click column headers to sort (none → asc → desc → none)</li>
            <li>• <strong>Column Picker:</strong> Use the "Columns" button to show/hide columns</li>
            <li>• <strong>Authorization:</strong> All actions are gated by can() function (returns true for now)</li>
            <li>• <strong>Telemetry:</strong> Check browser console for event logging</li>
            <li>• <strong>Responsive:</strong> Table adapts to different screen sizes</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <GlobalTable
          rows={MOCK_CONTACTS}
          columns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          className="w-full"
        />
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          <strong>Mock Data:</strong> {MOCK_CONTACTS.length} contacts • 
          <strong> Visible Columns:</strong> {visibleColumns.length} of {DEFAULT_CONTACTS_COLUMNS.length} • 
          <strong> Auth:</strong> Fake admin user
        </p>
      </div>
    </div>
  );
}

export default function ContactsTableSandbox() {
  return (
    <AuthProvider>
      <ContactsTableSandboxContent />
    </AuthProvider>
  );
}
