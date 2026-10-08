import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: "#121212",        // Sfondo nero Dark Mode
  surfaceSecondary: "#1C1C1E",  // Riquadri antracite
  brandPrimary: "#0A66C2",      // Blu per data e azioni
  onSurface: "#FFFFFF",         // Testo bianco
  muted: "#8E8E93",             // Testo grigio
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

  // Calcola l'ora e il minuto corrente del sistema (formato HH:MM)
  const ottieniOraCorrente = () => {
    const oggi = new Date();
    const ore = String(oggi.getHours()).padStart(2, '0');
    const minuti = String(oggi.getMinutes()).padStart(2, '0');
    return `${ore}:${minuti}`;
  };

  const [dataISO, setDataISO] = useState(ottieniDataOdiernaISO());
  // Stato per l'orario (Inizializzato all'ora attuale)
  const [oraInserita, setOraInserita] = useState(ottieniOraCorrente());

  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);

  // ⏰ Tiene l'orario della casella aggiornato all'ora reale finché l'utente non lo modifica
  useEffect(() => {
    const timer = setInterval(() => {
      // Aggiorna solo se l'utente non ha aperto o modificato il form toccando lo schermo
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
      // 🪄 FUSIONE INTEGRATA AUTOMATICA: Concatena l'ora all'inizio del testo delle note
      const noteConOrarioFuso = note.trim() 
        ? `[${oraInserita}] ${note.trim()}`
        : `[${oraInserita}]`;

      const nuovaMisurazione = {
        id: Math.random().toString(),
        glicemia: valoreGlicemia,
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: noteConOrarioFuso, // Salva il testo unito [HH:MM] Note
        ora: oraInserita,        // Salva il parametro ora isolato per i filtri cronologici dello storico
        dataTesto: ottieniDataFormattataStorico(dataISO)
      };

      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let elencoDati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      elencoDati.unshift(nuovaMisurazione);
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      // Reset dei campi lasciando l'app pronta per un nuovo inserimento
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
      
      {/* 📅⏰ RIGHE TEMPORALI AFFIANCATE IN ALTO A SINISTRA */}
      <View style={styles.containerRigaTemporale}>
        {/* Selettore Calendario Data */}
        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Data Controllo</Text>
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
                cursor: 'pointer',
                filter: 'invert(1)', 
                WebkitFilter: 'invert(1)'
              }}
            />
          ) : (
            <Text style={styles.dataInput}>{ottieniDataFormattataStorico(dataISO)}</Text>
          )}
        </View>

        {/* Selettore Tabella a Scorrimento Ora */}
        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Ora Controllo</Text>
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
                cursor: 'pointer',
                filter: 'invert(1)', 
                WebkitFilter: 'invert(1)'
              }}
            />
          ) : (
            <TextInput
              style={styles.timeInputBackup}
              value={oraInserita}
              onChangeText={setOraInserita}
              maxLength={5}
            />
          )}
        </View>
      </View>

      {/* 2. GLICEMIA */}
      <View style={[styles.cardInput, { marginBottom: 12 }]}>
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

      {/* 3. INSULINA */}
      <View style={[styles.cardInput, { marginBottom: 12 }]}>
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

      {/* 4. SELETTORE RAPIDO 9 MOMENTI */}
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

      {/* 5. NOTE ALIMENTARI */}
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
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start', width: '100%' },
  
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  containerRigaTemporale: { flexDirection: 'row', gap: 16, marginBottom: 16, alignSelf: 'flex-start' },
  dataCardSinistra: { width: 'auto', backgroundColor: 'transparent', padding: 0, alignItems: 'flex-start' },
  
  dataInput: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '600', color: COLORS.brandPrimary, textAlign: 'left', paddingLeft: 2 },
  timeInputBackup: { fontFamily: 'Space Grotesk', fontSize: 16, color: COLORS.onSurface, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 6, width: 70, textAlign: 'center' },
  
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 44, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
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
