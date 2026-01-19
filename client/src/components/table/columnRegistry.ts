export type ColumnKey = string;

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  type: 'text' | 'email' | 'phone' | 'badge';
  sortComparator: 'text' | 'emailLocal' | 'phoneDigits';
  renderHint?: string;
}

// Contacts column registry
export const CONTACTS_COLUMNS: Record<ColumnKey, ColumnConfig> = {
  name: {
    key: 'name',
    label: 'Name',
    type: 'text',
    sortComparator: 'text',
  },
  email: {
    key: 'email',
    label: 'Email',
    type: 'email',
    sortComparator: 'emailLocal',
  },
  phone: {
    key: 'phone',
    label: 'Work Phone',
    type: 'phone',
    sortComparator: 'phoneDigits',
  },
  cellPhone: {
    key: 'cellPhone',
    label: 'Cell Phone',
    type: 'phone',
    sortComparator: 'phoneDigits',
  },
  title: {
    key: 'title',
    label: 'Title',
    type: 'text',
    sortComparator: 'text',
  },
  company: {
    key: 'company',
    label: 'Company',
    type: 'text',
    sortComparator: 'text',
  },
  city: {
    key: 'city',
    label: 'City',
    type: 'text',
    sortComparator: 'text',
  },
  state: {
    key: 'state',
    label: 'State',
    type: 'text',
    sortComparator: 'text',
  },
  contactType: {
    key: 'contactType',
    label: 'Contact Type',
    type: 'badge',
    sortComparator: 'text',
  },
  // New columns
  owner: {
    key: 'owner',
    label: 'Contact Owner',
    type: 'text',
    sortComparator: 'text',
  },
  createdAt: {
    key: 'createdAt',
    label: 'Created Date',
    type: 'text',
    sortComparator: 'text',
  },
  propertyTypes: {
    key: 'propertyTypes',
    label: 'Property Types',
    type: 'badge',
    sortComparator: 'text',
  },
  lastActivityDate: {
    key: 'lastActivityDate',
    label: 'Last Activity Date',
    type: 'text',
    sortComparator: 'text',
  },
  nextActivityDate: {
    key: 'nextActivityDate',
    label: 'Next Activity Date',
    type: 'text',
    sortComparator: 'text',
  },
};

// Default column order for contacts
export const DEFAULT_CONTACTS_COLUMNS: ColumnKey[] = [
  'name',
  'email', 
  'phone',
  'cellPhone',
  'title',
  'company',
  'city',
  'state',
  'contactType',
  'owner',
  'createdAt',
  'propertyTypes',
  'lastActivityDate',
  'nextActivityDate',
];

// Tasks column registry
export const TASKS_COLUMNS: Record<ColumnKey, ColumnConfig> = {
  status: {
    key: 'status',
    label: 'Status',
    type: 'text',
    sortComparator: 'text',
  },
  priority: {
    key: 'priority',
    label: 'Priority',
    type: 'text',
    sortComparator: 'text',
  },
  title: {
    key: 'title',
    label: 'Task',
    type: 'text',
    sortComparator: 'text',
  },
  contactName: {
    key: 'contactName',
    label: 'Associated Contact',
    type: 'text',
    sortComparator: 'text',
  },
  contactEmail: {
    key: 'contactEmail',
    label: 'Contact Email',
    type: 'email',
    sortComparator: 'emailLocal',
  },
  workPhone: {
    key: 'workPhone',
    label: 'Work Phone',
    type: 'phone',
    sortComparator: 'phoneDigits',
  },
  cellPhone: {
    key: 'cellPhone',
    label: 'Cell Phone',
    type: 'phone',
    sortComparator: 'phoneDigits',
  },
  dueAt: {
    key: 'dueAt',
    label: 'Due Date',
    type: 'text',
    sortComparator: 'text',
  },
  notes: {
    key: 'notes',
    label: 'Notes',
    type: 'text',
    sortComparator: 'text',
  },
  taskOwner: {
    key: 'taskOwner',
    label: 'Task Owner',
    type: 'text',
    sortComparator: 'text',
  },
};

// Default column order for tasks
export const DEFAULT_TASKS_COLUMNS: ColumnKey[] = [
  'status',
  'priority',
  'title',
  'contactName',
  'contactEmail',
  'workPhone',
  'cellPhone',
  'dueAt',
  'notes',
  'taskOwner',
];

// Registry lookup function
export function getColumnConfig(key: ColumnKey): ColumnConfig | undefined {
  return CONTACTS_COLUMNS[key] || TASKS_COLUMNS[key];
}

// Get all available columns for a resource
export function getAvailableColumns(resource: 'contacts' | 'tasks'): ColumnConfig[] {
  switch (resource) {
    case 'contacts':
      return Object.values(CONTACTS_COLUMNS);
    case 'tasks':
      return Object.values(TASKS_COLUMNS);
    default:
      return [];
  }
}
