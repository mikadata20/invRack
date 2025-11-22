"use client";

import {
  Panel as _ResizablePanel, // Renamed imported Panel
  PanelGroup as _ResizablePanelGroup, // Renamed imported PanelGroup
  PanelResizeHandle as _ResizablePanelResizeHandle, // Renamed imported PanelResizeHandle
} from "react-resizable-panels";

import { cn } from "@/lib/utils";
import * as React from "react";

const ResizablePanelGroupContext = React.createContext<{
  direction: "horizontal" | "vertical" | undefined;
}>({
  direction: undefined,
});

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof _ResizablePanelGroup>, // Use renamed import type
  React.ComponentPropsWithoutRef<typeof _ResizablePanelGroup> // Use renamed import type
>(({ className, direction, ...props }, ref) => (
  <ResizablePanelGroupContext.Provider value={{ direction }}>
    <_ResizablePanelGroup // Use renamed imported component
      ref={ref}
      className={cn(
        "flex h-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      direction={direction}
      {...props}
    />
  </ResizablePanelGroupContext.Provider>
));
ResizablePanelGroup.displayName = "ResizablePanelGroup";

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof _ResizablePanel>, // Use renamed import type
  React.ComponentPropsWithoutRef<typeof _ResizablePanel> // Use renamed import type
>(({ className, ...props }, ref) => (
  <_ResizablePanel // Use renamed imported component
    ref={ref}
    className={cn(className)}
    {...props}
  />
));
ResizablePanel.displayName = "ResizablePanel";

interface ResizableHandleProps extends React.ComponentPropsWithoutRef<typeof _ResizablePanelResizeHandle> {
  withHandle?: boolean; // Custom prop
}

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof _ResizablePanelResizeHandle>, // Ref type for the forwarded ref
  ResizableHandleProps // Props type for the forwarded component
>(({ className, withHandle, ...props }, ref) => {
  const { direction } = React.useContext(ResizablePanelGroupContext);

  // Cast the component to a type that explicitly accepts a ref
  const PanelResizeHandleWithRef = _ResizablePanelResizeHandle as React.ComponentType<
    React.ComponentProps<typeof _ResizablePanelResizeHandle> & { ref?: React.ForwardedRef<any> }
  >;

  return (
    <PanelResizeHandleWithRef // Use the casted component
      ref={ref} // Now TypeScript should accept 'ref' here
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
        withHandle &&
          "after:bg-border after:opacity-0 after:transition-all after:hover:opacity-100 hover:bg-primary/50",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-4 items-center justify-center rounded-sm border bg-background">
          {direction === "vertical" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-2.5 w-2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-2.5 w-2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
      )}
    </PanelResizeHandleWithRef>
  );
});
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };