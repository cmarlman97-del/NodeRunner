import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Contact } from "@shared/schema";
import Header from "@/components/header";
import ContactForm from "@/components/contact-form";
import ContactList from "@/components/contact-list";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const filteredContacts = searchQuery
    ? contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header contactCount={contacts.length} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form */}
          <div className="lg:col-span-1">
            <ContactForm />
          </div>
          
          {/* Contact Dashboard */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Contacts</h2>
                <p className="text-gray-600">Manage and organize your contact list</p>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="input-search-contacts"
                  />
                </div>
                <button
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  data-testid="button-filter"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>

            <ContactList 
              contacts={filteredContacts}
              isLoading={isLoading}
              error={error as Error | null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
