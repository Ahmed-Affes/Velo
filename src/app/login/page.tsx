import { getSupabaseAdmin } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let stations: { id_station: number; nom: string }[] = [];
  let needsInitialSetup = false;

  try {
    const supabase = getSupabaseAdmin();
    const [{ data: stationRows }, { count: personnelCount, error: pErr }] =
      await Promise.all([
        supabase.from("stations").select("id_station, nom").order("id_station"),
        supabase.from("personnel").select("*", { count: "exact", head: true }),
      ]);
    stations = stationRows ?? [];
    if (!pErr && (personnelCount ?? 0) === 0) {
      needsInitialSetup = true;
    }
  } catch {
    stations = [];
  }

  return (
    <LoginForm stations={stations} needsInitialSetup={needsInitialSetup} />
  );
}
