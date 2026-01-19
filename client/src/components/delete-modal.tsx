import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// TODO: Consider migrating to use the shared Modal component in a future pass
import { Trash2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  contact: Contact | null;
  onClose: () => void;
}

export default function DeleteModal({ isOpen, contact, onClose }: DeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiRequest("DELETE", `/api/contacts/${contactId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully!",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmDelete = () => {
    if (contact) {
      deleteContactMutation.mutate(contact.id);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="text-error-600 h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Delete Contact
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold" data-testid="text-contact-name-delete">
              {contact.name}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex space-x-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteContactMutation.isPending}
            data-testid="button-cancel-delete"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleteContactMutation.isPending}
            className="bg-error-600 text-white hover:bg-error-700"
            data-testid="button-confirm-delete"
          >
            {deleteContactMutation.isPending ? "Deleting..." : "Delete Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
