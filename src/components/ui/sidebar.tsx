import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const sidebarVariants = cva(
  "flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
      },
      size: {
        default: "w-64",
        sm: "w-56",
        lg: "w-72",
        icon: "w-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  asChild?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      open,
      onOpenChange,
      trigger,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const handleOpenChange = (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      }
      setOpenMobile(newOpen);
    };

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={handleOpenChange} {...props}>
          {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className={cn(sidebarVariants({ variant, size, className }))}
            side="left"
          >
            {children}
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <Comp
        ref={ref}
        className={cn(sidebarVariants({ variant, size, className }))}
        data-sidebar="sidebar"
        data-mobile="false"
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const { onOpenChange } = React.useContext(SidebarContext); // Assuming SidebarContext exists for mobile trigger

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isMobile && onOpenChange) {
      onOpenChange(true);
    }
    if (props.onClick) {
      props.onClick(event);
    }
  };

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8",
        isMobile ? "block" : "hidden", // Only show trigger on mobile
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
      {children}
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

// Dummy context for SidebarTrigger to compile, assuming it's used within a Sidebar
const SidebarContext = React.createContext<{ onOpenChange?: (open: boolean) => void }>({});

export { Sidebar, SidebarTrigger, sidebarVariants };