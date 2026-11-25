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
} from "lucide-react";
import { formatTunisianPhoneInput } from "@/lib/format";

interface StationSummary {
  id_station: number;
  nom: string;
}

function LoginFormContent({
  stations,
  needsInitialSetup,
}: {
  stations: StationSummary[];
  needsInitialSetup: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";

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

  // Initial setup fields (only used when personnel table is empty)
  const [setupNom, setSetupNom] = useState("");
  const [setupPrenom, setSetupPrenom] = useState("");
  const [setupTel, setSetupTel] = useState("+216 ");

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => {
      setLockSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const canSubmit =
    /^[0-9]+$/.test(matricule.trim()) &&
    password.length > 0 &&
    lockSeconds === 0 &&
    !loading;

  const canSetup =
    needsInitialSetup &&
    /^[0-9]+$/.test(matricule.trim()) &&
    setupNom.trim().length >= 2 &&
    setupPrenom.trim().length >= 2 &&
    /^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(setupTel) &&
    password.length >= 6 &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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

  async function handleInitialSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!canSetup) return;
    setLoading(true);
    setError(null);
    setNetworkError(false);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: Number(matricule.trim()),
          nom: setupNom.trim(),
          prenom: setupPrenom.trim(),
          tel: setupTel,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Impossible de créer le compte initial.");
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
      {/* Left 40% Mer panel with live stations list */}
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

        {/* Live network status */}
        <div className="my-8 rounded-[6px] border border-[#9DB8BF]/30 bg-[#14232B]/25 p-5">
          <p className="mb-3 font-mono-sfax text-[11px] uppercase tracking-wider text-[#9DB8BF]">
            Réseau CycloSfaxcity — {stations.length} station
            {stations.length > 1 ? "s" : ""} active
            {stations.length > 1 ? "s" : ""}
          </p>
          {stations.length === 0 ? (
            <p className="text-sm text-[#FFFDF8]/75">
              Aucune station configurée pour le moment.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              {stations.map((st, i) => (
                <div key={st.id_station} className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full border border-[#14232B] ${
                      i % 2 === 0 ? "bg-[#F0A42B]" : "bg-[#FFFDF8]"
                    }`}
                  />
                  <span className="font-medium">{st.nom}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-[#9DB8BF]">
          Les comptes du personnel sont créés et gérés exclusivement par le
          Responsable.
        </p>
      </aside>

      {/* Right 60% Papier form */}
      <main className="bg-zellige flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="card-sfax w-full max-w-md p-8">
          {needsInitialSetup ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-[6px] border border-[#0E5A6B] bg-[#0E5A6B]/10 px-2.5 py-1 font-mono-sfax text-xs font-semibold text-[#0E5A6B]">
                <UserPlus className="h-3.5 w-3.5" />
                Configuration initiale
              </div>
              <h2 className="mt-3 text-2xl font-bold text-[#14232B]">
                Créer le Responsable principal
              </h2>
              <p className="mt-1 text-sm text-[#14232B]/70">
                Aucun compte personnel n&apos;existe encore. Créez le premier
                compte Responsable pour démarrer l&apos;application.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]"
                >
                  <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                  {error}
                </div>
              )}

              <form onSubmit={handleInitialSetup} className="mt-5 space-y-3.5">
                <div>
                  <label
                    htmlFor="setup-matricule"
                    className="block text-sm font-semibold text-[#14232B]"
                  >
                    Matricule
                  </label>
                  <input
                    id="setup-matricule"
                    type="text"
                    inputMode="numeric"
                    value={matricule}
                    onChange={(e) =>
                      setMatricule(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="ex. 1001"
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2 font-mono-sfax text-base"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="setup-prenom"
                      className="block text-sm font-semibold text-[#14232B]"
                    >
                      Prénom
                    </label>
                    <input
                      id="setup-prenom"
                      type="text"
                      value={setupPrenom}
                      onChange={(e) => setSetupPrenom(e.target.value)}
                      placeholder="Prénom"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="setup-nom"
                      className="block text-sm font-semibold text-[#14232B]"
                    >
                      Nom
                    </label>
                    <input
                      id="setup-nom"
                      type="text"
                      value={setupNom}
                      onChange={(e) => setSetupNom(e.target.value)}
                      placeholder="Nom"
                      className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="setup-tel"
                    className="block text-sm font-semibold text-[#14232B]"
                  >
                    Téléphone
                  </label>
                  <input
                    id="setup-tel"
                    type="text"
                    value={setupTel}
                    onChange={(e) =>
                      setSetupTel(formatTunisianPhoneInput(e.target.value))
                    }
                    placeholder="+216 XX XXX XXX"
                    className="mt-1 w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2 font-mono-sfax text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="setup-password"
                    className="block text-sm font-semibold text-[#14232B]"
                  >
                    Mot de passe (min. 6 caractères)
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="setup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-[6px] border-[1.5px] border-[#14232B] bg-[#F6F1E7] px-3.5 py-2 pr-11 text-base"
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
                </div>

                <button
                  type="submit"
                  disabled={!canSetup}
                  className="btn-sfax-primary w-full py-3 text-base"
                >
                  {loading
                    ? "Création en cours..."
                    : "Créer le compte et accéder au back-office"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#14232B]">
                Connexion du personnel
              </h2>
              <p className="mt-1 text-sm text-[#14232B]/70">
                Saisissez le matricule et le mot de passe remis par votre
                Responsable.
              </p>

              {expired && (
                <div className="mt-4 flex items-center gap-2 rounded-[6px] border-[1.5px] border-[#B8740B] bg-[#F0A42B]/20 p-3 text-sm text-[#7A4B00]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Votre session a expiré, reconnectez-vous.</span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-[6px] border-[1.5px] border-[#C8553D] bg-[#C8553D]/12 p-3 text-sm text-[#9B3925]"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">{error}</p>
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="mt-1 font-mono-sfax text-xs">
                          Tentatives restantes avant verrouillage :{" "}
                          {remainingAttempts}
                        </p>
                      )}
                      {lockSeconds > 0 && (
                        <p className="mt-1 flex items-center gap-1.5 font-mono-sfax text-xs font-semibold">
                          <Lock className="h-3.5 w-3.5" />
                          Déblocage automatique dans {mm}:{ss}
                        </p>
                      )}
                    </div>
                  </div>
                  {networkError && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Réessayer
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                    placeholder="Saisissez votre matricule"
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
                  disabled={!canSubmit}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export function LoginForm({
  stations,
  needsInitialSetup,
}: {
  stations: StationSummary[];
  needsInitialSetup: boolean;
}) {
  return (
    <Suspense fallback={<div className="p-8 font-mono-sfax">Chargement...</div>}>
      <LoginFormContent
        stations={stations}
        needsInitialSetup={needsInitialSetup}
      />
    </Suspense>
  );
}
