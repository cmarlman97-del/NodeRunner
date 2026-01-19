// src/pages/contact-detail-page.tsx
import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patchContact } from "@/lib/api/contacts";
import { InlineEditableField } from "@/components/InlineEditableField";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { NotebookPen, ListChecks, PhoneCall, ChevronDown, Activity } from "lucide-react";
import type { Contact, ContactTypeItem } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { NotesPanel } from "@/components/contact/NotesPanel";
import { TasksPanel } from "@/components/contact/TasksPanel";
import { CallsPanel } from "@/components/contact/CallsPanel";
import { ActivityPanel } from "@/components/contact/ActivityPanel";


// NOTE: wouter passes route params as a prop when using `component={...}`
// so we type it like this:
export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contact, isLoading, isError } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: () => fetch(`/api/contacts/${id}`).then((r) => r.json()),
  });

  // Fetch contact types for the dropdown
  const { data: contactTypes = [] } = useQuery<ContactTypeItem[]>({
    queryKey: ["/api/contact-types"],
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Contact>) => patchContact(id, updates),
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["contact", id] });
      
      // Snapshot the previous value
      const previousContact = queryClient.getQueryData<Contact>(["contact", id]);
      
      // Optimistically update to the new value
      if (previousContact) {
        queryClient.setQueryData<Contact>(["contact", id], {
          ...previousContact,
          ...updates,
        });
      }

      // Invalidate the contacts list to ensure it's up to date
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      return { previousContact };
    },
    onSuccess: (data, variables) => {
      // Invalidate both the individual contact and contacts list for bidirectional sync
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContact) {
        queryClient.setQueryData(["contact", id], context.previousContact);
      }
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFieldUpdate = async (field: keyof Contact, value: string | null) => {
    try {
      await updateMutation.mutateAsync({ [field]: value });
    } catch (error) {
      // Error handling is done in onError
      console.error("Error updating field:", error);
    }
  };

  const handleSave = async (field: keyof Contact, value: string | null) => {
    try {
      await updateMutation.mutateAsync({ [field]: value });
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
      throw error;
    }
  };

  const [activeTab, setActiveTab] = React.useState("notes");

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError || !contact) return <div className="p-6">Contact not found.</div>;

  return (
    <AppShell disableScroll>
    <div className="flex flex-col h-full overflow-hidden bg-muted/40">

      <div className="flex-1 px-4 py-4 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column - Contact Card */}
          <div className="col-span-12 lg:col-span-3 flex flex-col">
            {/* Profile Block */}
            <Card className="flex flex-col h-full bg-white rounded-xl shadow-material border border-gray-100">
              <CardContent className="pt-6 flex-1 min-h-0">
                <ScrollArea className="h-full max-h-[calc(100vh-12rem)] contact-detail-card">
                  <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h1 className="text-2xl font-bold">{contact?.name || 'Unnamed Contact'}</h1>
                  {contact?.company && (
                    <p className="text-foreground">{contact.company}</p>
                  )}
                  {contact?.title && (
                    <p className="text-muted-foreground">{contact.title}</p>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Quick-Action Toolbar */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    variant="secondaryNav" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setActiveTab("notes")}
                  >
                    <NotebookPen className="mr-2 h-4 w-4" />
                    Notes
                  </Button>
                  <Button 
                    variant="secondaryNav" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setActiveTab("tasks")}
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    Tasks
                  </Button>
                  <Button 
                    variant="secondaryNav" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setActiveTab("calls")}
                  >
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Calls
                  </Button>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  {/* Contact Information Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Email</div>
                        <InlineEditableField
                          field="email"
                          value={contact?.email || ''}
                          onSave={(value) => handleSave('email', value)}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Work Phone</div>
                        <InlineEditableField
                          field="phone"
                          value={contact?.phone || ''}
                          onSave={(value) => handleSave('phone', value)}
                          className="text-sm"
                          placeholder="Add work phone"
                          displayFormatter={formatPhoneNumber}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Cell Phone</div>
                        <InlineEditableField
                          field="cellPhone"
                          value={contact?.cellPhone || ''}
                          onSave={(value) => handleSave('cellPhone', value)}
                          className="text-sm"
                          placeholder="Add cell phone"
                          displayFormatter={formatPhoneNumber}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-gray-200" />
                  
                  {/* Location & Links Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Location & Links</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">City</div>
                        <InlineEditableField
                          field="city"
                          value={contact?.city || ''}
                          onSave={(value) => handleSave('city', value)}
                          placeholder="City"
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">State</div>
                        <InlineEditableField
                          field="state"
                          value={contact?.state || ''}
                          onSave={(value) => handleSave('state', value)}
                          placeholder="State"
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Website</div>
                        {contact?.website ? (
                          <a 
                            href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm block py-1"
                          >
                            {contact.website}
                          </a>
                        ) : (
                          <InlineEditableField
                            field="website"
                            value=""
                            onSave={(value) => handleSave('website', value)}
                            placeholder="Add website URL"
                            className="text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-gray-200" />
                  
                  {/* Internal Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Internal</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Contact Owner</div>
                        <InlineEditableField
                          field="owner"
                          value={contact?.owner || ''}
                          onSave={(value) => handleSave('owner', value)}
                          placeholder="Assign owner"
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Contact Type</div>
                        <div className="min-h-[32px] flex items-center w-full overflow-visible">
                          {contact?.contactType ? (
                            <Select
                              value={contact.contactType}
                              onValueChange={(value) => handleSave('contactType', value)}
                            >
                              <SelectTrigger className="w-auto min-w-fit border-0 p-0 h-auto bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 overflow-visible">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap flex-shrink-0">
                                  {contact.contactType}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {contactTypes.map((type) => {
                                  const typeValue = typeof type === 'string' ? type : type.label;
                                  return (
                                    <SelectItem key={typeValue} value={typeValue}>
                                      {typeValue}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(value) => handleSave('contactType', value)}
                            >
                              <SelectTrigger className="w-auto border-0 p-0 h-auto bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0">
                                <span className="text-gray-400 text-sm whitespace-nowrap">Select type</span>
                              </SelectTrigger>
                              <SelectContent>
                                {contactTypes.map((type) => {
                                  const typeValue = typeof type === 'string' ? type : type.label;
                                  return (
                                    <SelectItem key={typeValue} value={typeValue}>
                                      {typeValue}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-gray-200" />
                  
                  {/* Created Date Footer */}
                  <div className="flex justify-end">
                    <div className="text-xs text-muted-foreground">
                      {contact?.createdAt ? new Date(contact.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : ''}
                    </div>
                  </div>
                  </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="col-span-12 lg:col-span-9 flex flex-col">
            <Card className="flex flex-col h-full bg-white rounded-xl shadow-material border border-gray-100">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                  <TabsTrigger 
                    value="activity" 
                    className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:bg-[#A4F0E3]/50 data-[state=active]:border-[#24A89C] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:bg-[#A4F0E3]/50 data-[state=active]:border-[#24A89C] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <NotebookPen className="mr-2 h-4 w-4" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="calls" 
                    className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:bg-[#A4F0E3]/50 data-[state=active]:border-[#24A89C] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Calls
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tasks" 
                    className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:bg-[#A4F0E3]/50 data-[state=active]:border-[#24A89C] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                </TabsList>
                <div className="p-6 flex-1 overflow-hidden min-h-0 bg-white">
                  <TabsContent value="activity">
                    <ActivityPanel contactId={id} />
                  </TabsContent>
                  <TabsContent value="notes">
                    <NotesPanel contactId={id} />
                  </TabsContent>
                  <TabsContent value="calls">
                    <CallsPanel contactId={id} />
                  </TabsContent>
                  <TabsContent value="tasks">
                    <TasksPanel contactId={id} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
