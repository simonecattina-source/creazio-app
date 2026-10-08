import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const COLORS = {
  surface: "#FFFFFF",
  surfaceSecondary: "#F2F2F7",
  brandPrimary: "#0A66C2",
  onBrandPrimary: "#FFFFFF",
  onSurface: "#1C1C1E",
  muted: "#8E8E93",
  success: "#34C759", // Verde normale
  warning: "#FF9F0A", // Arancione basso (<70)
  error: "#FF3B30",   // Rosso alto (>180)
};

const MOMENTI = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];
export default function InserimentoScreen() {
  const router = useRouter();
  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');

  // 🎨 Calcola dinamicamente il colore dell'input in base alle soglie cliniche
  const ottieniColoreGlicemia = () => {
    const valore = parseInt(glicemia);
    if (!valore || isNaN(valore)) return COLORS.onSurface;
    if (valore < 70) return COLORS.warning;
    if (valore > 180) return COLORS.error;
    return COLORS.success;
  };

  // 💾 Funzione per salvare la misurazione nel database locale e inviarla allo Storico
  const salvaMisurazione = async () => {
    const valoreGlicemia = parseInt(glicemia);
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      alert("Inserisci un valore di glicemia valido prima di salvare.");
      return;
    }

    try {
      const nuovaMisurazione = {
        id: Math.random().toString(),
        glicemia: valoreGlicemia,
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: note || '',
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        dataTesto: "Oggi" // Mappa la misurazione corrente sotto la sezione odierna dello storico
      };

      // Carica lo storico esistente dalla memoria locale
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let elencoDati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      // Aggiunge la nuova misurazione in cima alla lista
      elencoDati.unshift(nuovaMisurazione);
      
      // Salva l'elenco aggiornato nel database
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      // Resetta i campi del modulo per un nuovo inserimento
      setGlicemia('');
      setInsulina('');
      setNote('');
      
      alert("Misurazione registrata con successo!");
    } catch (error) {
      alert("Impossibile salvare i dati localmente.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nuovo Log Clinico</Text>
      
      {/* 📊 INPUT NUMERICO GIGANTE DELLA GLICEMIA */}
      <View style={styles.cardInput}>
        <Text style={styles.label}>Glicemia (mg/dL)</Text>
        <TextInput
          style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]}
          placeholder="000"
          placeholderTextColor="#C7C7CC"
          keyboardType="numeric"
          value={glicemia}
          onChangeText={setGlicemia}
        />
      </View>

      {/* INPUT NUMERICO DELL'INSULINA */}
      <View style={styles.cardInput}>
        <Text style={styles.label}>Insulina (Unità UI)</Text>
        <TextInput
          style={styles.insulinaInput}
          placeholder="0"
          placeholderTextColor="#C7C7CC"
          keyboardType="numeric"
          value={insulina}
          onChangeText={setInsulina}
        />
      </View>

      {/* 🧩 SELETTORE RAPIDO DEI 9 MOMENTI (FLEX-ROW) */}
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

      {/* NOTE ALIMENTARI */}
      <View style={styles.cardInput}>
        <Text style={styles.label}>Note Alimentari / Sintomi</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Es: Riso integrale, sintomi di stanchezza..."
          placeholderTextColor="#C7C7CC"
          value={note}
          onChangeText={setNote}
        />
      </View>

      {/* BOTTONE PRINCIPALE DI SALVATAGGIO */}
      <TouchableOpacity style={styles.saveButton} onPress={salvaMisurazione}>
        <Text style={styles.saveButtonText}>Salva Misurazione</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface, marginBottom: 20 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginTop: 15, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 48, fontWeight: '700', textAlign: 'center', paddingVertical: 10 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: '600', color: COLORS.onSurface, textAlign: 'center', paddingVertical: 5 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 5 },
  /* Griglia avvolgente flex-row per le chip dei momenti richiesti */
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  chipSelezionata: { backgroundColor: "#E6F0FA", borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.onSurface, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.brandPrimary, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
