import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const ottieniDataOdiernaFormattata = () => {
    const oggi = new Date();
    const giorno = String(oggi.getDate()).padStart(2, '0');
    const mese = String(oggi.getMonth() + 1).padStart(2, '0');
    const anno = String(oggi.getFullYear()).slice(-2); 
    return `${giorno}/${mese}/${anno}`;
  };

  const [dataInserita, setDataInserita] = useState(ottieniDataOdiernaFormattata());
  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);

  const gestisciScritturaData = (testo: string) => {
    const numeriPuri = testo.replace(/\D/g, "");
    let testoFormattato = numeriPuri;

    if (numeriPuri.length > 2 && numeriPuri.length <= 4) {
      testoFormattato = `${numeriPuri.slice(0, 2)}/${numeriPuri.slice(2)}`;
    } else if (numeriPuri.length > 4) {
      testoFormattato = `${numeriPuri.slice(0, 2)}/${numeriPuri.slice(2, 4)}/${numeriPuri.slice(4, 6)}`;
    }
    setDataInserita(testoFormattato);
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
    
    // Verifica logica e sicura della lunghezza della stringa (es: "01/10/26" = 8 caratteri)
    if (dataInserita.length !== 8 || !dataInserita.includes('/')) {
      alert("Inserisci la data nel formato corretto GG/MM/AA (es: 01/10/26).");
      return;
    }

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
        dataTesto: dataInserita // Registra la data esatta modificata (es: 01/10/26)
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nuovo Log Clinico</Text>
      
      <View style={styles.cardInput}>
        <Text style={styles.label}>Data del Controllo (GG/MM/AA)</Text>
        <TextInput
          style={styles.dataInput}
          placeholder="GG/MM/AA"
          placeholderTextColor="#C7C7CC"
          keyboardType="numeric"
          value={dataInserita}
          onChangeText={gestisciScritturaData}
          maxLength={8}
        />
      </View>

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

      <View style={styles.cardInput}>
        <Text style={styles.label}>Note Alimentari / Sintomi</Text>
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
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface, marginBottom: 20 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginTop: 15, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  dataInput: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: '600', color: COLORS.brandPrimary, textAlign: 'center', paddingVertical: 4 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 48, fontWeight: '700', textAlign: 'center', paddingVertical: 10 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: '600', color: COLORS.onSurface, textAlign: 'center', paddingVertical: 5 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 5 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  chipSelezionata: { backgroundColor: "#E6F0FA", borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.onSurface, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.brandPrimary, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  notificaTendina: { backgroundColor: '#E6F4EA', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: '#137333', fontWeight: '600', fontSize: 14 }
});
  const ottieniDatiSezionati = () => {
    const sezioni: Record<string, any[]> = {};
    
    datiReali.forEach(item => {
      const dataChiave = item.dataTesto || "Oggi";
      if (!sezioni[dataChiave]) sezioni[dataChiave] = [];
      sezioni[dataChiave].push(item);
    });

    // Riordina i gruppi di date in ordine cronologico decrescente (le più recenti in alto)
    return Object.keys(sezioni)
      .sort((a, b) => {
        if (a === "Oggi") return -1;
        if (b === "Oggi") return 1;
        // Converte GG/MM/AA in un formato confrontabile AA/MM/GG
        const convertiData = (str: string) => {
          const [g, m, a] = str.split('/');
          return `${a}/${m}/${g}`;
        };
        return convertiData(b).localeCompare(convertiData(a));
      })
      .map(chiave => ({ title: chiave, data: sezioni[chiave] }))
      .filter(s => s.data.length > 0);
  };
