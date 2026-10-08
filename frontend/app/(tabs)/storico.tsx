import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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

const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];

export default function StoricoScreen() {
  const [filtroAttivo, setFiltroAttivo] = useState<'7' | '30' | 'all'>('all');
  const [datiReali, setDatiReali] = useState<any[]>([]);

  // Stati per la gestione della modifica
  const [itemSelezionato, setItemSelezionato] = useState<any | null>(null);
  const [modGlicemia, setModGlicemia] = useState('');
  const [modInsulina, setModInsulina] = useState('');
  const [modNote, setModNote] = useState('');
  const [modMomento, setModMomento] = useState('');
  const [mostraModalModifica, setMostraModalModifica] = useState(false);
  
  // Stato per controllare la comparsa della notifica verde nel popup
  const [mostraNotificaModifica, setMostraNotificaModifica] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiLocali();
    }, [])
  );

  const caricaDatiLocali = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        setDatiReali(JSON.parse(datiSalvati));
      }
    } catch (e) {
      console.log("Errore nel caricamento dei dati.");
    }
  };

  const cancellaTuttoStorico = async () => {
    try {
      await AsyncStorage.removeItem('glicotrack_data');
      setDatiReali([]);
      alert("Diario glicemico svuotato.");
    } catch (e) {
      alert("Impossibile cancellare i dati.");
    }
  };

  const apriModificaItem = (item: any) => {
    setItemSelezionato(item);
    setModGlicemia(item.glicemia.toString());
    setModInsulina(item.insulina ? item.insulina.replace(' UI', '').replace('-', '') : '');
    setModNote(item.note || '');
    setModMomento(item.tipo || 'Prima Colazione');
    setMostraNotificaModifica(false); 
    setMostraModalModifica(true);
  };

  const salvaModificaItem = async () => {
    const valoreGlicemia = parseInt(modGlicemia);
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      alert("Inserisci un valore di glicemia valido.");
      return;
    }

    try {
      const datiAggiornati = datiReali.map(item => {
        if (item.id === itemSelezionato.id) {
          return {
            ...item,
            glicemia: valoreGlicemia,
            insulina: modInsulina ? `${modInsulina} UI` : '-',
            tipo: modMomento,
            note: modNote
          };
        }
        return item;
      });

      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiAggiornati));
      setDatiReali(datiAggiornati);
      
      // Attiva la tendina verde
      setMostraNotificaModifica(true);
      
      // Attende 1.5 secondi per la lettura, poi chiude la modale da sola
      setTimeout(() => {
        setMostraNotificaModifica(false);
        setMostraModalModifica(false);
        setItemSelezionato(null);
      }, 1500);

    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  const ottieniDatiSezionati = () => {
    const sezioni: Record<string, any[]> = { "Oggi": [] };
    datiReali.forEach(item => {
      const dataChiave = item.dataTesto || "Oggi";
      if (!sezioni[dataChiave]) sezioni[dataChiave] = [];
      sezioni[dataChiave].push(item);
    });

    return Object.keys(sezioni)
      .map(chiave => ({ title: chiave, data: sezioni[chiave] }))
      .filter(s => s.data.length > 0);
  };
  const generaEDesportaPDF = () => {
    let corpoTabellaHtml = "";
    const sezioniDati = ottieniDatiSezionati();

    sezioniDati.forEach(sezione => {
      const rigaGlicemie: Record<string, string> = {};
      const rigaInsuline: Record<string, string> = {};
      const rigaNote: Record<string, string> = {};

      MOMENTI_COLONNE.forEach(m => {
        rigaGlicemie[m] = "-"; rigaInsuline[m] = "-"; rigaNote[m] = "-";
      });

      sezione.data.forEach(item => {
        if (MOMENTI_COLONNE.includes(item.tipo)) {
          let colore = '#34C759';
          if (item.glicemia > 180) colore = '#FF3B30';
          if (item.glicemia < 70) colore = '#FF9F0A';

          rigaGlicemie[item.tipo] = `<span style="color: ${colore}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
          rigaInsuline[item.tipo] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
          rigaNote[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${item.note}</span>` : "-";
        }
      });

      let trGlicemieHtml = "";
      let trInsulineHtml = "";
      let trNoteHtml = "";

      MOMENTI_COLONNE.forEach(m => {
        trGlicemieHtml += `<td>${rigaGlicemie[m]}</td>`;
        trInsulineHtml += `<td>${rigaInsuline[m]}</td>`;
        trNoteHtml += `<td>${rigaNote[m]}</td>`;
      });

      corpoTabellaHtml += `
        <tr>
          <td class="cell-data" rowspan="3">${sezione.title}</td>
          <td class="cell-label">Glicemia</td>
          ${trGlicemieHtml}
        </tr>
        <tr>
          <td class="cell-label">Insulina</td>
          ${trInsulineHtml}
        </tr>
        <tr class="row-separator">
          <td class="cell-label">Note</td>
          ${trNoteHtml}
        </tr>`;
    });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: sans-serif; color: #1c1c1e; padding: 10px; background: #ffffff; }
            h1 { font-size: 22px; color: #0A66C2; margin: 0 0 15px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #c7c7cc; padding: 8px 6px; font-size: 11px; text-align: center; vertical-align: middle; word-wrap: break-word; }
            th { background-color: #f2f2f7; font-weight: bold; font-size: 10px; text-transform: uppercase; }
            .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 12px; width: 80px; }
            .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 8px; width: 90px; }
            .row-separator td { background-color: #ffffff; }
          </style>
        </head>
        <body>
          <h1>Diabety - Registro Storico Giornaliero</h1>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Parametro</th>
                <th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th>
                <th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th>
                <th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th>
              </tr>
            </thead>
            <tbody>
              ${corpoTabellaHtml || '<tr><td colspan="11">Nessun dato registrato.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>`;

    const finestraStampa = window.open('', '_blank');
    if (finestraStampa) {
      finestraStampa.document.write(htmlTemplate);
      finestraStampa.document.close();
      finestraStampa.onload = () => { finestraStampa.focus(); finestraStampa.print(); };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Storico</Text>
        <View style={{flexDirection:'row', gap: 8}}>
          {datiReali.length > 0 && (
            <TouchableOpacity style={[styles.exportButton, {backgroundColor:'#FFEEF0'}]} onPress={cancellaTuttoStorico}>
              <Text style={[styles.exportText, {color: COLORS.error}]}>Svuota</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.exportButton} onPress={generaEDesportaPDF}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.exportText}>Esporta PDF</Text>
          </TouchableOpacity>
        </View>
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
        sections={ottieniDatiSezionati()}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => apriModificaItem(item)} activeOpacity={0.7}>
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineDot, { backgroundColor: item.glicemia > 180 ? COLORS.error : item.glicemia < 70 ? COLORS.warning : COLORS.success }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.valoreGlicemia}>{item.glicemia} <Text style={styles.unitaMisura}>mg/dL</Text></Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Text style={styles.oraTest}>{item.ora}</Text>
                  <Ionicons name="pencil-sharp" size={12} color={COLORS.muted} />
                </View>
              </View>
              <Text style={styles.tipoPasto}>{item.tipo} {item.insulina !== '-' ? `• Insulina: ${item.insulina}` : ''}</Text>
              {item.note ? <Text style={styles.noteTest}>{item.note}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
            <Text style={{color: COLORS.muted, fontFamily: 'Plus Jakarta Sans'}}>Nessuna misurazione salvata. Inserisci un valore dalla Home!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <Modal visible={mostraModalModifica} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifica Misurazione</Text>
            
            <ScrollView style={{maxHeight: 300}} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Glicemia (mg/dL)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modGlicemia} onChangeText={setModGlicemia} />

              <Text style={styles.inputLabel}>Insulina (Unità UI)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modInsulina} onChangeText={setModInsulina} placeholder="Nessuna" />

              <Text style={styles.inputLabel}>Note / Pasti</Text>
              <TextInput style={styles.textInput} value={modNote} onChangeText={setModNote} />

              <Text style={styles.inputLabel}>Momento della Giornata</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4}}>
                {MOMENTI_COLONNE.map(m => (
                  <TouchableOpacity key={m} style={[styles.chipMomento, modMomento === m && styles.chipMomentoAttiva]} onPress={() => setModMomento(m)}>
                    <Text style={[styles.chipMomentoText, modMomento === m && styles.chipMomentoTextAttiva]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* NOTIFICA A TENDINA VERDE CONDIZIONALE */}
            {mostraNotificaModifica && (
              <View style={styles.notificaTendina}>
                <Text style={styles.notificaTesto}>✓ Modifica salvata nel registro</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnAnnulla} onPress={() => setMostraModalModifica(false)}>
                <Text style={styles.btnAnnullaText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSalva} onPress={salvaModificaItem}>
                <Text style={styles.btnSalvaText}>Salva Modifica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  modalTitle: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  inputLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 12, marginBottom: 4 },
  textInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.onSurface, marginBottom: 4 },
  chipMomento: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  chipMomentoAttiva: { backgroundColor: '#E6F0FA', borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipMomentoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.onSurface },
  chipMomentoTextAttiva: { color: COLORS.brandPrimary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnAnnulla: { flex: 1, backgroundColor: COLORS.surfaceSecondary, padding: 12, borderRadius: 12, alignItems: 'center' },
  btnAnnullaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnSalva: { flex: 1, backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center' },
  btnSalvaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  notificaTendina: { backgroundColor: '#E6F4EA', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 15, alignItems: 'center' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: '#137333', fontWeight: '600', fontSize: 14 },
});
