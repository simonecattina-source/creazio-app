import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  surface: "#FFFFFF",
  surfaceSecondary: "#F2F2F7",
  brandPrimary: "#0A66C2",
  onBrandPrimary: "#FFFFFF",
  onSurface: "#1C1C1E",
  muted: "#8E8E93",
  success: "#34C759",
  warning: "#FF9F0A",
  error: "#FF3B30",
};

// Dati finti strutturati per testare l'allineamento perfetto delle colonne
const DATI_LOG_MOCK = [
  {
    title: "Oggi",
    data: [
      { id: "1", glicemia: 110, insulina: "4 UI", tipo: "Prima Colazione", note: "Digiuno", dataDoc: new Date() },
      { id: "2", glicemia: 145, insulina: "2 UI", tipo: "Dopo Colazione", note: "Fetta biscottata", dataDoc: new Date() },
      { id: "3", glicemia: 95,  insulina: "6 UI", tipo: "Prima Pranzo", note: "", dataDoc: new Date() },
      { id: "4", glicemia: 130, insulina: "3 UI", tipo: "Dopo Pranzo", note: "Riso", dataDoc: new Date() },
      { id: "5", glicemia: 115, insulina: "5 UI", tipo: "Prima Cena", note: "", dataDoc: new Date() },
      { id: "6", glicemia: 155, insulina: "2 UI", tipo: "Dopo Cena", note: "Pollo", dataDoc: new Date() }
    ]
  },
  {
    title: "Ieri",
    data: [
      { id: "7", glicemia: 125, insulina: "4 UI", tipo: "Prima Colazione", note: "", dataDoc: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: "8", glicemia: 210, insulina: "8 UI", tipo: "Dopo Pranzo", note: "Dolce", dataDoc: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    ]
  }
];
export default function StoricoScreen() {
  const [filtroAttivo, setFiltroAttivo] = useState<'7' | '30' | 'all'>('all');

  const rientraNelFiltro = (dataMisurazione: Date) => {
    if (filtroAttivo === 'all') return true;
    const oggi = new Date();
    const differenzaInGiorni = (oggi.getTime() - dataMisurazione.getTime()) / (1000 * 3600 * 24);
    return differenzaInGiorni <= parseInt(filtroAttivo);
  };

  const datiFiltrati = DATI_LOG_MOCK.map(sezione => {
    const elementiFiltrati = sezione.data.filter(item => rientraNelFiltro(item.dataDoc));
    return { ...sezione, data: elementiFiltrati };
  }).filter(sezione => sezione.data.length > 0);

  const generaEDesportaPDF = () => {
    // Definizione esatta delle colonne richieste
    const momentiColonne = [
      "Prima Colazione", "Dopo Colazione", "Spuntino", 
      "Prima Pranzo", "Dopo Pranzo", "Merenda", 
      "Prima Cena", "Dopo Cena", "Notte"
    ];

    let corpoTabellaHtml = "";

    datiFiltrati.forEach(sezione => {
      // Inizializziamo i contenitori vuoti per i 9 momenti di questo giorno
      const rigaGlicemie: Record<string, string> = {};
      const rigaInsuline: Record<string, string> = {};
      const rigaNote: Record<string, string> = {};

      momentiColonne.forEach(m => {
        rigaGlicemie[m] = "-";
        rigaInsuline[m] = "-";
        rigaNote[m] = "-";
      });

      // Mappiamo i dati reali nei rispettivi momenti della giornata
      sezione.data.forEach(item => {
        if (momentiColonne.includes(item.tipo)) {
          let colore = '#34C759';
          if (item.glicemia > 180) colore = '#FF3B30';
          if (item.glicemia < 70) colore = '#FF9F0A';

          rigaGlicemie[item.tipo] = `<span style="color: ${colore}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
          rigaInsuline[item.tipo] = item.insulina ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
          rigaNote[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${item.note}</span>` : "-";
        }
      });

      // Costruzione del blocco esatto di 4 righe per questo giorno
      corpoTabellaHtml += `
        <!-- RIGA 1: GLICEMIE -->
        <tr>
          <td class="cell-data" rowspan="4">${sezione.title}</td>
          <td class="cell-label">Glicemia</td>
          ${momentiColonne.map(m => `<td>\${rigaGlicemie[m]}</td>`).join('')}
        </tr>
        <!-- RIGA 2: INSULINE -->
        <tr>
          <td class="cell-label">Insulina</td>
          ${momentiColonne.map(m => `<td>\${rigaInsuline[m]}</td>`).join('')}
        </tr>
        <!-- RIGA 3: NOTE -->
        <tr>
          <td class="cell-label">Note</td>
          ${momentiColonne.map(m => `<td>\${rigaNote[m]}</td>`).join('')}
        </tr>
        <!-- RIGA 4: SEPARATORE / FIRMA -->
        <tr class="row-separator">
          <td class="cell-label">Firma / Note Mediche</td>
          ${momentiColonne.map(() => `<td></td>`).join('')}
        </tr>
      `;
    });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1c1e; margin: 0; padding: 10px; background: #ffffff; }
            h1 { font-size: 22px; color: #0A66C2; margin: 0 0 15px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #c7c7cc; padding: 8px 6px; font-size: 11px; text-align: center; vertical-align: middle; word-wrap: break-word; }
            th { background-color: #f2f2f7; font-weight: bold; font-size: 10px; text-transform: uppercase; }
            .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 12px; width: 80px; }
            .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 8px; width: 90px; }
            .row-separator td { height: 20px; background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>GlicoTrack — Registro Orizzontale Giornaliero</h1>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Parametro</th>
                <th>Prima Colazione</th>
                <th>Dopo Colazione</th>
                <th>Spuntino</th>
                <th>Prima Pranzo</th>
                <th>Dopo Pranzo</th>
                <th>Merenda</th>
                <th>Prima Cena</th>
                <th>Dopo Cena</th>
                <th>Notte</th>
              </tr>
            </thead>
            <tbody>
              ${corpoTabellaHtml || '<tr><td colspan="11">Nessun dato registrato nel periodo selezionato.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const finestraStampa = window.open('', '_blank');
    if (finestraStampa) {
      finestraStampa.document.write(htmlTemplate);
      finestraStampa.document.close();
      finestraStampa.onload = () => {
        finestraStampa.focus();
        finestraStampa.print();
      };
    } else {
      alert("Disattiva il blocco pop-up del browser per visualizzare il registro.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Storico</Text>
        <TouchableOpacity style={styles.exportButton} onPress={generaEDesportaPDF}>
          <Ionicons name="document-text-outline" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.exportText}>Esporta in PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        {['7', '30', 'all'].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterButton, filtroAttivo === f && styles.filterButtonActive]}
            onPress={() => setFiltroAttivo(f as any)}
          >
            <Text style={[styles.filterButtonText, filtroAttivo === f && styles.filterButtonTextActive]}>
              {f === 'all' ? 'Tutti' : `${f} GG`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={datiFiltrati}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineDot, { backgroundColor: COLORS[item.stato as keyof typeof COLORS] }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.valoreGlicemia}>{item.glicemia} <Text style={styles.unitaMisura}>mg/dL</Text></Text>
                <Text style={styles.oraTest}>{item.ora}</Text>
              </View>
              <Text style={styles.tipoPasto}>{item.tipo} {item.insulina ? `• Insulina: ${item.insulina}` : ''}</Text>
              {item.note ? <Text style={styles.noteTest}>{item.note}</Text> : null}
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F0FA', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  exportText: { fontFamily: 'Plus Jakarta Sans', color: COLORS.brandPrimary, fontWeight: '600', fontSize: 14 },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterButton: { flex: 1, backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  filterButtonActive: { backgroundColor: COLORS.brandPrimary },
  filterButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.muted },
  filterButtonTextActive: { color: COLORS.onBrandPrimary },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: COLORS.onSurface, backgroundColor: COLORS.surface, paddingVertical: 8 },
  row: { flexDirection: 'row', minHeight: 90 },
  timelineContainer: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 30, bottom: 0, width: 2, backgroundColor: COLORS.surfaceSecondary, zIndex: 1 },
  card: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 12, marginLeft: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  valoreGlicemia: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: '700', color: COLORS.onSurface },
  unitaMisura: { fontSize: 12, color: COLORS.muted, fontWeight: '400' },
  oraTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  tipoPasto: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, marginTop: 4, fontWeight: '500' },
  noteTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' },
});
