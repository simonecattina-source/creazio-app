import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Token di design presi direttamente dalle tue specifiche iOS-Native Clean
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

// Dati finti di test per verificare i filtri (simulano il database locale)
const DATI_LOG_MOCK = [
  {
    title: "Oggi",
    data: [
      { id: "1", glicemia: 145, tipo: "Post-Pranzo", stato: "success", ora: "14:15", dataDoc: new Date() }
    ]
  },
  {
    title: "1 Ottobre 2026",
    data: [
      { id: "2", glicemia: 65, tipo: "Pre-Pranzo", stato: "warning", ora: "12:30", dataDoc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { id: "3", glicemia: 210, tipo: "Colazione", stato: "error", ora: "08:15", dataDoc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    title: "15 Settembre 2026",
    data: [
      { id: "4", glicemia: 110, tipo: "Prima di dormire", stato: "success", ora: "23:00", dataDoc: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000) }
    ]
  }
];

export default function StoricoScreen() {
  // Stato per gestire quale dei 3 filtri temporali è attivo ('7' giorni, '30' giorni, o 'all')
  const [filtroAttivo, setFiltroAttivo] = useState<'7' | '30' | 'all'>('all');

  // Funzione per capire se una misurazione rientra nei giorni scelti
  const rientraNelFiltro = (dataMisurazione: Date) => {
    if (filtroAttivo === 'all') return true;
    
    const oggi = new Date();
    const differenzaInTempo = oggi.getTime() - dataMisurazione.getTime();
    const differenzaInGiorni = differenzaInTempo / (1000 * 3600 * 24);
    
    return differenzaInGiorni <= parseInt(filtroAttivo);
  };

  // Filtra i dati in base alla scelta dei 3 pulsanti
  const datiFiltrati = DATI_LOG_MOCK.map(sezione => {
    const elementiFiltrati = sezione.data.filter(item => rientraNelFiltro(item.dataDoc));
    return { ...sezione, data: elementiFiltrati };
  }).filter(sezione => sezione.data.length > 0);

  return (
    <View style={styles.container}>
      
      {/* HEADER DELLA SCHERMATA */}
      <View style={styles.header}>
        <Text style={styles.title}>Storico</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="document-text-outline" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.exportText}>Esporta in PDF</Text>
        </TouchableOpacity>
      </View>

      {/* 📊 SEZIONE DEI 3 PULSANTI DI FILTRO RICHIESTI */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterButton, filtroAttivo === '7' && styles.filterButtonActive]}
          onPress={() => setFiltroAttivo('7')}
        >
          <Text style={[styles.filterButtonText, filtroAttivo === '7' && styles.filterButtonTextActive]}>
            7 Giorni
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterButton, filtroAttivo === '30' && styles.filterButtonActive]}
          onPress={() => setFiltroAttivo('30')}
        >
          <Text style={[styles.filterButtonText, filtroAttivo === '30' && styles.filterButtonTextActive]}>
            30 Giorni
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterButton, filtroAttivo === 'all' && styles.filterButtonActive]}
          onPress={() => setFiltroAttivo('all')}
        >
          <Text style={[styles.filterButtonText, filtroAttivo === 'all' && styles.filterButtonTextActive]}>
            Tutti
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DEI LOG CON TIMELINE VISIVA */}
      <SectionList
        sections={datiFiltrati}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {/* Indicatore visivo della linea temporale (Pallino colorato) */}
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineDot, { backgroundColor: COLORS[item.stato as keyof typeof COLORS] }]} />
              <View style={styles.timelineLine} />
            </View>
            
            {/* Scheda dati */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.valoreGlicemia}>{item.glicemia} <Text style={styles.unitaMisura}>mg/dL</Text></Text>
                <Text style={styles.oraTest}>{item.ora}</Text>
              </View>
              <Text style={styles.tipoPasto}>{item.tipo}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nessuna misurazione registrata in questo intervallo.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Space Grotesk',
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  exportText: {
    fontFamily: 'Plus Jakarta Sans',
    color: COLORS.brandPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  /* Stili dei 3 pulsanti di filtro */
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.brandPrimary,
  },
  filterButtonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  filterButtonTextActive: {
    color: COLORS.onBrandPrimary,
  },
  /* Stili della timeline e delle schede dati */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 18,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 30,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.surfaceSecondary,
    zIndex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginLeft: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  valoreGlicemia: {
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  unitaMisura: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '400',
  },
  oraTest: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    color: COLORS.muted,
  },
  tipoPasto: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    color: COLORS.onSurface,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Plus Jakarta Sans',
    color: COLORS.muted,
    textAlign: 'center',
  },
});
