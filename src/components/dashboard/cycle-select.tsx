"use client";

import { useState } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportCycleOption = {
  value: string;
  label: string;
};

export const reportCycleOptions: ReportCycleOption[] = [
  { value: "2026-06", label: "June cycle" },
  { value: "2026-05", label: "May cycle" },
  { value: "2026-Q2", label: "Last quarter" },
];

export function CycleSelect() {
  const [selectedCycle, setSelectedCycle] = useState(reportCycleOptions[0]);

  return (
    <Listbox value={selectedCycle} onChange={setSelectedCycle}>
      <div className="relative w-full md:w-44">
        <ListboxButton className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-zinc-950/10 bg-white px-3 text-left text-sm/6 font-medium text-zinc-950 shadow-sm outline-none transition hover:bg-zinc-50 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10">
          <span className="truncate">{selectedCycle.label}</span>
          <ChevronDown size={16} className="shrink-0 text-zinc-500" aria-hidden="true" />
        </ListboxButton>
        <ListboxOptions className="absolute right-0 z-30 mt-2 w-full min-w-44 overflow-hidden rounded-xl border border-zinc-950/10 bg-white p-1 text-sm/6 shadow-xl outline-none">
          {reportCycleOptions.map((cycle) => (
            <ListboxOption
              key={cycle.value}
              value={cycle}
              className={({ focus, selected }) =>
                cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-zinc-700",
                  focus ? "bg-zinc-100 text-zinc-950" : "",
                  selected ? "font-semibold text-zinc-950" : "",
                )
              }
            >
              {({ selected }) => (
                <>
                  <Check
                    size={15}
                    className={selected ? "text-zinc-950" : "text-transparent"}
                    aria-hidden="true"
                  />
                  <span className="truncate">{cycle.label}</span>
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
