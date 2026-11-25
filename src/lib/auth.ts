import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { RolePersonnel } from "@/lib/supabase/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface StaffSession {
  matricule: number;
  nom: string;
  prenom: string;
  role: RolePersonnel;
  specialite: string | null;
}

const COOKIE_NAME = "velosf_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "velosf-salines-de-sfax-fallback-dev-secret-2026";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: StaffSession): Promise<string> {
  return new SignJWT({
    matricule: session.matricule,
    nom: session.nom,
    prenom: session.prenom,
    role: session.role,
    specialite: session.specialite,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.matricule !== "number" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      matricule: payload.matricule,
      nom: String(payload.nom ?? ""),
      prenom: String(payload.prenom ?? ""),
      role: payload.role as RolePersonnel,
      specialite: payload.specialite ? String(payload.specialite) : null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: person, error } = await supabase
      .from("personnel")
      .select("matricule, nom, prenom, role, specialite, actif")
      .eq("matricule", session.matricule)
      .maybeSingle();

    if (error || !person || !person.actif) {
      return null;
    }

    return {
      matricule: person.matricule,
      nom: person.nom,
      prenom: person.prenom,
      role: person.role,
      specialite: person.specialite,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: StaffSession): Promise<void> {
  const token = await signSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireRole(
  allowed: RolePersonnel[]
): Promise<StaffSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("SESSION_EXPIRED");
  }
  if (!allowed.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
