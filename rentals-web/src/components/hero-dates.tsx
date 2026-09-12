"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { useState } from "react";

import { PressButton } from "@/components/motion/pressable";
import { Sheet } from "@/components/motion/sheet";
import { SearchForm } from "@/components/search-form";

/**
 * The date question, presented the way each device wants to be asked it.
 *
 * On a wide screen the form is simply there, because there is room for it and
 * a click to reveal a form that would have fitted is a click spent on nothing.
 * On a phone it is one large target that brings the form up as a sheet, because
 * three fields and a toggle crammed under a headline leaves neither the
 * headline nor the fields any room, and a control you can throw back down with
 * your thumb is easier to dismiss than a form you have to scroll past.
 *
 * Same form either way. Only the presentation differs.
 */
export const HeroDates = ({ selfDriveEnabled }: { selfDriveEnabled: boolean }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden lg:block">
        <SearchForm tone="glass" selfDriveEnabled={selfDriveEnabled} />
      </div>

      <PressButton
        onClick={() => setOpen(true)}
        className="material-night vibrant flex w-full items-center gap-3 rounded-[20px] px-5 py-4 text-start text-paper lg:hidden"
      >
        <CalendarDays className="size-5 shrink-0 text-amber" aria-hidden />
        <span className="flex-1">
          <span className="block text-[0.9375rem] font-semibold">When do you need it?</span>
          <span className="t-caption block text-paper/65">
            Pick your dates and see what is free
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-paper/45" aria-hidden />
      </PressButton>

      <Sheet open={open} onClose={() => setOpen(false)} title="Choose your dates">
        <h2 className="t-headline font-display mb-4 text-ink">When do you need it?</h2>
        <SearchForm tone="light" selfDriveEnabled={selfDriveEnabled} />
      </Sheet>
    </>
  );
};
