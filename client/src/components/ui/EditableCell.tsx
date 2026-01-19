import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { validateField, type FieldName } from "@/lib/validation/contactSchemas";

type EditableCellProps = {
  field: FieldName;
  value: string | null;
  onSave: (value: string | null) => Promise<void>;
  onCancel: () => void;
  type: 'text' | 'email' | 'phone' | 'select';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function EditableCell({
  field,
  value: initialValue,
  onSave,
  onCancel,
  type,
  options = [],
  placeholder = "Click to edit",
  ariaLabel,
  className,
}: EditableCellProps) {
  const [value, setValue] = useState<string>(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when initialValue changes
  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  // Focus input on mount
  useEffect(() => {
    if (type !== 'select') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [type]);

  // Handle save with validation
  const handleSave = async (newValue: string | null) => {
    const stringValue = newValue ?? '';
    const normalizedValue = stringValue.trim() || null;
    
    // Validate the input
    const { valid, error: validationError } = validateField(field, stringValue);
    if (!valid) {
      setError(validationError ?? 'Validation error');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(normalizedValue);
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Failed to save. Please try again.");
      // Revert to last saved value on error
      setValue(initialValue || "");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle blur for text inputs
  const handleBlur = () => {
    if (value !== initialValue) {
      handleSave(value);
    } else {
      onCancel();
    }
  };

  // Handle key down for text inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setValue(initialValue || "");
      setError(null);
      onCancel();
    }
  };

  // Handle select change
  const handleSelectChange = (newValue: string) => {
    setValue(newValue);
    handleSave(newValue);
  };

  if (type === 'select') {
    return (
      <div className={cn("relative", className)}>
        <Select
          value={value}
          onValueChange={handleSelectChange}
          disabled={isSaving}
        >
          <SelectTrigger 
            className="h-8 text-sm border-primary-500 focus:ring-primary-200"
            aria-label={ariaLabel}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-red-500">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <Input
        ref={inputRef}
        type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("h-8 px-2 py-1 text-sm border-primary-500 focus:ring-primary-200", {
          "border-red-500 focus-visible:ring-red-200": error,
        })}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={isSaving}
      />
      {isSaving && (
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
