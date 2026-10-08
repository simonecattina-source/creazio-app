// CSV (Excel) export of the glucose/insulin diary.
// Builds a plain CSV string (no screen capture) and downloads it natively:
//  - Web / iOS Safari: Blob + temporary <a download> -> instant file download.
//  - Native app: write to cache with expo-file-system + share via expo-sharing.

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { MealKey, Measurement, MomentKey } from "@/src/types";

const SEP = ";";
const FILENAME = "diario_glicemia.csv";

const HEADERS = [
  "Data",
  "Colazione Prima",
  "Colazione Dopo",
  "Pranzo Prima",
  "Pranzo Dopo",
  "Merenda Prima",
  "Merenda Dopo",
  "Cena Prima",
  "Cena Dopo",
  "Notte",
];

type Col =
  | { meal: Exclude<MealKey, "notte">; phase: "prima" | "dopo" }
  | { meal: "notte" };

const COLUMNS: Col[] = [
  { meal: "colazione", phase: "prima" },
  { meal: "colazione", phase: "dopo" },
  { meal: "pranzo", phase: "prima" },
  { meal: "pranzo", phase: "dopo" },
  { meal: "merenda", phase: "prima" },
  { meal: "merenda", phase: "dopo" },
  { meal: "cena", phase: "prima" },
  { meal: "cena", phase: "dopo" },
  { meal: "notte" },
];

const MOMENT_FOR_COL: Record<string, MomentKey> = {
  "colazione:prima": "prima_colazione",
  "colazione:dopo": "dopo_colazione",
  "pranzo:prima": "prima_pranzo",
  "pranzo:dopo": "dopo_pranzo",
  "merenda:prima": "prima_merenda",
  "merenda:dopo": "dopo_merenda",
  "cena:prima": "prima_cena",
  "cena:dopo": "dopo_cena",
  "notte:single": "notte",
};

function colMoment(col: Col): MomentKey {
  return col.meal === "notte"
    ? MOMENT_FOR_COL["notte:single"]
    : MOMENT_FOR_COL[`${col.meal}:${col.phase}`];
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function displayDay(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

// A cell's text: glucose (+ insulin) per measurement; multiple entries joined.
function cellValue(items: Measurement[]): string {
  if (items.length === 0) return "";
  return items
    .map((m) => (m.insulin != null ? `${m.glucose} - ${m.insulin} UI` : `${m.glucose}`))
    .join(" / ");
}

// A cell's notes: textual notes for each measurement in the slot, empty ones
// filtered out, multiple notes joined with " / ".
function cellNotes(items: Measurement[]): string {
  return items
    .map((m) => m.note)
    .filter((n): n is string => !!n && n.trim().length > 0)
    .map((n) => n.trim())
    .join(" / ");
}

function escapeField(value: string): string {
  if (value.includes(SEP) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildDiaryCsv(measurements: Measurement[]): string {
  const byDay = new Map<string, Record<MomentKey, Measurement[]>>();
  for (const m of measurements) {
    const key = dayKey(m.dateISO);
    if (!byDay.has(key)) byDay.set(key, {} as Record<MomentKey, Measurement[]>);
    const bucket = byDay.get(key)!;
    (bucket[m.moment] ||= []).push(m);
  }
  for (const bucket of byDay.values()) {
    for (const key of Object.keys(bucket) as MomentKey[]) {
      bucket[key].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }
  }

  const days = Array.from(byDay.keys()).sort(); // chronological ascending
  const lines: string[] = [HEADERS.map(escapeField).join(SEP)];

  for (const dk of days) {
    const bucket = byDay.get(dk)!;
    const valueRow = [displayDay(dk)];
    const notesRow = [""]; // empty first cell under the Data column
    for (const col of COLUMNS) {
      const items = bucket[colMoment(col)] ?? [];
      valueRow.push(cellValue(items));
      notesRow.push(cellNotes(items));
    }
    lines.push(valueRow.map(escapeField).join(SEP));
    lines.push(notesRow.map(escapeField).join(SEP));
  }

  // BOM so Excel reads UTF-8 accents correctly.
  return "\uFEFF" + lines.join("\r\n");
}

export async function exportDiaryCsv(measurements: Measurement[]): Promise<void> {
  const csv = buildDiaryCsv(measurements);

  if (Platform.OS === "web") {
    const g = globalThis as any;
    const blob = new g.Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement("a");
    a.href = url;
    a.setAttribute("download", FILENAME);
    g.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => g.URL.revokeObjectURL(url), 1000);
    return;
  }

  const fileUri = (FileSystem.cacheDirectory ?? "") + FILENAME;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Esporta Diario CSV",
      UTI: "public.comma-separated-values-text",
    });
  }
}
