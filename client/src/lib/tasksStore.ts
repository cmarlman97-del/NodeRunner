import type { QueryClient } from "@tanstack/react-query";

export type TaskModel = {
  id: string;
  source: "manual" | "note" | "call";
  status: "open" | "done";
  contactId?: string | null;
  title: string;
  notes?: string | null;
  dueAt?: string | null; // ISO string (date or datetime)
  remindAt?: string | null;
  priority?: "low" | "medium" | "high" | null;
  owner?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/**
 * Generate query key for global tasks list
 */
export const tasksAllKey = () => ["tasks-global"] as const;

/**
 * Generate query key for per-contact tasks list
 */
export const tasksByContactKey = (contactId: string) => ["tasks", contactId] as const;

/**
 * Complete a task by marking it as done and updating the timestamp
 * Updates both global and per-contact caches
 */
export const completeTask = (queryClient: QueryClient, taskId: string) => {
  const nowIso = new Date().toISOString();

  // Update global tasks cache
  const globalTasks = queryClient.getQueryData<{ items: TaskModel[] }>(tasksAllKey());
  if (globalTasks) {
    const updatedGlobal = {
      items: globalTasks.items.map(task =>
        task.id === taskId
          ? { ...task, status: "done" as const, updatedAt: nowIso }
          : task
      )
    };
    queryClient.setQueryData(tasksAllKey(), updatedGlobal);
  }

  // Find the task to get its contactId for per-contact cache update
  const completedTask = globalTasks?.items.find(task => task.id === taskId);
  if (completedTask?.contactId) {
    const contactTasks = queryClient.getQueryData<{ items: any[] }>(tasksByContactKey(completedTask.contactId));
    if (contactTasks) {
      const updatedContact = {
        items: contactTasks.items.map(task =>
          task.id === taskId
            ? { ...task, status: "done", updatedAt: nowIso }
            : task
        )
      };
      queryClient.setQueryData(tasksByContactKey(completedTask.contactId), updatedContact);
    }
  }

  return completedTask;
};

/**
 * Add a new task to both global and per-contact caches
 */
export const addTask = (queryClient: QueryClient, task: TaskModel) => {
  // Add to global tasks cache
  const globalTasks = queryClient.getQueryData<{ items: TaskModel[] }>(tasksAllKey());
  const updatedGlobal = { items: [task, ...(globalTasks?.items || [])] };
  queryClient.setQueryData(tasksAllKey(), updatedGlobal);

  // Add to per-contact cache if contactId exists
  if (task.contactId) {
    const contactTasks = queryClient.getQueryData<{ items: any[] }>(tasksByContactKey(task.contactId));
    // Map TaskModel to TaskItemModel structure for contact cache
    const contactTask = {
      id: task.id,
      contactId: task.contactId,
      title: task.title,
      description: task.notes, // Map notes -> description for contact cache
      dueAt: task.dueAt,
      status: task.status,
      createdAt: task.createdAt,
      authorName: "You",
    };
    const updatedContact = { items: [contactTask, ...(contactTasks?.items || [])] };
    queryClient.setQueryData(tasksByContactKey(task.contactId), updatedContact);
  }
};
