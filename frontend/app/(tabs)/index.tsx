import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';

// 🎨 PALETTE COLORI ELEVATA PER MASSIMO STACCO IN DARK MODE
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  // Nero profondo tech per i contenitori
  brandPrimary: "#00E5FF",      // Azzurro Cyan elettrico neon coordinato
  onSurface: "#FFFFFF",         // Bianco purissimo ultra-nitido
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  warning: "#FF9100",           // Arancione vivo
  error: "#FF5252",             // Rosso corallo neon
  borderGlass: "rgba(255, 255, 255, 0.08)",
  borderGlassBright: "rgba(255, 255, 255, 0.15)" // Bordo ad alto contrasto per i box principali
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
  const [mostraModalInfo, setMostraModalInfo] = useState(false);

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

  const ottieniTimestampDalTesto = (stringaData: string) => {
    if (!stringaData || !stringaData.includes('/')) return 0;
    const [giorno, mese, anno] = stringaData.split('/');
    const annoCompleto = parseInt(anno) < 50 ? 2000 + parseInt(anno) : 1900 + parseInt(anno);
    return new Date(annoCompleto, parseInt(mese) - 1, parseInt(giorno)).getTime();
  };

  const ottieniColoreGlicemia = () => {
    const valore = parseInt(glicemia);
    if (!valore || isNaN(valore)) return COLORS.onSurface;
    if (valore < 70) return COLORS.warning;
    if (valore > 180) return COLORS.error;
    return COLORS.success;
  };
  // 💾 ESPORTA IL BACKUP DIARIO IN UN FILE JSON CONDIVISIBILE
  const esportaBackupJSON = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      if (!storicoEsistente || JSON.parse(storicoEsistente).length === 0) {
        alert("Non ci sono misurazioni salvate da esportare.");
        return;
      }
      
      if (Platform.OS === 'web') {
        const blob = new Blob([storicoEsistente], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup_diabety_diario.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(storicoEsistente)}`;
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(dataUri, { dialogTitle: 'Salva il tuo Backup Diabety' });
        } else {
          alert("La condivisione non è supportata su questo dispositivo.");
        }
      }
    } catch (error) {
      alert("Errore durante la creazione del file di backup.");
    }
  };

  // 📂 IMPORTA UN FILE JSON E RE-INIETTA I DATI SOVRASCRIVENDO LA MEMORIA LOCALE
  const gestisciImportazioneWeb = async (evento: any) => {
    const file = evento.target.files?.[0];
    if (!file) return;

    const lettore = new FileReader();
    lettore.onload = async (e: any) => {
      try {
        const contenutoTesto = e.target.result;
        const datiVerificati = JSON.parse(contenutoTesto);
        
        if (Array.isArray(datiVerificati)) {
          const conferma = window.confirm("ATTENZIONE: L'importazione di questo backup sovrascriverà completamente tutti i dati attualmente presenti sul telefono. Vuoi procedere?");
          if (conferma) {
            await AsyncStorage.setItem('glicotrack_data', contenutoTesto);
            alert("✓ Diario ripristinato con successo! Riavvia l'applicazione per aggiornare le schermate.");
          }
        } else {
          alert("Il file selezionato non è un backup valido di Diabety.");
        }
      } catch (err) {
        alert("Impossibile leggere il file. Assicurati che sia un file JSON corretto.");
      }
    };
    lettore.readAsText(file);
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

      if (elencoDati.length > 0) {
        let timestampPiuRecente = 0;
        elencoDati.forEach((item: any) => {
          const ts = ottieniTimestampDalTesto(item.dataTesto);
          if (ts > timestampPiuRecente) timestampPiuRecente = ts;
        });

        const limite91GiorniMs = 91 * 24 * 60 * 60 * 1000;
        const timestampSogliaMinima = timestampPiuRecente - limite91GiorniMs;

        elencoDati = elencoDati.filter((item: any) => {
          const tsItem = ottieniTimestampDalTesto(item.dataTesto);
          return tsItem >= timestampSogliaMinima;
        });
      }

      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      setGlicemia('');
      setInsulina('');
      setNote('');
      setOraInserita(ottieniOraCorrente());
      setMostraNotifica(true);
      setTimeout(() => { setMostraNotifica(false); }, 3000);

    } catch (error) {
      alert("Impossibile salvare i dati localmente.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 🏷️ INTESTAZIONE CON TITOLO E TASTO INFO REATTIVO */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Inserisci Nuovi Dati</Text>
        <TouchableOpacity style={styles.infoButtonMinimal} onPress={() => setMostraModalInfo(true)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="information-circle-outline" size={26} color={COLORS.brandPrimary} />
        </TouchableOpacity>
      </View>

      {/* ⚙️ SEZIONE DEI TASTI DI BACKUP SOTTO IL TITOLO PRINCIPALE */}
      <View style={styles.containerPulsantiBackupEsterni}>
        <TouchableOpacity style={[styles.btnBackupEsterno, { backgroundColor: '#1A1A24', borderColor: COLORS.borderGlass }]} onPress={esportaBackupJSON}>
          <Ionicons name="cloud-download-outline" size={13} color={COLORS.onSurface} style={{ marginRight: 4 }} />
          <Text style={{ fontFamily: 'Plus Jakarta Sans', color: COLORS.onSurface, fontSize: 12, fontWeight: '700' }}>Esporta JSON</Text>
        </TouchableOpacity>
        
        {Platform.OS === 'web' ? (
          <label style={{
            flex: 1, backgroundColor: '#0C232B', borderWidth: 1, borderColor: COLORS.brandPrimary, borderRadius: 10,
            padding: 10, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', fontSize: '12px', fontWeight: '700', color: COLORS.brandPrimary
          }}>
            <Ionicons name="cloud-upload-outline" size={13} color={COLORS.brandPrimary} style={{ marginRight: 4 }} />
            Importa JSON
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={[styles.btnBackupEsterno, { backgroundColor: '#0C232B', borderColor: COLORS.brandPrimary }]}>
            <Ionicons name="cloud-upload-outline" size={13} color={COLORS.brandPrimary} style={{ marginRight: 4 }} />
            <Text style={{ fontFamily: 'Plus Jakarta Sans', color: COLORS.brandPrimary, fontSize: 12, fontWeight: '700' }}>Importa JSON</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* 📅⏰ RIGHE TEMPORALI INALTERATE */}
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
                fontFamily: 'sans-serif', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', 
                backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                padding: '6px 10px', marginTop: '4px', width: 'auto', display: 'inline-block', outline: 'none', cursor: 'pointer'
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
                fontFamily: 'sans-serif', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', 
                backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                padding: '6px 10px', marginTop: '4px', width: 'auto', display: 'inline-block', outline: 'none', cursor: 'pointer'
              }}
            />
          ) : (
            <TextInput style={styles.timeInputBackup} value={oraInserita} onChangeText={setOraInserita} maxLength={5} />
          )}
        </View>
      </View>

      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Glicemia (mg/dL)</Text>
          <TextInput
            style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]}
            placeholder="00"
            placeholderTextColor="#636366" 
            keyboardType="numeric"
            value={glicemia}
            onChangeText={setGlicemia}
            maxLength={3}
          />
        </View>

        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Insulina (Unità UI)</Text>
          <TextInput
            style={styles.insulinaInput}
            placeholder="0"
            placeholderTextColor="#636366" 
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
            <TouchableOpacity key={m} style={[styles.chip, selezionato && styles.chipSelezionata]} onPress={() => setMomentoSelezionato(m)}>
              <Text style={[styles.chipText, selezionato && styles.chipTextSelezionato]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.cardInput, { padding: 12, marginBottom: 16 }]}>
        <Text style={styles.labelLeft}>Note Alimentari / Sintomi</Text>
        <TextInput style={styles.noteInput} placeholder="Es: Riso integrale, stanchezza..." placeholderTextColor="#48484A" value={note} onChangeText={setNote} />
      </View>

      {mostraNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>✓ Misurazione salvata nel registro</Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={salvaMisurazione}>
        <Text style={styles.saveButtonText}>Salva Misurazione</Text>
      </TouchableOpacity>

      {/* 🎪 POP-UP GUIDA ALL'USO MODAL NETTO E PULITO */}
      <Modal visible={mostraModalInfo} animationType="fade" transparent={true} onRequestClose={() => setMostraModalInfo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentPremium}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleInfo}>Guida all'Uso</Text>
              <TouchableOpacity onPress={() => setMostraModalInfo(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollInfo} showsVerticalScrollIndicator={false}>
              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>🛡️ Archivio Rotante di 90 Giorni</Text>
                <Text style={styles.infoBlockText}>L'app esegue il calcolo dei dati sull'ultimo trimestre. I log antecedenti ai 90 giorni vengono eliminati automaticamente per salvaguardare spazio.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>⏰ Tracciamento Orario Intraday</Text>
                <Text style={styles.infoBlockText}>L'orario viene memorizzato per ordinare cronologicamente la timeline e viene fuso automaticamente tra parentesi quadre all'inizio delle tue Note.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>📊 Codici Colore Medici</Text>
                <Text style={styles.infoBlockText}>Verde per valori normali (70-180 mg/dL), Arancione in caso di ipoglicemia (&lt;70 mg/dL) e Rosso per iperglicemia (&gt;180 mg/dL).</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnChiudiInfo} onPress={() => setMostraModalInfo(false)}>
              <Text style={styles.btnChiudiInfoText}>Ho Capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, 
  content: { padding: 16, paddingTop: 15, paddingBottom: 40 },
  headerForm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  infoButtonMinimal: { width: 38, height: 36, justifyContent: 'center', alignItems: 'center' },
  
  // 📐 NUOVA RIGIDA E COMPATTA STRUTTURA PER I COMPONENTI DI BACKUP ESTERNI
  containerPulsantiBackupEsterni: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16 },
  btnBackupEsterno: { flex: 1, flexDirection: 'row', padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass },
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  containerRigaTemporale: { flexDirection: 'row', gap: 16, marginBottom: 16, alignSelf: 'flex-start' },
  dataCardSinistra: { width: 'auto', backgroundColor: 'transparent', padding: 0, alignItems: 'flex-start' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  dataInput: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '600', color: COLORS.onSurface, textAlign: 'left', paddingLeft: 2 },
  timeInputBackup: { fontFamily: 'Space Grotesk', fontSize: 16, color: COLORS.onSurface, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 6, width: 70, textAlign: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  cardInputHighlight: { backgroundColor: "#15151F", borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlassBright, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  labelLeftHighlight: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: "#A4A4AA", marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 2, textAlign: 'left', paddingLeft: 2, width: '100%' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  chipSelezionata: { backgroundColor: "#0C232B", borderWidth: 1, borderColor: COLORS.brandPrimary }, 
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.onSurface, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalContentPremium: { backgroundColor: '#111116', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.borderGlass, maxHeight: '85%' },
  modalHeaderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, paddingBottom: 10 },
  modalTitleInfo: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  modalScrollInfo: { marginBottom: 16 },
  infoBlockPremium: { marginBottom: 16, backgroundColor: '#020204', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderGlass },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 6, textAlign: 'left' },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, lineHeight: 19, textAlign: 'left' },
  btnChiudiInfo: { backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center' },
  btnChiudiInfoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#0A0A0C' }
});
