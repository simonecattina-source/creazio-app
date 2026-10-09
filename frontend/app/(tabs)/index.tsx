import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 PALETTE COLORI HIGH-CONTRAST CON ACCENTI NEON PREMIUM
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Azzurro Cyan elettrico neon coordinato
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled (In Target)
  warning: "#FF9100",           // Arancione vivo (Ipoglicemia)
  error: "#FF5252",             // Rosso corallo neon (Iperglicemia)
  borderGlass: "rgba(255, 255, 255, 0.06)" // Bordo lucido ultra-sottile
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
      
      {/* 🏷️ INTESTAZIONE: MODIFICATO IL TASTO INFO CON SOLO ICONA REATTIVA E PULITA */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Inserisci Nuovi Dati</Text>
        <TouchableOpacity 
          style={styles.infoButtonMinimal} 
          onPress={() => setMostraModalInfo(true)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="information-circle-outline" size={26} color={COLORS.brandPrimary} />
        </TouchableOpacity>
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
                fontFamily: 'sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                color: '#00E5FF', 
                backgroundColor: '#13131A', 
                border: '1px solid rgba(255,255,255,0.06)', 
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
                color: '#00E5FF', 
                backgroundColor: '#13131A', 
                border: '1px solid rgba(255,255,255,0.06)', 
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

      {/* BOX INPUT INALTERATI */}
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
      {/* 🎪 MODAL INTERFACCIA INFO: TOTALMENTE COORDINATO AL DESIGN NEON PREMIUM */}
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
                <Text style={styles.infoBlockText}>
                  L'app memorizza ed esegue il calcolo dei dati basandosi sull'ultimo trimestre completo (13 settimane). Ad ogni nuovo inserimento, i log antecedenti ai 90 giorni vengono eliminati automaticamente per salvaguardare spazio e privacy.
                </Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>⏰ Tracciamento Orario Intraday</Text>
                <Text style={styles.infoBlockText}>
                  L'orario selezionato viene memorizzato per ordinare cronologicamente la timeline e viene fuso automaticamente tra parentesi quadre all'inizio delle tue Note. In questo modo rimarrà impresso in modo chiaro anche nell'esportazione.
                </Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={[styles.infoBlockTitle, { color: COLORS.success }]}>📊 Codici Colore Medici</Text>
                <Text style={styles.infoBlockText}>
                  I valori inseriti assumono colori diversi in base alle soglie cliniche standard: Verde per valori normali (70-180 mg/dL), Arancione in caso di ipoglicemia (&lt;70 mg/dL) e Rosso per iperglicemia (&gt;180 mg/dL).
                </Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={[styles.infoBlockTitle, { color: COLORS.brandPrimary }]}>📄 Esportazione PDF Griglia Orizzontale</Text>
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

// 📐 FOGLI DI STILE CSS AVANZATI (SIZE ED INGOMBRI DEI BOX INPUT PRESERVATI AL 100%)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, 
  content: { padding: 16, paddingTop: 45, paddingBottom: 40 },
  
  headerForm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  
  // 🌟 NUOVO STILE PULSATO INFO MINIMAL (Rimosso bordi e sfondo grigio, solo icona pura)
  infoButtonMinimal: { width: 38, height: 36, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass },
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  containerRigaTemporale: { flexDirection: 'row', gap: 16, marginBottom: 16, alignSelf: 'flex-start' },
  dataCardSinistra: { width: 'auto', backgroundColor: 'transparent', padding: 0, alignItems: 'flex-start' },
  
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  metaLarghezza: { flex: 1 }, 

  dataInput: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '600', color: COLORS.brandPrimary, textAlign: 'left', paddingLeft: 2 },
  timeInputBackup: { fontFamily: 'Space Grotesk', fontSize: 16, color: COLORS.onSurface, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 6, width: 70, textAlign: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  
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

  // 🌟 STILE MODAL EVOLUTO COORDINATO AI GRAFICI NEON
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
