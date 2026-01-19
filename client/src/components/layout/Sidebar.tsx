import { Home, Users, CheckSquare, KanbanSquare } from "lucide-react";
import { useLocation } from "wouter";
import { NavItem } from "./NavItem";

export function Sidebar() {
  const [location] = useLocation();

  const CONTACTS_PRIMARY = "/contacts";
  const CONTACTS_ALIAS = "/contacts-page";
  const isContactsActive = location === CONTACTS_PRIMARY || location === CONTACTS_ALIAS;
  const TASKS_PATH = "/tasks";
  const isTasksActive = location === TASKS_PATH;

  return (
    <aside className="w-16 shrink-0 border-r bg-neutral-50 flex flex-col items-center py-3">
      <nav aria-label="Primary" className="w-full flex flex-col items-center">
        <NavItem title="Home" icon={Home} disabled />
        <NavItem title="Contacts" icon={Users} href={CONTACTS_PRIMARY} active={isContactsActive} />
        <NavItem title="Tasks" icon={CheckSquare} href={TASKS_PATH} active={isTasksActive} />
        <NavItem title="Pipeline" icon={KanbanSquare} disabled />
      </nav>
    </aside>
  );
}
