import { NotebookTabs, Users, Settings } from "lucide-react";

interface HeaderProps {
  contactCount: number;
}

export default function Header({ contactCount }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <NotebookTabs className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Contact Manager</h1>
              <p className="text-sm text-gray-500">Manage your contacts efficiently</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span data-testid="text-contact-count">{contactCount}</span>
              <span>contacts</span>
            </div>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
