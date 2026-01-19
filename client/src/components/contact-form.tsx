import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type InsertContact, type ContactTypeItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/constants/us-states";
import { formatPhoneNumber, stripPhoneFormatting } from "@/lib/phone-utils";
// No lucide-react imports needed

type ContactFormProps = {
  onCreated?: () => void; // called on successful create
  onCancel?: () => void;  // called on cancel/close
};

export default function ContactForm({ onCreated, onCancel }: ContactFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for formatted phone displays
  const [cellPhoneDisplay, setCellPhoneDisplay] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");

  // Load managed contact types
  const {
    data: types = [],
    isLoading: typesLoading,
    isError: typesError,
  } = useQuery<ContactTypeItem[]>({
    queryKey: ["/api/contact-types"],
  });

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cellPhone: "",
      company: "",
      contactType: "", // we'll set this to the first available type when types load
      city: "",
      state: "",
    },
  });

  // When types load, default to the first one if none selected
  useEffect(() => {
    const current = form.getValues("contactType");
    if (!current && types.length > 0) {
      form.setValue("contactType", types?.[0]?.label ?? "Broker", { shouldValidate: true });
    }
  }, [types, form]);

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      // Refresh list first
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      // Close the slide-over
      onCreated?.();
      // Reset form after close (optional)
      form.reset({
        name: "",
        email: "",
        phone: "",
        cellPhone: "",
        company: "",
        contactType: types[0]?.label ?? "",
        city: "",
        state: "",
      });
      // Reset phone displays
      setCellPhoneDisplay("");
      setPhoneDisplay("");
      toast({ title: "Success", description: "Contact added successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle cell phone number formatting
  const handleCellPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    const stripped = stripPhoneFormatting(input);
    
    // Update display value with formatting
    setCellPhoneDisplay(formatted);
    
    // Update form value with stripped digits for storage
    form.setValue("cellPhone", stripped);
  };

  // Handle work phone number formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    const stripped = stripPhoneFormatting(input);
    
    // Update display value with formatting
    setPhoneDisplay(formatted);
    
    // Update form value with stripped digits for storage
    form.setValue("phone", stripped);
  };

  const onSubmit = (data: InsertContact) => {
    if (!data.contactType) {
      toast({ title: "Contact type required", description: "Please pick a type." });
      return;
    }
    createContactMutation.mutate(data);
  };

  return (
    <div className="bg-white rounded-xl shadow-material p-6">

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-error-500">*</span>
          </Label>
          <Input
            {...form.register("name")}
            placeholder="Enter full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-name"
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-error-500" data-testid="error-contact-name">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-error-500">*</span>
          </Label>
          <Input
            type="email"
            {...form.register("email")}
            placeholder="Enter email address"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-email"
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-sm text-error-500" data-testid="error-contact-email">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Cell Phone */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Cell Phone
          </Label>
          <Input
            type="tel"
            value={cellPhoneDisplay}
            onChange={handleCellPhoneChange}
            placeholder="Enter cell phone (optional)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-cellphone"
          />
        </div>

        {/* Work Phone */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Work Phone
          </Label>
          <Input
            type="tel"
            value={phoneDisplay}
            onChange={handlePhoneChange}
            placeholder="Enter work phone (optional)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-phone"
          />
        </div>

        {/* Company */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Company
          </Label>
          <Input
            {...form.register("company")}
            placeholder="Enter company (optional)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-company"
          />
        </div>

        {/* Contact Type (dropdown loaded from backend) */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Type
          </Label>

          {typesError ? (
            <div className="text-sm text-red-600">Failed to load contact types.</div>
          ) : (
            <select
              {...form.register("contactType")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white"
              disabled={typesLoading || types.length === 0}
              data-testid="select-contact-type"
            >
              {typesLoading && <option>Loading…</option>}
              {!typesLoading && types.length === 0 && <option>No types available</option>}
              {!typesLoading && types.map((t) => (
                <option key={t.id} value={t.label}>{t.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* City / State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </Label>
            <Input
              {...form.register("city")}
              placeholder="City (optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              data-testid="input-contact-city"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </Label>
            <Select
              value={form.watch("state") || ""}
              onValueChange={(value) => form.setValue("state", value)}
            >
              <SelectTrigger 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                data-testid="select-contact-state"
              >
                <SelectValue placeholder="Select state (optional)" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <Button
            type="submit"
            variant="cta"
            disabled={createContactMutation.isPending || typesLoading}
            className="flex-1 flex items-center justify-center"
            data-testid="button-add-contact"
          >
            {createContactMutation.isPending ? "Adding..." : "Add Contact"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onCancel?.()}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            data-testid="button-cancel-form"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
