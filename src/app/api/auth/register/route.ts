import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/auth";

const registerSchema = z
  .object({
    matricule: z.coerce
      .number()
      .int()
      .positive("Le matricule doit être un nombre positif."),
    nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
    prenom: z
      .string()
      .trim()
      .min(2, "Le prénom doit contenir au moins 2 caractères."),
    tel: z
      .string()
      .regex(/^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/, "Format requis : +216 XX XXX XXX."),
    role: z.enum(["RESPONSABLE", "TECHNICIEN"]),
    specialite: z.string().trim().nullable().optional(),
    password: z
      .string()
      .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  })
  .refine(
    (data) =>
      data.role !== "TECHNICIEN" ||
      (data.specialite && data.specialite.trim().length >= 2),
    {
      message: "La spécialité est obligatoire pour un technicien.",
      path: ["specialite"],
    }
  );

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("personnel")
      .select("matricule")
      .eq("matricule", input.matricule)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ce matricule est déjà enregistré." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const { data: created, error } = await supabase
      .from("personnel")
      .insert({
        matricule: input.matricule,
        nom: input.nom,
        prenom: input.prenom,
        tel: input.tel,
        role: input.role,
        specialite: input.role === "TECHNICIEN" ? input.specialite?.trim() : null,
        password_hash: passwordHash,
        actif: true,
      })
      .select("matricule, nom, prenom, role, specialite")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? "Impossible de créer le compte." },
        { status: 500 }
      );
    }

    await setSessionCookie({
      matricule: created.matricule,
      nom: created.nom,
      prenom: created.prenom,
      role: created.role,
      specialite: created.specialite,
    });

    const redirectTo =
      created.role === "RESPONSABLE" ? "/admin" : "/technicien";

    return NextResponse.json({
      ok: true,
      role: created.role,
      redirectTo,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur réseau ou serveur indisponible." },
      { status: 500 }
    );
  }
}
