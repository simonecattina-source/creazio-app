import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  
  // ℹ️ Stato per gestire l'apertura e la chiusura della guida modale INFO
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
      setTimeout(() => {
        setMostraNotifica(false);
      }, 3000);

    } catch (error) {
      alert("Impossibile salvare i dati localmente.");
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 🏷️ INTESTAZIONE CON TITOLO A SINISTRA E TASTO INFO A DESTRA */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Inserisci Nuovi Dati</Text>
        <TouchableOpacity style={styles.infoButton} onPress={() => setMostraModalInfo(true)}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.brandPrimary} />
          <Text style={styles.infoButtonText}>INFO</Text>
        </TouchableOpacity>
      </View>
      
      {/* 📅⏰ RIGHE TEMPORALI CORRETTE */}
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

      {/* RIGA AFFIANCATA GLICEMIA + INSULINA */}
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
      {/* 🎪 POPUP MODALE SCURO GUIDA CLINICA DIABETY (INFO) */}
      <Modal visible={mostraModalInfo} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleInfo}>Guida all'Uso</Text>
              <TouchableOpacity onPress={() => setMostraModalInfo(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollInfo} showsVerticalScrollIndicator={false}>
              
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockTitle}>🛡️ Archivio Rotante di 90 Giorni</Text>
                <Text style={styles.infoBlockText}>
                  L'app memorizza ed esegue il calcolo dei dati basandosi sull'ultimo trimestre completo (13 settimane). Ad ogni nuovo inserimento, i log antecedenti ai 90 giorni vengono eliminati automaticamente per salvaguardare spazio e privacy.
                </Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockTitle}>⏰ Tracciamento Orario Intraday</Text>
                <Text style={styles.infoBlockText}>
                  L'orario selezionato viene memorizzato per ordinare cronologicamente la timeline e viene fuso automaticamente tra parentesi quadre all'inizio delle tue Note. In questo modo rimarrà impresso in modo chiaro anche nell'esportazione.
                </Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockTitle}>📊 Codici Colore Medici</Text>
                <Text style={styles.infoBlockText}>
                  I valori inseriti assumono colori diversi in base alle soglie cliniche standard: Verde per valori normali (70-180 mg/dL), Arancione in caso di ipoglicemia (&lt;70 mg/dL) e Rosso per iperglicemia (&gt;180 mg/dL).
                </Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockTitle}>📄 Esportazione PDF Griglia Orizzontale</Text>
                <Text style={styles.infoBlockText}>
                  Dalla sezione "Storico" puoi applicare i filtri rapidi (7, 14, 30, 90 giorni) e generare un report a griglia orizzontale strutturato pronto per la stampa o l'invio diretto al tuo medico diabetologo.
                </Text>
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
  content: { padding: 16, paddingTop: 45, paddingBottom: 30 },
  
  headerForm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  infoButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2E' },
  infoButtonText: { fontFamily: 'Plus Jakarta Sans', color: COLORS.brandPrimary, fontWeight: '700', fontSize: 13 },

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
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2C2C2E', maxHeight: '85%' },
  modalHeaderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2C2C2E', paddingBottom: 10 },
  modalTitleInfo: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  modalScrollInfo: { marginBottom: 16 },
  infoBlock: { marginBottom: 16, backgroundColor: '#121212', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E' },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 6, textAlign: 'left' },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, lineHeight: 18, textAlign: 'left' },
  btnChiudiInfo: { backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center' },
  btnChiudiInfoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' }
});
