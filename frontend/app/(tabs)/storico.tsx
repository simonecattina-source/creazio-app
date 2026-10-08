import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: "#121212",        
  surfaceSecondary: "#1C1C1E",  
  brandPrimary: "#0A66C2",      
  onSurface: "#FFFFFF",         
  muted: "#8E8E93",             
  success: "#34C759",           
  warning: "#FF9F0A",           
  error: "#FF3B30",             
};

const MOMENTI = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];

export default function InserimentoScreen() {
  const ottieniDataOdiernaISO = () => {
    const oggi = new Date();
    const g = String(oggi.getDate()).padStart(2, '0');
    const m = String(oggi.getMonth() + 1).padStart(2, '0');
    const a = oggi.getFullYear();
    return `${a}-${m}-${g}`;
  };

  const ottieniOraCorrente = () => {
    const oggi = new Date();
    const ore = String(oggi.getHours()).padStart(2, '0');
    const minuti = String(oggi.getMinutes()).padStart(2, '0');
    return `${ore}:${minuti}`;
  };

  const [dataISO, setDataISO] = useState(ottieniDataOdiernaISO());
  const [oraInserita, setOraInserita] = useState(ottieniOraCorrente());
  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (glicemia === '' && insulina === '' && note === '') {
        setOraInserita(ottieniOraCorrente());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [glicemia, insulina, note]);

  const ottieniDataFormattataStorico = (stringaISO: string) => {
    if (!stringaISO) return "";
    const [anno, mese, giorno] = stringaISO.split('-');
    const annoCorto = anno.slice(-2);
    return `${giorno}/${mese}/${annoCorto}`;
  };

  const ottieniColoreGlicemia = () => {
    const valore = parseInt(glicemia);
    if (!valore || isNaN(valore)) return COLORS.onSurface;
    if (valore < 70) return COLORS.warning;
    if (valore > 180) return COLORS.error;
    return COLORS.success;
  };

  const salvaMisurazione = async () => {
    const valoreGlicemia = parseInt(glicemia);
    
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      alert("Inserisci un valore di glicemia valido prima di salvare.");
      return;
    }

    try {
      const noteConOrarioFuso = note.trim() 
        ? `[${oraInserita}] ${note.trim()}`
        : `[${oraInserita}]`;

      const nuovaMisurazione = {
        id: Math.random().toString(),
        glicemia: valoreGlicemia,
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: noteConOrarioFuso, 
        ora: oraInserita,        
        dataTesto: ottieniDataFormattataStorico(dataISO)
      };

      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let elencoDati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      elencoDati.unshift(nuovaMisurazione);
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      setGlicemia('');
      setInsulina('');
      setNote('');
      setOraInserita(ottieniOraCorrente());
      
      setMostraNotifica(true);
      setTimeout(() => {
        setMostraNotifica(false);
      }, 3000);

    } catch (error) {
      alert("Impossibile salvare i dati localmente.");
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Inserisci Nuovi Dati</Text>
      
      {/* 📅⏰ REGHE TEMPORALI CON LE SCELTE "Data del Test" e "Orario del Test" */}
      <View style={styles.containerRigaTemporale}>
        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Data del Test</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={dataISO}
              max={ottieniDataOdiernaISO()} 
              onChange={(e) => setDataISO(e.target.value)}
              style={{
                fontFamily: 'sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                color: '#0A66C2', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E5E5EA', 
                borderRadius: '10px',
                padding: '6px 10px',
                marginTop: '4px',
                width: 'auto', 
                display: 'inline-block',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          ) : (
            <Text style={styles.dataInput}>{ottieniDataFormattataStorico(dataISO)}</Text>
          )}
        </View>

        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Orario del Test</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={oraInserita}
              onChange={(e) => setOraInserita(e.target.value)}
              style={{
                fontFamily: 'sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                color: '#0A66C2', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E5E5EA', 
                borderRadius: '10px',
                padding: '6px 10px',
                marginTop: '4px',
                width: 'auto', 
                display: 'inline-block',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          ) : (
            <TextInput style={styles.timeInputBackup} value={oraInserita} onChangeText={setOraInserita} maxLength={5} />
          )}
        </View>
      </View>

      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInput, styles.metaLarghezza]}>
          <Text style={styles.labelLeft}>Glicemia (mg/dL)</Text>
          <TextInput
            style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]}
            placeholder="00"
            placeholderTextColor="#48484A"
            keyboardType="numeric"
            value={glicemia}
            onChangeText={setGlicemia}
            maxLength={3}
          />
        </View>

        <View style={[styles.cardInput, styles.metaLarghezza]}>
          <Text style={styles.labelLeft}>Insulina (Unità UI)</Text>
          <TextInput
            style={styles.insulinaInput}
            placeholder="0"
            placeholderTextColor="#48484A"
            keyboardType="numeric"
            value={insulina}
            onChangeText={setInsulina}
            maxLength={2}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Momento della Giornata</Text>
      <View style={styles.chipsContainer}>
        {MOMENTI.map((m) => {
          const selezionato = momentoSelezionato === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.chip, selezionato && styles.chipSelezionata]}
              onPress={() => setMomentoSelezionato(m)}
            >
              <Text style={[styles.chipText, selezionato && styles.chipTextSelezionato]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.cardInput, { padding: 12, marginBottom: 16 }]}>
        <Text style={styles.labelLeft}>Note Alimentari / Sintomi</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Es: Riso integrale, stanchezza..."
          placeholderTextColor="#48484A"
          value={note}
          onChangeText={setNote}
        />
      </View>

      {mostraNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>✓ Misurazione salvata nel registro</Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={salvaMisurazione}>
        <Text style={styles.saveButtonText}>Salva Misurazione</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, 
  content: { padding: 16, paddingTop: 45, paddingBottom: 30 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 12, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  containerRigaTemporale: { flexDirection: 'row', gap: 16, marginBottom: 16, alignSelf: 'flex-start' },
  dataCardSinistra: { width: 'auto', backgroundColor: 'transparent', padding: 0, alignItems: 'flex-start' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  dataInput: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '600', color: COLORS.brandPrimary, textAlign: 'left', paddingLeft: 2 },
  timeInputBackup: { fontFamily: 'Space Grotesk', fontSize: 16, color: COLORS.onSurface, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 6, width: 70, textAlign: 'center' },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 2, textAlign: 'left', paddingLeft: 2, width: '100%' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipSelezionata: { backgroundColor: "#17314A", borderWidth: 1, borderColor: COLORS.brandPrimary }, 
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.onSurface, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  notificaTendina: { backgroundColor: '#132D1B', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 }
});
      <Modal visible={mostraModalModifica} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestisci Misurazione</Text>
            
            <ScrollView style={{maxHeight: 280}} showsVerticalScrollIndicator={false}>
              {/* 🏷️ INTEDAZIONE AGGIORNATA */}
              <Text style={styles.inputLabel}>Data del Test</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={modDataISO}
                  onChange={(e) => setModDataISO(e.target.value)}
                  style={{
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0A66C2',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5EA',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    marginBottom: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <TextInput style={styles.textInput} value={modDataISO} onChangeText={setModDataISO} />
              )}

              {/* 🏷️ INTEDAZIONE AGGIORNATA */}
              <Text style={styles.inputLabel}>Orario del Test (Verrà scritto nelle note)</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={modOraText}
                  onChange={(e) => setModOraText(e.target.value)}
                  style={{
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0A66C2',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5EA',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    marginBottom: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <TextInput style={styles.textInput} value={modOraText} onChangeText={setModOraText} />
              )}

              <Text style={styles.inputLabel}>Glicemia (mg/dL)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modGlicemia} onChangeText={setModGlicemia} maxLength={3} />

              <Text style={styles.inputLabel}>Insulina (Unità UI)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modInsulina} onChangeText={setModInsulina} placeholder="Nessuna" maxLength={2} />

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

            {mostraNotificaModifica && (
              <View style={[styles.notificaTendina, testoNotifica.includes('eliminata') && {backgroundColor: '#1C1314', borderColor: COLORS.error}]}>
                <Text style={[styles.notificaTesto, testoNotifica.includes('eliminata') && {color: COLORS.error}]}>{testoNotifica}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnAnnulla} onPress={() => setMostraModalModifica(false)}>
                <Text style={styles.btnAnnullaText}>Chiudi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnElimina} onPress={eliminaSingoloItem}>
                <Ionicons name="trash-outline" size={14} color="#FFF" style={{marginRight: 4}} />
                <Text style={styles.btnEliminaText}>Elimina</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSalva} onPress={salvaModificaItem}>
                <Text style={styles.btnSalvaText}>Salva</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mostraConfermaSvuota} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentSvuota}>
            <View style={styles.iconaAvvisoContainer}>
              <Ionicons name="alert-circle" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.modalTitleSvuota}>Svuotare il Diario?</Text>
            <Text style={styles.modalSubtitleSvuota}>Sei sicuro di voler cancellare l'intero storico delle misurazioni? Questa azione è irreversibile.</Text>
            
            <View style={styles.modalActionsSvuota}>
              <TouchableOpacity style={styles.btnAnnullaSvuota} onPress={() => setMostraConfermaSvuota(false)}>
                <Text style={styles.btnAnnullaTextSvuota}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfermaSvuota} onPress={confermaCancellaTutto}>
                <Text style={styles.btnConfermaTextSvuota}>Svuota Tutto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#2C2C2E' },
  exportText: { fontFamily: 'Plus Jakarta Sans', color: COLORS.onSurface, fontWeight: '600', fontSize: 14 },
  exportButtonPDFRed: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  exportTextPDFWhite: { fontFamily: 'Plus Jakarta Sans', color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 16 },
  filterButton: { flex: 1, backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  filterButtonActive: { backgroundColor: COLORS.brandPrimary },
  filterButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted },
  filterButtonTextActive: { color: COLORS.onSurface, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: COLORS.onSurface, backgroundColor: COLORS.background, paddingVertical: 8 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2C2C2E' },
  modalTitle: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  inputLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 10, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' },
  textInput: { backgroundColor: '#2C2C2E', borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.onSurface, marginBottom: 4, textAlign: 'left', width: '100%' },
  chipMomento: { backgroundColor: '#2C2C2E', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  chipMomentoAttiva: { backgroundColor: '#17314A', borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipMomentoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  chipMomentoTextAttiva: { color: COLORS.onSurface, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 24 },
  btnAnnulla: { flex: 1, backgroundColor: '#2C2C2E', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnAnnullaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnElimina: { flex: 1.2, backgroundColor: COLORS.error, padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnEliminaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  btnSalva: { flex: 1.2, backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSalvaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  notificaTendina: { backgroundColor: '#132D1B', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 15, alignItems: 'center' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentSvuota: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: '#2C2C2E' },
  iconaAvvisoContainer: { marginBottom: 12, backgroundColor: '#311718', padding: 10, borderRadius: 999 },
  modalTitleSvuota: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  modalSubtitleSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActionsSvuota: { flexDirection: 'row', gap: 12, width: '100%' },
  btnAnnullaSvuota: { flex: 1, backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnAnnullaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnConfermaSvuota: { flex: 1, backgroundColor: COLORS.error, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnConfermaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  notificaTendinaGenerale: { padding: 12, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, alignItems: 'center' }
});
