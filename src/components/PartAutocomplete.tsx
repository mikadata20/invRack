import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface PartAutocompleteProps {
  value: string;
  onSelect: (value: string, bomData?: any) => void;
  placeholder?: string;
  searchField?: "child_part" | "kanban_code";
}

export function PartAutocomplete({ 
  value, 
  onSelect, 
  placeholder = "Search part number...",
  searchField = "child_part"
}: PartAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bom_master")
      .select("*")
      .order(searchField);

    if (!error && data) {
      setParts(data);
    }
    setLoading(false);
  };

  const handleSelect = (selectedValue: string) => {
    const selectedPart = parts.find(
      (p) => p[searchField]?.toLowerCase() === selectedValue.toLowerCase()
    );
    onSelect(selectedValue, selectedPart);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No part found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {parts.map((part) => (
              <CommandItem
                key={part.id}
                value={part[searchField]}
                onSelect={handleSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === part[searchField] ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{part[searchField]}</span>
                  <span className="text-xs text-muted-foreground">
                    {part.part_name} - {part.rack}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
