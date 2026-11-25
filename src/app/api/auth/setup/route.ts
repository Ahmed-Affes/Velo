import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/auth";

const setupSchema = z.object({
  matricule: z.coerce.number().int().positive("Matricule invalide"),
  nom: z.string().trim().min(2, "Nom requis (min. 2 caractères)"),
  prenom: z.string().trim().min(2, "Prénom requis (min. 2 caractères)"),
  tel: z
    .string()
    .regex(/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/, "Format +216 XX XXX XXX requis"),
  password: z.string().min(6, "Mot de passe min. 6 caractères"),
});

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error: countErr } = await supabase
      .from("personnel")
      .select("*", { count: "exact", head: true });

    if (countErr) {
      return NextResponse.json(
        { error: "Base de données non initialisée." },
        { status: 500 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "La configuration initiale a déjà été effectuée." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 }
      );
    }

    const { matricule, nom, prenom, tel, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: created, error: insertErr } = await supabase
      .from("personnel")
      .insert({
        matricule,
        nom,
        prenom,
        tel,
        role: "RESPONSABLE",
        specialite: null,
        password_hash: passwordHash,
        actif: true,
      })
      .select("matricule, nom, prenom, role, specialite")
      .single();

    if (insertErr || !created) {
      return NextResponse.json(
        { error: insertErr?.message ?? "Impossible de créer le compte." },
        { status: 400 }
      );
    }

    await setSessionCookie({
      matricule: created.matricule,
      nom: created.nom,
      prenom: created.prenom,
      role: created.role,
      specialite: created.specialite,
    });

    return NextResponse.json({ ok: true, redirectTo: "/admin" });
  } catch {
    return NextResponse.json(
      { error: "Erreur réseau ou serveur indisponible." },
      { status: 500 }
    );
  }
}
