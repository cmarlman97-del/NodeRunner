import type { QueryClient } from "@tanstack/react-query";
import { generateLocalTaskId } from "@/lib/utils";
import { tasksAllKey, tasksByContactKey, type TaskModel } from "@/lib/tasksStore";

// Input types for service methods
export type TaskCreateInput = Omit<TaskModel, 'id' | 'createdAt' | 'updatedAt'> & {
  status?: TaskModel['status']; // Optional, defaults to "open"
};

export type TaskUpdateInput = Partial<TaskModel> & { id: string };

// TaskItemModel structure used by contact panels
type TaskItemModel = {
  id: string;
  contactId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "open" | "done";
  createdAt: string;
  authorName: string;
};

/**
 * Centralized task service for all task mutations
 * Handles both global and per-contact cache updates
 */
export class TasksService {
  constructor(private queryClient: QueryClient) {}

  /**
   * Create a new task
   */
  async create(input: TaskCreateInput): Promise<TaskModel> {
    const nowIso = new Date().toISOString();
    const task: TaskModel = {
      id: generateLocalTaskId(),
      title: input.title,
      notes: input.notes ?? null,
      contactId: input.contactId ?? null,
      source: input.source ?? "manual",
      status: input.status ?? "open",
      dueAt: input.dueAt ?? null,
      remindAt: input.remindAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.upsertGlobal(task);
    this.upsertPerContact(task);

    // TODO: Integrate API via integrations/tasksClient.ts
    // TODO: POST /api/tasks, then reconcile id/timestamps

    return task;
  }

  /**
   * Complete a task by marking it as done
   */
  async complete(id: string): Promise<void> {
    const nowIso = new Date().toISOString();
    
    this.mirrorUpdate(id, (task) => ({
      ...task,
      status: "done" as const,
      updatedAt: nowIso,
    }));

    // TODO: Integrate API via integrations/tasksClient.ts
    // TODO: PATCH /api/tasks/:id { status: "done" }
  }

  /**
   * Update a task with partial data
   */
  async update(patch: TaskUpdateInput): Promise<void> {
    const nowIso = new Date().toISOString();
    
    this.mirrorUpdate(patch.id, (task) => ({
      ...task,
      ...patch,
      updatedAt: nowIso,
    }));

    // TODO: Integrate API via integrations/tasksClient.ts
    // TODO: PATCH /api/tasks/:id with patch data
  }

  /**
   * Create a follow-up task from an existing task
   */
  async followUp(from: TaskModel, dueAt: Date): Promise<TaskModel> {
    return this.create({
      title: from.title,
      notes: from.notes ?? null,
      contactId: from.contactId ?? null,
      source: from.source ?? "manual",
      status: "open",
      dueAt: dueAt.toISOString(),
      remindAt: null,
    });
  }

  /**
   * Delete a task by ID
   */
  async delete(id: string): Promise<void> {
    // Find the task first to get contactId for per-contact cache update
    const globalTasks = this.queryClient.getQueryData<{ items: TaskModel[] }>(tasksAllKey());
    const task = globalTasks?.items.find(t => t.id === id);
    
    // Remove from global cache
    if (globalTasks) {
      this.queryClient.setQueryData(tasksAllKey(), {
        items: globalTasks.items.filter(t => t.id !== id)
      });
    }
    
    // Remove from per-contact cache if task has contactId
    if (task?.contactId) {
      const contactTasks = this.queryClient.getQueryData<{ items: TaskItemModel[] }>(
        tasksByContactKey(task.contactId)
      );
      if (contactTasks) {
        this.queryClient.setQueryData(tasksByContactKey(task.contactId), {
          items: contactTasks.items.filter(t => t.id !== id)
        });
      }
    }

    // TODO: Integrate API via integrations/tasksClient.ts
    // TODO: DELETE /api/tasks/:id
  }

  // Internal cache management helpers

  /**
   * Upsert task into global cache
   */
  private upsertGlobal(task: TaskModel): void {
    const globalTasks = this.queryClient.getQueryData<{ items: TaskModel[] }>(tasksAllKey());
    const existingItems = globalTasks?.items || [];
    
    // Replace existing task or add new one
    const updatedItems = existingItems.some(t => t.id === task.id)
      ? existingItems.map(t => t.id === task.id ? task : t)
      : [task, ...existingItems];
    
    this.queryClient.setQueryData(tasksAllKey(), { items: updatedItems });
  }

  /**
   * Upsert task into per-contact cache if contactId exists
   */
  private upsertPerContact(task: TaskModel): void {
    if (!task.contactId) return;

    const contactTasks = this.queryClient.getQueryData<{ items: TaskItemModel[] }>(
      tasksByContactKey(task.contactId)
    );
    const existingItems = contactTasks?.items || [];

    // Map TaskModel to TaskItemModel structure for contact cache
    const contactTask: TaskItemModel = {
      id: task.id,
      contactId: task.contactId,
      title: task.title,
      description: task.notes ?? null, // Map notes → description
      dueAt: task.dueAt ?? null,
      status: task.status,
      createdAt: task.createdAt,
      authorName: "You",
    };

    // Replace existing task or add new one
    const updatedItems = existingItems.some(t => t.id === task.id)
      ? existingItems.map(t => t.id === task.id ? contactTask : t)
      : [contactTask, ...existingItems];

    this.queryClient.setQueryData(tasksByContactKey(task.contactId), { items: updatedItems });
  }

  /**
   * Apply a mutation function to both global and per-contact caches
   */
  private mirrorUpdate(taskId: string, mutator: (task: TaskModel) => TaskModel): void {
    // Update global cache
    const globalTasks = this.queryClient.getQueryData<{ items: TaskModel[] }>(tasksAllKey());
    if (globalTasks) {
      const updatedGlobal = {
        items: globalTasks.items.map(task =>
          task.id === taskId ? mutator(task) : task
        )
      };
      this.queryClient.setQueryData(tasksAllKey(), updatedGlobal);

      // Find the task to get its contactId for per-contact cache update
      const updatedTask = updatedGlobal.items.find(task => task.id === taskId);
      if (updatedTask?.contactId) {
        const contactTasks = this.queryClient.getQueryData<{ items: TaskItemModel[] }>(
          tasksByContactKey(updatedTask.contactId)
        );
        if (contactTasks) {
          const updatedContact = {
            items: contactTasks.items.map((task: TaskItemModel) =>
              task.id === taskId
                ? {
                    ...task,
                    status: updatedTask.status,
                    description: updatedTask.notes ?? null, // Map notes → description
                    dueAt: updatedTask.dueAt ?? null,
                  }
                : task
            )
          };
          this.queryClient.setQueryData(tasksByContactKey(updatedTask.contactId), updatedContact);
        }
      }
    }
  }
}

/**
 * Factory function to create a TasksService instance
 */
export const createTasksService = (queryClient: QueryClient) => new TasksService(queryClient);
