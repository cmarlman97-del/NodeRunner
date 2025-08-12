import type { Contact } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";

interface ContactCardProps {
  contact: Contact;
  onDelete: () => void;
}

export default function ContactCard({ contact, onDelete }: ContactCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-gradient-to-br from-primary-500 to-primary-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white rounded-xl shadow-material p-6 hover:shadow-material-lg transition-shadow border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${getAvatarColor(contact.name)} rounded-full flex items-center justify-center text-white font-semibold text-lg`}>
            <span data-testid={`text-initials-${contact.id}`}>
              {getInitials(contact.name)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-name-${contact.id}`}>
              {contact.name}
            </h3>
            <p className="text-gray-600" data-testid={`text-email-${contact.id}`}>
              {contact.email}
            </p>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              {contact.phone && (
                <span data-testid={`text-phone-${contact.id}`}>
                  {contact.phone}
                </span>
              )}
              {contact.company && (
                <span data-testid={`text-company-${contact.id}`}>
                  {contact.company}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit"
            data-testid={`button-edit-${contact.id}`}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-error-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={onDelete}
            title="Delete"
            data-testid={`button-delete-${contact.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
