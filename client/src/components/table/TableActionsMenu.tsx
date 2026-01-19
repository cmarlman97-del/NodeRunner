import React from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableActionsMenuProps {
  children: React.ReactNode;
  align?: "start" | "end";
}

export function TableActionsMenu({ children, align = "end" }: TableActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-[#E6F7F6] hover:text-[#046E75] hover:border-[#046E75]"
          aria-label="Table actions"
          aria-haspopup="menu"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TableActionsMenuItemProps {
  children: React.ReactNode;
  onClick: () => void;
}

export function TableActionsMenuItem({ children, onClick }: TableActionsMenuItemProps) {
  return (
    <DropdownMenuItem 
      onClick={onClick}
      className="focus:bg-[#E6F7F6] focus:text-[#046E75] hover:bg-[#E6F7F6] hover:text-[#046E75]"
    >
      {children}
    </DropdownMenuItem>
  );
}
