import { useState } from "react";
import type { Contact } from "@shared/schema";
import ContactCard from "./contact-card";
import DeleteModal from "./delete-modal";
import { Users, Loader2 } from "lucide-react";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  error: Error | null;
}

export default function ContactList({ contacts, isLoading, error }: ContactListProps) {
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
  };

  const handleCloseModal = () => {
    setContactToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-material p-12 text-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading contacts...</p>
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
    <div className="space-y-4">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onDelete={() => handleDeleteClick(contact)}
        />
      ))}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!contactToDelete}
        contact={contactToDelete}
        onClose={handleCloseModal}
      />
    </div>
  );
}
