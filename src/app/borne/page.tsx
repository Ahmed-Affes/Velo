import { getBorneBootstrapAction } from "@/app/actions/borne";
import { BorneKiosk } from "@/components/borne/BorneKiosk";

export const dynamic = "force-dynamic";

export default async function BornePage() {
  const data = await getBorneBootstrapAction();

  if ("error" in data && data.error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="card-sfax border-[#C8553D] p-6">
          <h1 className="text-2xl font-bold text-[#9B3925]">
            Base de données non initialisée
          </h1>
          <p className="mt-2 text-sm">
            {data.error} Exécutez d&apos;abord{" "}
            <code className="font-mono-sfax">supabase/schema.sql</code> dans
            votre projet Supabase.
          </p>
        </div>
      </main>
    );
  }

  return (
    <BorneKiosk
      initialStations={data.stations ?? []}
      initialTypes={data.types ?? []}
      initialStation={data.activeStation ?? null}
      initialBikes={(data.bikes as never[]) ?? []}
    />
  );
}
