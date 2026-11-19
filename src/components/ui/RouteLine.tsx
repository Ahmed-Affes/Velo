"use client";

export function RouteLineStepper({
  steps,
  currentStep,
}: {
  steps: { id: string | number; label: string }[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#14232B] font-mono-sfax text-xs font-semibold ${
                  done
                    ? "bg-[#5E7B3A] text-[#FFFDF8]"
                    : active
                    ? "bg-[#F0A42B] text-[#14232B]"
                    : "bg-[#F6F1E7] text-[#14232B]/60"
                }`}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  active ? "text-[#14232B] font-semibold" : "text-[#14232B]/70"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="mx-3 flex-1 border-t-2 border-dotted border-[#0E5A6B]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RouteLineDivider({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[#14232B] bg-[#0E5A6B]" />
      <div className="flex-1 border-t-2 border-dotted border-[#0E5A6B]/60" />
      {label && (
        <span className="font-mono-sfax text-xs uppercase tracking-wider text-[#0E5A6B]">
          {label}
        </span>
      )}
      {label && <div className="flex-1 border-t-2 border-dotted border-[#0E5A6B]/60" />}
      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[#14232B] bg-[#F0A42B]" />
    </div>
  );
}
