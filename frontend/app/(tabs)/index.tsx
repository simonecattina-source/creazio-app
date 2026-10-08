import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Toast, ToastKind } from "@/src/components/Toast";
import { exportDiaryCsv } from "@/src/csv";
import { useEditRequest } from "@/src/editStore";
import { usesNativeTabs } from "@/src/navigation";
import {
  useAddMeasurement,
  useMeasurements,
  useUpdateMeasurement,
} from "@/src/measurements";
import { MOMENTS, MomentKey } from "@/src/types";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateText = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const toTimeText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseWhen(dateText: string, timeText: string): Date | null {
  const dm = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const tm = timeText.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const d = new Date(+dm[3], +dm[2] - 1, +dm[1], +tm[1], +tm[2], 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "long" });
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function InserimentoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const editRequest = useEditRequest();

  const add = useAddMeasurement();
  const update = useUpdateMeasurement();
  const { data } = useMeasurements();

  const [when, setWhen] = useState(new Date());
  const [dateText, setDateText] = useState(() => toDateText(new Date()));
  const [timeText, setTimeText] = useState(() => toTimeText(new Date()));
  const [glucose, setGlucose] = useState("");
  const [insulin, setInsulin] = useState("");
  const [moment, setMoment] = useState<MomentKey | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [androidPicker, setAndroidPicker] = useState<null | "date" | "time">(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const [exporting, setExporting] = useState(false);
  // One-shot consumption of each edit request by its token (never mutate the
  // store from inside the effect — that drops subsequent transitions on web).
  const handledTokenRef = useRef(0);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  // Apply the measurement date to all date representations at once.
  function applyWhen(d: Date) {
    setWhen(d);
    setDateText(toDateText(d));
    setTimeText(toTimeText(d));
  }

  function resetForm() {
    applyWhen(new Date());
    setGlucose("");
    setInsulin("");
    setNote("");
    setMoment(null);
    setEditingId(null);
    setError(null);
  }

  // Load a measurement into the form when an edit is requested from Storico.
  useEffect(() => {
    if (!editRequest.id || editRequest.token === 0) return;
    if (handledTokenRef.current === editRequest.token) return;
    const m = (data ?? []).find((x) => x.id === editRequest.id);
    if (!m) return; // wait until local data is available (effect re-runs on data)
    handledTokenRef.current = editRequest.token;
    const d = new Date(m.dateISO);
    applyWhen(d);
    setGlucose(String(m.glucose));
    setInsulin(m.insulin != null ? String(m.insulin) : "");
    setMoment(m.moment);
    setNote(m.note ?? "");
    setEditingId(m.id);
    setError(null);
  }, [editRequest, data]);

  function cancelEdit() {
    resetForm();
  }

  async function onExportCsv() {
    if (!data || data.length === 0) {
      setToast({ msg: "Nessun dato da esportare", kind: "info" });
      return;
    }
    try {
      setExporting(true);
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await exportDiaryCsv(data);
    } catch {
      setToast({ msg: "Errore durante l'esportazione", kind: "error" });
    } finally {
      setExporting(false);
    }
  }

  const gNum = parseInt(glucose, 10);
  const glucoseColor = useMemo(() => {
    if (!glucose || Number.isNaN(gNum)) return colors.onSurface;
    if (gNum > 180) return colors.error;
    if (gNum < 70) return colors.warning;
    return colors.success;
  }, [glucose, gNum, colors]);

  function onChangeDate(_e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setAndroidPicker(null);
    if (!selected) return;
    const next = new Date(when);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    applyWhen(next);
  }
  function onChangeTime(_e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setAndroidPicker(null);
    if (!selected) return;
    const next = new Date(when);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    applyWhen(next);
  }
  function onWebDateText(t: string) {
    setDateText(t);
    const p = parseWhen(t, timeText);
    if (p) setWhen(p);
  }
  function onWebTimeText(t: string) {
    setTimeText(t);
    const p = parseWhen(dateText, t);
    if (p) setWhen(p);
  }

  async function onSave() {
    const value = parseInt(glucose, 10);
    if (!glucose || Number.isNaN(value) || value <= 0 || value > 1000) {
      setError("Inserisci un valore glicemico valido (1-1000 mg/dL).");
      return;
    }
    if (!moment) {
      setError("Seleziona il momento della giornata.");
      return;
    }
    // On web the canonical date comes from the text fields.
    let effectiveWhen = when;
    if (Platform.OS === "web") {
      const p = parseWhen(dateText, timeText);
      if (!p) {
        setError("Data/ora non valida. Usa i formati GG/MM/AAAA e HH:MM.");
        return;
      }
      effectiveWhen = p;
    }
    setError(null);

    const insulinNum = insulin.trim() ? parseFloat(insulin.replace(",", ".")) : null;
    const payload = {
      dateISO: effectiveWhen.toISOString(),
      glucose: value,
      insulin: insulinNum != null && !Number.isNaN(insulinNum) ? insulinNum : null,
      moment,
      note: note.trim() ? note.trim() : null,
    };

    if (editingId) {
      await update.mutateAsync({ ...payload, id: editingId });
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast({ msg: "Misurazione aggiornata", kind: "success" });
      resetForm();
      return;
    }

    await add.mutateAsync(payload);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast({ msg: "Misurazione salvata", kind: "success" });
    resetForm();
  }

  const pending = add.isPending || update.isPending;

  return (
    <View style={styles.screen} testID="inserimento-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            {editingId ? "Modifica Misurazione" : "Nuova Misurazione"}
          </Text>
          <Text style={styles.headerSub}>Glicemia & Insulina</Text>
        </View>
        <Pressable
          onPress={onExportCsv}
          disabled={exporting}
          style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}
          testID="export-csv-button"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.onBrandPrimary} />
          ) : (
            <Ionicons name="grid-outline" size={16} color={colors.onBrandPrimary} />
          )}
          <Text style={styles.exportText}>Esporta CSV</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        {editingId && (
          <View style={styles.editBanner} testID="edit-banner">
            <Ionicons name="create-outline" size={16} color={colors.onInfo} />
            <Text style={styles.editBannerText}>Stai modificando una misurazione</Text>
            <Pressable onPress={cancelEdit} hitSlop={10} testID="cancel-edit-button">
              <Ionicons name="close-circle" size={18} color={colors.onInfo} />
            </Pressable>
          </View>
        )}

        {/* Date & time */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Data e Ora</Text>
          {Platform.OS === "ios" ? (
            <View style={styles.dtRow}>
              <DateTimePicker
                value={when}
                mode="date"
                display="compact"
                onChange={onChangeDate}
                maximumDate={new Date()}
                locale="it-IT"
                testID="date-picker"
              />
              <DateTimePicker
                value={when}
                mode="time"
                display="compact"
                onChange={onChangeTime}
                locale="it-IT"
                testID="time-picker"
              />
            </View>
          ) : Platform.OS === "android" ? (
            <View style={styles.dtRow}>
              <Pressable style={styles.dtChip} onPress={() => setAndroidPicker("date")} testID="open-date-picker">
                <Ionicons name="calendar-outline" size={16} color={colors.brandPrimary} />
                <Text style={styles.dtChipText}>{formatDate(when)}</Text>
              </Pressable>
              <Pressable style={styles.dtChip} onPress={() => setAndroidPicker("time")} testID="open-time-picker">
                <Ionicons name="time-outline" size={16} color={colors.brandPrimary} />
                <Text style={styles.dtChipText}>{formatTime(when)}</Text>
              </Pressable>
              {androidPicker && (
                <DateTimePicker
                  value={when}
                  mode={androidPicker}
                  display="default"
                  onChange={androidPicker === "date" ? onChangeDate : onChangeTime}
                  maximumDate={androidPicker === "date" ? new Date() : undefined}
                />
              )}
            </View>
          ) : (
            <View style={styles.dtRow}>
              <View style={styles.webField}>
                <Ionicons name="calendar-outline" size={16} color={colors.brandPrimary} />
                <TextInput
                  value={dateText}
                  onChangeText={onWebDateText}
                  placeholder="GG/MM/AAAA"
                  placeholderTextColor={colors.muted}
                  style={styles.webInput}
                  testID="web-date-input"
                />
              </View>
              <View style={styles.webField}>
                <Ionicons name="time-outline" size={16} color={colors.brandPrimary} />
                <TextInput
                  value={timeText}
                  onChangeText={onWebTimeText}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.muted}
                  style={styles.webInput}
                  testID="web-time-input"
                />
              </View>
            </View>
          )}
        </View>

        {/* Glucose */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Glicemia</Text>
          <View style={styles.glucoseRow}>
            <TextInput
              value={glucose}
              onChangeText={(t) => setGlucose(t.replace(/[^0-9]/g, ""))}
              placeholder="---"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={[styles.glucoseInput, { color: glucoseColor }]}
              maxLength={4}
              testID="glucose-input"
            />
            <Text style={styles.glucoseUnit}>mg/dL</Text>
          </View>
        </View>

        {/* Insulin */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Insulina (facoltativa)</Text>
          <View style={styles.insulinRow}>
            <TextInput
              value={insulin}
              onChangeText={(t) => setInsulin(t.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.insulinInput}
              maxLength={5}
              testID="insulin-input"
            />
            <Text style={styles.insulinUnit}>UI</Text>
          </View>
        </View>

        {/* Meal moments */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Momento della giornata</Text>
          <View style={styles.chips}>
            {MOMENTS.map((m) => {
              const selected = moment === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    setMoment(m.key);
                    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  }}
                  style={[styles.chip, selected && styles.chipSelected]}
                  testID={`moment-chip-${m.key}`}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={14}
                    color={selected ? colors.onBrandPrimary : colors.onSurfaceSecondary}
                  />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Note */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Note alimentari (facoltative)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Es. pasta al pomodoro, 2 fette biscottate..."
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            multiline
            testID="note-input"
          />
        </View>

        {error && (
          <Text style={styles.errorText} testID="form-error">
            {error}
          </Text>
        )}
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: spacing.md + bottomChrome }]}>
          <Pressable
            onPress={onSave}
            disabled={pending}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            testID="save-measurement-button"
          >
            <Ionicons
              name={editingId ? "save" : "checkmark-circle"}
              size={20}
              color={colors.onBrandPrimary}
            />
            <Text style={styles.saveBtnText}>
              {pending
                ? "Salvataggio..."
                : editingId
                  ? "Aggiorna Misurazione"
                  : "Salva Misurazione"}
            </Text>
          </Pressable>
        </View>
      </KeyboardStickyView>

      <Toast
        message={toast?.msg ?? null}
        kind={toast?.kind}
        onHide={() => setToast(null)}
        bottomOffset={insets.bottom + 90}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.brandPrimary,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerTextWrap: { flex: 1 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.info,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  exportText: { fontFamily: fonts.text, fontSize: 14, fontWeight: "700", color: colors.onBrandPrimary },
  headerTitle: { fontFamily: fonts.display, fontSize: 24, fontWeight: "700", color: colors.onBrandPrimary },
  headerSub: { fontFamily: fonts.text, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.85, marginTop: 2 },
  content: { padding: spacing.lg, gap: spacing.md },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.info,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editBannerText: { flex: 1, fontFamily: fonts.text, fontSize: 14, fontWeight: "600", color: colors.onInfo },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardLabel: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dtRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  dtChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dtChipText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, fontWeight: "600" },
  webField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  webInput: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, fontWeight: "600", minWidth: 100, padding: 0 },
  glucoseRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  glucoseInput: { fontFamily: fonts.display, fontSize: 56, fontWeight: "700", padding: 0, minWidth: 120 },
  glucoseUnit: { fontFamily: fonts.text, fontSize: 16, color: colors.muted, marginBottom: spacing.md, fontWeight: "600" },
  insulinRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  insulinInput: { fontFamily: fonts.display, fontSize: 30, fontWeight: "700", color: colors.onSurface, padding: 0, minWidth: 60 },
  insulinUnit: { fontFamily: fonts.text, fontSize: 15, color: colors.muted, marginBottom: spacing.xs, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  chipTextSelected: { color: colors.onBrandPrimary },
  noteInput: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
    minHeight: 60,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: { fontFamily: fonts.text, fontSize: 14, color: colors.error, paddingHorizontal: spacing.xs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { fontFamily: fonts.text, fontSize: 17, fontWeight: "700", color: colors.onBrandPrimary },
}));
