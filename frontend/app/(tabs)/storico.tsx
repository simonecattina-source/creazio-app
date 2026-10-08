import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Toast, ToastKind } from "@/src/components/Toast";
import { requestEdit } from "@/src/editStore";
import { usesNativeTabs } from "@/src/navigation";
import { useDeleteMeasurement, useMeasurements } from "@/src/measurements";
import { exportDiaryCsv } from "@/src/csv";
import { glucoseStatus, Measurement, MOMENT_BY_KEY } from "@/src/types";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface Section {
  title: string;
  dayKey: string;
  data: Measurement[];
}

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function fullDate(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function StoricoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { data, isLoading } = useMeasurements();
  const del = useDeleteMeasurement();

  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Measurement | null>(null);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const sections = useMemo<Section[]>(() => {
    const list = data ?? [];
    const map = new Map<string, Measurement[]>();
    for (const m of list) {
      const k = dayKeyOf(m.dateISO);
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    const keys = Array.from(map.keys()).sort().reverse(); // newest day first
    return keys.map((k) => {
      const items = map.get(k)!.slice().sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      return { title: fullDate(items[0].dateISO), dayKey: k, data: items };
    });
  }, [data]);

  function statusColor(value: number): string {
    const s = glucoseStatus(value);
    return s === "high" ? colors.error : s === "low" ? colors.warning : colors.success;
  }

  async function onExport() {
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await del.mutateAsync(id);
    setToast({ msg: "Misurazione eliminata", kind: "success" });
  }

  const renderItem = ({ item }: { item: Measurement }) => {
    const def = MOMENT_BY_KEY[item.moment];
    const color = statusColor(item.glucose);
    return (
      <View style={styles.row} testID={`measurement-row-${item.id}`}>
        <View style={styles.timeline}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.line} />
        </View>
        <View style={styles.cardItem}>
          <View style={styles.cardTop}>
            <View style={styles.momentTag}>
              <Ionicons name={def.icon as any} size={14} color={colors.brandPrimary} />
              <Text style={styles.momentText}>{def.label}</Text>
            </View>
            <View style={styles.cardTopRight}>
              <Text style={styles.timeText}>{timeOf(item.dateISO)}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  requestEdit(item.id);
                  router.navigate("/");
                }}
                testID={`edit-button-${item.id}`}
              >
                <Ionicons name="pencil" size={18} color={colors.info} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setPendingDelete(item)}
                testID={`delete-button-${item.id}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>
          <View style={styles.valuesRow}>
            <View style={styles.glucoseWrap}>
              <Text style={[styles.glucoseValue, { color }]}>{item.glucose}</Text>
              <Text style={styles.glucoseUnit}>mg/dL</Text>
            </View>
            {item.insulin != null && (
              <View style={styles.insulinWrap}>
                <Ionicons name="water" size={14} color={colors.info} />
                <Text style={styles.insulinValue}>{item.insulin} UI</Text>
              </View>
            )}
          </View>
          {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen} testID="storico-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Storico</Text>
          <Text style={styles.headerSub}>
            {data?.length ?? 0} misurazion{(data?.length ?? 0) === 1 ? "e" : "i"}
          </Text>
        </View>
        <Pressable
          onPress={onExport}
          disabled={exporting}
          style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.85 }]}
          testID="export-csv-button"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.onBrandPrimary} />
          ) : (
            <Ionicons name="grid-outline" size={18} color={colors.onBrandPrimary} />
          )}
          <Text style={styles.exportText}>Esporta CSV</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center} testID="empty-state">
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1651760680066-db9d32bd0357?crop=entropy&cs=srgb&fm=jpg&w=400&q=80" }}
            style={styles.emptyImg}
            contentFit="cover"
          />
          <Text style={styles.emptyTitle}>Nessuna misurazione registrata</Text>
          <Text style={styles.emptySub}>
            Aggiungi la tua prima misurazione dalla scheda &ldquo;Inserisci&rdquo;.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xl + bottomChrome,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={pendingDelete != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPendingDelete(null)}>
          <Pressable style={styles.modalCard} testID="delete-confirm-modal">
            <Ionicons name="trash" size={28} color={colors.error} />
            <Text style={styles.modalTitle}>Eliminare questa misurazione?</Text>
            <Text style={styles.modalSub}>L&apos;operazione non puo essere annullata.</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setPendingDelete(null)}
                testID="cancel-delete-button"
              >
                <Text style={styles.modalBtnGhostText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={confirmDelete}
                testID="confirm-delete-button"
              >
                <Text style={styles.modalBtnDangerText}>Elimina</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  headerTitle: { fontFamily: fonts.display, fontSize: 24, fontWeight: "700", color: colors.onBrandPrimary },
  headerSub: { fontFamily: fonts.text, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.85, marginTop: 2 },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyImg: { width: 140, height: 140, borderRadius: radius.lg, opacity: 0.9 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptySub: { fontFamily: fonts.text, fontSize: 14, color: colors.muted, textAlign: "center" },
  sectionHeader: {
    fontFamily: fonts.text,
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.md },
  timeline: { alignItems: "center", width: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: colors.divider, marginTop: 2 },
  cardItem: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  momentTag: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  momentText: { fontFamily: fonts.text, fontSize: 13, fontWeight: "700", color: colors.onSurfaceSecondary },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timeText: { fontFamily: fonts.text, fontSize: 13, color: colors.muted },
  valuesRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.lg },
  glucoseWrap: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  glucoseValue: { fontFamily: fonts.display, fontSize: 34, fontWeight: "700", lineHeight: 36 },
  glucoseUnit: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginBottom: 5 },
  insulinWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 6 },
  insulinValue: { fontFamily: fonts.text, fontSize: 15, fontWeight: "600", color: colors.onSurfaceSecondary },
  noteText: { fontFamily: fonts.textItalic, fontStyle: "italic", fontSize: 13, color: colors.muted },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  modalSub: { fontFamily: fonts.text, fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: spacing.sm },
  modalActions: { flexDirection: "row", gap: spacing.md, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  modalBtnGhost: { backgroundColor: colors.surfaceSecondary },
  modalBtnGhostText: { fontFamily: fonts.text, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  modalBtnDanger: { backgroundColor: colors.error },
  modalBtnDangerText: { fontFamily: fonts.text, fontSize: 16, fontWeight: "700", color: colors.onError },
}));
