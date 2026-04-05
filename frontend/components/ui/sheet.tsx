"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "bottom",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
  side?: "bottom" | "right";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col gap-4 border border-foreground/10 bg-card p-6 shadow-2xl duration-200 dark:border-foreground/20",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl",
            side === "right" &&
              "inset-y-0 end-0 h-full w-full max-w-md rounded-none sm:rounded-s-2xl"
          )}
        >
          <Dialog.Close className="absolute end-4 top-4 rounded-full p-1 opacity-70 hover:opacity-100">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
