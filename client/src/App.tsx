// App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthContext";

// Existing pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

// NEW pages
// import ContactsPage from "@/pages/contacts-page"; // Option A: route /contacts to Dashboard
import ContactDetailPage from "@/pages/contact-detail-page";
import TasksPage from "@/pages/tasks";
import ContactsTableSandbox from "@/pages/sandboxes/contacts-table-sandbox";

function Router() {
  return (
    <Switch>
      {/* Your existing dashboard at root */}
      <Route path="/" component={Dashboard} />

      {/* NEW: contacts list + contact detail */}
      {/* Option A: Use Dashboard as the contacts list page */}
      <Route path="/contacts" component={Dashboard} />
      {/* Alias for legacy link */}
      <Route path="/contacts-page" component={Dashboard} />
      {/* Note: wouter passes `params` to the component when using `component` prop */}
      <Route path="/contacts/:id" component={ContactDetailPage} />

      {/* Tasks page */}
      <Route path="/tasks" component={TasksPage} />

      {/* Sandbox pages */}
      <Route path="/sandboxes/contacts-table" component={ContactsTableSandbox} />

      {/* 404 catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
