"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  HelpCircle,
  RefreshCw,
  ArrowLeft,
  UserPlus,
  LogIn,
} from "lucide-react";
import { formatTunisianPhoneInput, isValidTunisianPhone } from "@/lib/format";
import type { RolePersonnel } from "@/lib/supabase/types";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Login state
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );
  const [lockSeconds, setLockSeconds] = useState<number>(0);
  const [networkError, setNetworkError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Register state
  const [regMatricule, setRegMatricule] = useState("");
  const [regNom, setRegNom] = useState("");
  const [regPrenom, setRegPrenom] = useState("");
  const [regTel, setRegTel] = useState("+216 ");
  const [regRole, setRegRole] = useState<RolePersonnel>("TECHNICIEN");
  const [regSpecialite, setRegSpecialite] = useState("Freins & transmission");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => {
      setLockSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const canSubmitLogin =
    /^[0-9]+$/.test(matricule.trim()) &&
    password.length > 0 &&
    lockSeconds === 0 &&
    !loading;

  const canSubmitRegister =
    /^[0-9]+$/.test(regMatricule.trim()) &&
    regNom.trim().length >= 2 &&
    regPrenom.trim().length >= 2 &&
    isValidTunisianPhone(regTel) &&
    (regRole === "RESPONSABLE" || regSpecialite.trim().length >= 2) &&
    regPassword.length >= 6 &&
    regPassword === regConfirmPassword &&
    !loading;

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitLogin) return;
    setLoading(true);
    setError(null);
    setNetworkError(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: Number(matricule.trim()),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        setRemainingAttempts(
          typeof data.remainingAttempts === "number"
            ? data.remainingAttempts
            : null
        );
        if (data.locked && typeof data.remainingSeconds === "number") {
          setLockSeconds(data.remainingSeconds);
        }
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/admin");
      router.refresh();
    } catch {
      setNetworkError(true);
      setError("Erreur réseau : impossible de joindre le serveur.");
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitRegister) return;
    setLoading(true);
    setError(null);
    setNetworkError(false);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: Number(regMatricule.trim()),
          nom: regNom.trim(),
          prenom: regPrenom.trim(),
          tel: regTel,
          role: regRole,
          specialite: regRole === "TECHNICIEN" ? regSpecialite.trim() : null,
          password: regPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Impossible de créer le compte.");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/admin");
      router.refresh();
    } catch {
      setNetworkError(true);
      setError("Erreur réseau : impossible de joindre le serveur.");
      setLoading(false);
    }
  }

  const mm = String(Math.floor(lockSeconds / 60)).padStart(2, "0");
  const ss = String(lockSeconds % 60).padStart(2, "0");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left 40% Mer panel with Sfax route-line map */}
      <aside className="relative flex w-full flex-col justify-between overflow-hidden bg-[#0E5A6B] p-8 text-[#FFFDF8] md:w-[40%] md:p-12">
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono-sfax uppercase tracking-wider text-[#9DB8BF] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Accueil VéloSf</span>
          </Link>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">VéloSf</h1>
          <p className="mt-2 text-sm text-[#9DB8BF]">
            CycloSfaxcity · Espace Personnel
          </p>
        </div>

        {/* Stylised route-line map of Sfax stations */}
        <div className="my-8 rounded-[6px] border border-[#9DB8BF]/30 bg-[#14232B]/25 p-5">
          <p className="mb-3 font-mono-sfax text-[11px] uppercase tracking-wider text-[#9DB8BF]">
            Réseau de Sfax — 6 stations actives
          </p>
          <div className="space-y-3 text-sm">
            {[
              "Technopôle de Sfax",
              "Sakiet Ezzit",
              "Route El Ain km 3",
              "Gare SNCFT",
              "Bab Diwan – Médina",
              "Port de Sfax",
            ].map((name, i) => (
              <div key={name} className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full border border-[#14232B] ${
                    i % 2 === 0 ? "bg-[#F0A42B]" : "bg-[#FFFDF8]"
                  }`}
                />
                <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#9DB8BF]">
          Votre rôle (Responsable ou Technicien) vous redirige automatiquement
          vers votre espace de travail.
        </p>
      </aside>

      {/* Right 60% Papier form */}
      <main className="bg-zellige flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="card-sfax w-full max-w-md p-8">
          {/* Onglets Connexion / Créer un compte */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-[4px] py-2 text-sm font-semibold transition-colors ${
                mode === "LOGIN"
                  ? "bg-[#0E5A6B] text-white"
                  : "text-[#14232B] hover:bg-[#E3D9C6]"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Se connecter</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-[4px] py-2 text-sm font-semibold transition-colors ${
                mode === "REGISTER"
                  ? "bg-[#0E5A6B] text-white"
                  : "text-[#14232B] hover:bg-[#E3D9C6]"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Créer un compte</span>
            </button>
          </div>

          {expired && mode === "LOGIN" && (
            <div className="mb-4 flex items-center gap-2 rounded-[6px] border-[1.5px] border-[#B8740B] bg-[#F0A42B]/20 p-3 text-sm text-[#7A4B00]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Votre session a expiré, reconnectez-vous.</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{error}</p>
                  {remainingAttempts !== null &&
                    remainingAttempts > 0 &&
                    mode === "LOGIN" && (
                      <p className="mt-1 font-mono-sfax text-xs">
                        Tentatives restantes avant verrouillage :{" "}
                        {remainingAttempts}
                      </p>
                    )}
                  {lockSeconds > 0 && mode === "LOGIN" && (
                    <p className="mt-1 flex items-center gap-1.5 font-mono-sfax text-xs font-semibold">
                      <Lock className="h-3.5 w-3.5" />
                      Déblocage automatique dans {mm}:{ss}
                    </p>
                  )}
                </div>
              </div>
              {networkError && mode === "LOGIN" && (
                <button
                  type="button"
                  onClick={handleLoginSubmit}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              )}
            </div>
          )}

          {mode === "LOGIN" ? (
            <>
              <h2 className="text-2xl font-bold text-[#14232B]">
                Connexion du personnel
              </h2>
              <p className="mt-1 text-sm text-[#14232B]/70">
                Saisissez votre matricule et votre mot de passe CycloSfaxcity.
              </p>

              <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="matricule"
                    className="block text-sm font-semibold text-[#14232B]"
                  >
                    Matricule
                  </label>
                  <input
                    id="matricule"
                    type="text"
                    inputMode="numeric"
                    value={matricule}
                    onChange={(e) =>
                      setMatricule(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="ex. 1001"
                    className="mt-1.5 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2.5 font-mono-sfax text-base"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#14232B]"
                  >
                    Mot de passe
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) =>
                        setCapsLock(e.getModifierState("CapsLock"))
                      }
                      placeholder="••••••••"
                      className="w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2.5 pr-11 text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#14232B]/70 hover:bg-[#E3D9C6]"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {capsLock && (
                    <p className="mt-1 text-xs font-medium text-[#B8740B]">
                      Attention : la touche Verr. Maj. est activée.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmitLogin}
                  className="btn-sfax-primary w-full py-3 text-base"
                >
                  {loading ? "Connexion en cours..." : "Se connecter"}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="inline-flex items-center gap-1 font-medium text-[#0E5A6B] hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Mot de passe oublié ?</span>
                </button>
              </div>

              {showForgot && (
                <div className="mt-3 rounded-[6px] border border-[#E3D9C6] bg-[#F6F1E7] p-3 text-xs leading-relaxed text-[#14232B]/85">
                  <strong>Réinitialisation interne :</strong> pour un Technicien,
                  le mot de passe est réinitialisé par le Responsable depuis
                  l&apos;onglet Équipe. Pour un Responsable, contactez
                  l&apos;administrateur système.
                </div>
              )}

              <div className="mt-6 border-t border-dotted border-[#0E5A6B]/40 pt-4">
                <p className="mb-2 font-mono-sfax text-[11px] uppercase text-[#14232B]/65">
                  Accès démo rapide (Sfax2026!)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatricule("1001");
                      setPassword("Sfax2026!");
                    }}
                    className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1 font-mono-sfax text-xs hover:bg-[#E3D9C6]"
                  >
                    1001 · Ahmed (Resp.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatricule("2014");
                      setPassword("Sfax2026!");
                    }}
                    className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1 font-mono-sfax text-xs hover:bg-[#E3D9C6]"
                  >
                    2014 · Yasmine (Tech.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatricule("2019");
                      setPassword("Sfax2026!");
                    }}
                    className="rounded border border-[#14232B] bg-[#F6F1E7] px-2.5 py-1 font-mono-sfax text-xs hover:bg-[#E3D9C6]"
                  >
                    2019 · Karim (Tech.)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#14232B]">
                Créer un compte personnel
              </h2>
              <p className="mt-1 text-sm text-[#14232B]/70">
                Enregistrez un nouveau profil Responsable ou Technicien.
              </p>

              <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold">
                      Matricule
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={regMatricule}
                      onChange={(e) =>
                        setRegMatricule(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="ex. 3001"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Rôle</label>
                    <select
                      value={regRole}
                      onChange={(e) =>
                        setRegRole(e.target.value as RolePersonnel)
                      }
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm font-medium"
                    >
                      <option value="TECHNICIEN">Technicien</option>
                      <option value="RESPONSABLE">Responsable</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold">Prénom</label>
                    <input
                      type="text"
                      value={regPrenom}
                      onChange={(e) => setRegPrenom(e.target.value)}
                      placeholder="Sami"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Nom</label>
                    <input
                      type="text"
                      value={regNom}
                      onChange={(e) => setRegNom(e.target.value)}
                      placeholder="Ayadi"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold">
                    Téléphone (+216 XX XXX XXX)
                  </label>
                  <input
                    type="text"
                    value={regTel}
                    onChange={(e) =>
                      setRegTel(formatTunisianPhoneInput(e.target.value))
                    }
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 font-mono-sfax text-sm"
                    required
                  />
                </div>

                {regRole === "TECHNICIEN" && (
                  <div>
                    <label className="block text-xs font-semibold">
                      Spécialité
                    </label>
                    <input
                      type="text"
                      value={regSpecialite}
                      onChange={(e) => setRegSpecialite(e.target.value)}
                      placeholder="Freins & transmission"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold">
                      Mot de passe (min. 6)
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">
                      Confirmation
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>

                {regConfirmPassword && regPassword !== regConfirmPassword && (
                  <p className="text-xs font-semibold text-[#C8553D]">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmitRegister}
                  className="btn-sfax-primary w-full py-3 text-base"
                >
                  {loading ? "Création en cours..." : "Créer mon compte"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono-sfax">Chargement...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
