import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FieldName, validateField } from "@/lib/validation/contactSchemas";

type InlineEditableFieldProps = {
  field: FieldName;
  value: string | null;
  onSave: (value: string | null) => Promise<void>;
  className?: string;
  placeholder?: string;
  inputClassName?: string;
  textClassName?: string;
  displayFormatter?: (value: string) => string;
};

export function InlineEditableField({
  field,
  value: initialValue,
  onSave,
  className,
  placeholder = "Click to edit",
  inputClassName,
  textClassName,
  displayFormatter,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string>(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update local state when initialValue changes
  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  // Handle save with debounce
  const handleSave = async (newValue: string | null) => {
    const stringValue = newValue ?? '';
    const normalizedValue = stringValue.trim() || null;
    
    // Validate the input
    const { valid, error: validationError } = validateField(field, stringValue);
    if (!valid) {
      setError(validationError ?? 'Validation error');
      setSaveStatus("error");
      return;
    }

    setError(null);
    setSaveStatus("saving");
    setIsSaving(true);

    try {
      await onSave(normalizedValue);
      setSaveStatus("saved");
      // Reset saved status after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Failed to save:", err);
      setSaveStatus("error");
      setError("Failed to save. Please try again.");
      // Revert to last saved value on error
      setValue(initialValue || "");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle blur
  const handleBlur = () => {
    if (value !== initialValue) {
      handleSave(value);
    }
    setIsEditing(false);
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setValue(initialValue || "");
      setError(null);
      setSaveStatus("idle");
      setIsEditing(false);
    }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isEditing) {
    return (
      <div className={cn("relative flex items-center gap-2", className)}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn("h-8 px-2 py-1 text-sm", inputClassName, {
            "border-red-500 focus-visible:ring-red-200": error,
          })}
          autoFocus
          disabled={isSaving}
        />
        {saveStatus === "saving" && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-red-500">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <div
        className={cn(
          "min-h-[32px] cursor-text rounded px-2 py-1.5 hover:bg-accent/50",
          textClassName,
          { "text-muted-foreground": !value }
        )}
        onClick={() => setIsEditing(true)}
      >
        {value ? (displayFormatter ? displayFormatter(value) : value) : placeholder}
      </div>
      {saveStatus === "saved" && (
        <span className="absolute -right-2 -top-2 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
          Saved
        </span>
      )}
      {saveStatus === "error" && (
        <span className="absolute -right-2 -top-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-800">
          Error
        </span>
      )}
    </div>
  );
}
