export function formatDT(amount: number): string {
  return `${amount.toFixed(3).replace(".", ",")} DT`;
}

export function formatDate(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatTime(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

export function formatDateTime(dateInput: string | Date): string {
  return `${formatDate(dateInput)} ${formatTime(dateInput)}`;
}

export function formatDurationMinutes(minutes: number): string {
  const mins = Math.max(0, Math.round(minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

export function formatElapsedSince(startIso: string): string {
  const start = new Date(startIso).getTime();
  const diffMin = Math.max(0, Math.floor((Date.now() - start) / 60000));
  return formatDurationMinutes(diffMin);
}

export function isValidCIN(cin: string): boolean {
  return /^[0-9]{8}$/.test(cin);
}

export function isValidTunisianPhone(tel: string): boolean {
  return /^\+216 [0-9]{2} [0-9]{3} [0-9]{3}$/.test(tel);
}

export function formatTunisianPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("216") ? digits.slice(3) : digits;
  const trimmed = local.slice(0, 8);
  const p1 = trimmed.slice(0, 2);
  const p2 = trimmed.slice(2, 5);
  const p3 = trimmed.slice(5, 8);
  return ["+216", p1, p2, p3].filter(Boolean).join(" ");
}

export function isValidSerial(serial: string): boolean {
  return /^VSF-[0-9]{6}$/.test(serial);
}

export function isValidPlate(plate: string): boolean {
  return /^[0-9]{1,3} TUN [0-9]{1,4}$/.test(plate);
}

export function calcOccasionnelAmounts(dureeMinutes: number): {
  frais: number;
  garantie: number;
  total: number;
} {
  // Barème tarifaire : 1,500 DT / 30 min + garantie fixe 30,000 DT
  const halfHours = Math.max(1, Math.ceil(dureeMinutes / 30));
  const frais = Number((halfHours * 1.5).toFixed(3));
  const garantie = 30.0;
  return {
    frais,
    garantie,
    total: Number((frais + garantie).toFixed(3)),
  };
}

export function maskIdentity(nom: string, prenom: string): string {
  const p = prenom.trim();
  const n = nom.trim();
  const pMask = p.length > 2 ? `${p[0]}***${p[p.length - 1]}` : p;
  const nMask = n.length > 2 ? `${n[0]}***${n[n.length - 1]}` : n;
  return `${pMask} ${nMask}`;
}
