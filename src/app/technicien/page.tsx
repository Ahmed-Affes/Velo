import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTechnicienBootstrapAction } from "@/app/actions/technicien";
import { TechnicienApp } from "@/components/technicien/TechnicienApp";

export const dynamic = "force-dynamic";

const VALID_TABS = new Set(["T1", "T2", "T3", "T4"]);

export default async function TechnicienPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?expired=1");
  }

  const sp = await searchParams;
  const initialTab =
    sp.tab && VALID_TABS.has(sp.tab)
      ? (sp.tab as "T1" | "T2" | "T3" | "T4")
      : "T1";

  const data = await getTechnicienBootstrapAction();
  return (
    <TechnicienApp
      initialData={data as never}
      initialTab={initialTab}
    />
  );
}
