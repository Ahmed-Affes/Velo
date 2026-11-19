import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { setSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  matricule: z.coerce.number().int().positive("Matricule invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Matricule ou mot de passe incorrect." },
        { status: 400 }
      );
    }

    const { matricule, password } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: person, error } = await supabase
      .from("personnel")
      .select(
        "matricule, nom, prenom, role, specialite, password_hash, actif, failed_attempts, locked_until"
      )
      .eq("matricule", matricule)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erreur de connexion au serveur. Veuillez réessayer." },
        { status: 500 }
      );
    }

    if (!person || !person.actif) {
      return NextResponse.json(
        { error: "Matricule ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    if (person.locked_until) {
      const lockedUntilMs = new Date(person.locked_until).getTime();
      if (lockedUntilMs > Date.now()) {
        const remainingSeconds = Math.ceil((lockedUntilMs - Date.now()) / 1000);
        return NextResponse.json(
          {
            error:
              "Compte verrouillé suite à 5 échecs. Contactez le Responsable.",
            locked: true,
            remainingSeconds,
          },
          { status: 423 }
        );
      }
    }

    const normalizedHash = String(person.password_hash).replace(/^\$2y\$/, "$2b$");
    const valid = await bcrypt.compare(password, normalizedHash);

    if (!valid) {
      const nextAttempts = (person.failed_attempts ?? 0) + 1;
      const shouldLock = nextAttempts >= 5;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
        : null;

      await supabase
        .from("personnel")
        .update({
          failed_attempts: shouldLock ? 5 : nextAttempts,
          locked_until: lockedUntil,
        })
        .eq("matricule", matricule);

      if (shouldLock) {
        return NextResponse.json(
          {
            error:
              "Compte verrouillé suite à 5 échecs. Contactez le Responsable.",
            locked: true,
            remainingSeconds: 600,
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: "Matricule ou mot de passe incorrect.",
          remainingAttempts: 5 - nextAttempts,
        },
        { status: 401 }
      );
    }

    await supabase
      .from("personnel")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("matricule", matricule);

    await setSessionCookie({
      matricule: person.matricule,
      nom: person.nom,
      prenom: person.prenom,
      role: person.role,
      specialite: person.specialite,
    });

    const redirectTo =
      person.role === "RESPONSABLE" ? "/admin" : "/technicien";

    return NextResponse.json({
      ok: true,
      role: person.role,
      redirectTo,
      user: {
        matricule: person.matricule,
        nom: person.nom,
        prenom: person.prenom,
        role: person.role,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur réseau ou serveur indisponible." },
      { status: 500 }
    );
  }
}
