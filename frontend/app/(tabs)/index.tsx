import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

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

const MOMENTI = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];

export default function InserimentoScreen() {
  // Stati per la gestione della data tramite calendario vero (Default: Oggi)
  const [dataOggetto, setDataOggetto] = useState(new Date());
  const [mostraCalendario, setMostraCalendario] = useState(false);

  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);

  // Converte l'oggetto Data in testo GG/MM/AA per lo storico e per la visualizzazione dell'app
  const ottieniDataFormattata = (date: Date) => {
    const giorno = String(date.getDate()).padStart(2, '0');
    const mese = String(date.getMonth() + 1).padStart(2, '0');
    const anno = String(date.getFullYear()).slice(-2); 
    return `${giorno}/${mese}/${a}`;
  };

  // 📅 Gestisce la selezione dal calendario
  const alCambioData = (event: any, selectedDate?: Date) => {
    // Su ambiente Web nasconde automaticamente il selettore dopo la scelta
    if (Platform.OS === 'web') {
      setMostraCalendario(false);
    }
    
    if (selectedDate) {
      const oggi = new Date();
      // Blocco di sicurezza invalicabile: se la data scelta è superiore a oggi, forza la data odierna
      if (selectedDate > oggi) {
        setDataOggetto(oggi);
        alert("Non è possibile registrare misurazioni per date future.");
      } else {
        setDataOggetto(selectedDate);
      }
    }
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
      const nuovaMisurazione = {
        id: Math.random().toString(),
        glicemia: valoreGlicemia,
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: note || '',
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        dataTesto: ottieniDataFormattata(dataOggetto) // Salva la data scelta dal calendario
      };

      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let elencoDati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      elencoDati.unshift(nuovaMisurazione);
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      setGlicemia('');
      setInsulina('');
      setNote('');
      
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
      <Text style={styles.title}>Nuovo Log Clinico</Text>
      
      {/* 1. 📅 SELETTORE A CALENDARIO (In alto a sinistra, interattivo) */}
      <View style={[styles.cardInput, styles.dataCardSinistra]}>
        <Text style={styles.labelLeft}>Data Controllo</Text>
        
        <TouchableOpacity style={styles.containerPulsanteData} onPress={() => setMostraCalendario(true)}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.brandPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.testoPulsanteData}>{ottieniDataFormattata(dataOggetto)}</Text>
        </TouchableOpacity>

        {/* Mostra il componente Calendario del sistema operativo */}
        {(mostraCalendario || Platform.OS !== 'web') && (
          <DateTimePicker
            value={dataOggetto}
            mode="date"
            display="default"
            maximumDate={new Date()} // Forza il calendario a disattivare visivamente i giorni futuri
            onChange={alCambioData}
            style={styles.calendarioElemento}
          />
        )}
      </View>

      {/* 2. GLICEMIA (Titolo e valore a sinistra) */}
      <View style={[styles.cardInput, { marginBottom: 12 }]}>
        <Text style={styles.labelLeft}>Glicemia (mg/dL)</Text>
        <TextInput
          style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]}
          placeholder="00"
          placeholderTextColor="#C7C7CC"
          keyboardType="numeric"
          value={glicemia}
          onChangeText={setGlicemia}
          maxLength={3}
        />
      </View>

      {/* 3. INSULINA (Titolo e valore a sinistra) */}
      <View style={[styles.cardInput, { marginBottom: 12 }]}>
        <Text style={styles.labelLeft}>Insulina (Unità UI)</Text>
        <TextInput
          style={styles.insulinaInput}
          placeholder="0"
          placeholderTextColor="#C7C7CC"
          keyboardType="numeric"
          value={insulina}
          onChangeText={setInsulina}
          maxLength={2}
        />
      </View>

      {/* 4. SELETTORE 9 MOMENTI */}
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
          placeholderTextColor="#C7C7CC"
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingTop: 45, paddingBottom: 30 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 12, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  dataCardSinistra: { width: '55%', marginBottom: 16, alignSelf: 'flex-start' },
  
  /* Stili pulsante Calendario interattivo */
  containerPulsanteData: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', marginTop: 2, width: '100%' },
  testoPulsanteData: { fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: '600', color: COLORS.brandPrimary },
  calendarioElemento: { marginTop: 8, alignSelf: 'flex-start' },

  /* Input allineati a sinistra */
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 44, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 2, textAlign: 'left', paddingLeft: 2, width: '100%' },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipSelezionata: { backgroundColor: "#E6F0FA", borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.onSurface, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.brandPrimary, fontWeight: '700' },
  
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  notificaTendina: { backgroundColor: '#E6F4EA', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: '#137333', fontWeight: '600', fontSize: 14 }
});
