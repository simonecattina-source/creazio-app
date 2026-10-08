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

const DATI_LOG_MOCK = [
  {
    title: "Oggi",
    data: [{ id: "1", glicemia: 145, insulina: "4 UI", tipo: "Post-Pranzo", note: "Pasta integrale", stato: "success", ora: "14:15", dataDoc: new Date() }]
  },
  {
    title: "Ieri",
    data: [
      { id: "2", glicemia: 65, insulina: "0 UI", tipo: "Pre-Pranzo", note: "Sintomi di ipo", stato: "warning", ora: "12:30", dataDoc: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: "3", glicemia: 210, insulina: "6 UI", tipo: "Colazione", note: "Correzione iper", stato: "error", ora: "08:15", dataDoc: new Date(Date.now() - 24 * 60 * 60 * 1000) }
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

  // 📊 MOTORE DI GENERAZIONE PDF AVANZATO ED ISOLATO PER IL WEB
  const generaEDesportaPDF = () => {
    let righeHtml = "";
    datiFiltrati.forEach(sezione => {
      sezione.data.forEach(item => {
        righeHtml += `
          <tr>
            <td>${sezione.title}</td>
            <td>${item.ora}</td>
            <td style="font-weight: bold; color: ${item.glicemia > 180 ? '#FF3B30' : item.glicemia < 70 ? '#FF9F0A' : '#34C759'}">${item.glicemia} mg/dL</td>
            <td>${item.insulina || '-'}</td>
            <td>${item.tipo}</td>
            <td>${item.note || '-'}</td>
            <td>-</td><td>-</td><td>-</td><td>-</td>
          </tr>`;
      });
    });

    const htmlTemplate = `
      <html>
        <head>
          <title>GlicoTrack - Registro Medico</title>
          <style>
            /* Forza l'orientamento orizzontale e i margini professionali di stampa */
            @page { size: landscape; margin: 12mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              th { background-color: #f2f2f7 !important; }
              .nested-header { background-color: #0A66C2 !important; color: white !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; margin: 0; padding: 10px; }
            h1 { color: #0A66C2; font-size: 22px; margin-bottom: 4px; }
            p { font-size: 12px; color: #8e8e93; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e5ea; padding: 10px; font-size: 11px; text-align: left; }
            th { background-color: #f2f2f7; font-weight: bold; color: #1c1c1e; }
            .nested-header { text-align: center; background-color: #0A66C2; color: white; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>GlicoTrack - Registro Medico Orizzontale</h1>
          <p>Generato il: ${new Date().toLocaleDateString('it-IT')} | Filtro Temporale: ${filtroAttivo === 'all' ? 'Tutto lo storico' : `Ultimi \${filtroAttivo} giorni`}</p>
          <table>
            <thead>
              <tr>
                <th colspan="4" class="nested-header">PARAMETRI CLINICI</th>
                <th colspan="2" class="nested-header">DIARIO DI BORDO</th>
                <th colspan="4" class="nested-header">VALUTAZIONE SPECIALISTICA (MEDICO)</th>
              </tr>
              <tr>
                <th>Data</th><th>Ora</th><th>Glicemia</th><th>Insulina</th>
                <th>Momento Pasto</th><th>Note Alimentari</th>
                <th>Carboidrati (g)</th><th>Sport (min)</th><th>Note Medico</th><th>Firma Clinica</th>
              </tr>
            </thead>
            <tbody>${righeHtml || '<tr><td colspan="10" style="text-align:center;">Nessun dato registrato.</td></tr>'}</tbody>
          </table>
        </body>
      </html>`;

    if (Platform.OS === 'web') {
      // Crea un frame nascosto nel browser per forzare la stampa del solo codice HTML puro
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlTemplate);
        doc.close();

        // Attende il caricamento e lancia il comando di stampa pulito
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe); // Pulisce la pagina dopo la stampa
        }, 500);
      }
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
