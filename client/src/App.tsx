// App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Existing pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

// NEW pages
import ContactsPage from "@/pages/contacts-page";
import ContactDetailPage from "@/pages/contact-detail-page";

function Router() {
  return (
    <Switch>
      {/* Your existing dashboard at root */}
      <Route path="/" component={Dashboard} />

      {/* NEW: contacts list + contact detail */}
      <Route path="/contacts" component={ContactsPage} />
      {/* Note: wouter passes `params` to the component when using `component` prop */}
      <Route path="/contacts/:id" component={ContactDetailPage} />

      {/* 404 catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
