import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Plus, RotateCcw } from "lucide-react";

export default function ContactForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      form.reset();
      toast({
        title: "Success",
        description: "Contact added successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    createContactMutation.mutate(data);
  };

  const clearForm = () => {
    form.reset();
  };

  return (
    <div className="bg-white rounded-xl shadow-material p-6 sticky top-24">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
          <UserPlus className="text-primary-600 h-4 w-4" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Add New Contact</h2>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </Label>
          <Input
            type="tel"
            {...form.register("phone")}
            placeholder="Enter phone number (optional)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            data-testid="input-contact-phone"
          />
        </div>
        
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
        
        <div className="pt-4 space-y-3">
          <Button
            type="submit"
            disabled={createContactMutation.isPending}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium transition-colors flex items-center justify-center space-x-2"
            data-testid="button-add-contact"
          >
            <Plus className="h-4 w-4" />
            <span>
              {createContactMutation.isPending ? "Adding..." : "Add Contact"}
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={clearForm}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center justify-center space-x-2"
            data-testid="button-clear-form"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear Form</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
