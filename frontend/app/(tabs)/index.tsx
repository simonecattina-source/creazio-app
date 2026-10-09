import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const COLORS = {
  background: "#000000",
  surfaceSecondary: "#1C1C1E", // Il tuo grigio classico originale
  onSurface: "#FFFFFF",
  muted: "#8E8E93",
  success: "#34C759", // I tuoi colori standard
  warning: "#FF9500",
  error: "#FF3B30",
  brandPrimary: "#0A84FF"
};

const MOMENTI_ELENCO = [
  "Prima Colazione", "Dopo Colazione",
  "Prima Pranzo", "Dopo Pranzo",
  "Prima Cena", "Dopo Cena", "Notte"
];

export default function HomeScreen() {
  const [ultimoValore, setUltimoValore] = useState<number | null>(null);
  const [ultimoOrario, setUltimoOrario] = useState<string>("");
  const [ultimoStato, setUltimoStato] = useState<string>("Nessun dato");
  const [pastiCompletati, setPastiCompletati] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useFocusEffect(
    React.useCallback(() => {
      sincronizzaDatiHome();
    }, [])
  );

  const sincronizzaDatiHome = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        const elenco = JSON.parse(datiSalvati);
        if (elenco.length > 0) {
          const elencoOrdinato = [...elenco].sort((a: any, b: any) => {
            const [gA, mA, aA] = a.dataTesto.split('/');
            const [hA, minA] = a.ora.split(':');
            const dataA = new Date(2000 + parseInt(aA), parseInt(mA) - 1, parseInt(gA), parseInt(hA), parseInt(minA));
            const [gB, mB, aB] = b.dataTesto.split('/');
            const [hB, minB] = b.ora.split(':');
            const dataB = new Date(2000 + parseInt(aB), parseInt(mB) - 1, parseInt(gB), parseInt(hB), parseInt(minB));
            return dataB.getTime() - dataA.getTime();
          });

          const ultimo = elencoOrdinato[0];
          setUltimoValore(ultimo.glicemia);
          setUltimoOrario(`${ultimo.dataTesto.slice(0, 5)} alle ${ultimo.ora}`);
          
          if (ultimo.glicemia < 70) setUltimoStato("Ipoglicemia");
          else if (ultimo.glicemia <= 180) setUltimoStato("In Target");
          else setUltimoStato("Iperglicemia");

          const oggiObj = new Date();
          const g = String(oggiObj.getDate()).padStart(2, '0');
          const m = String(oggiObj.getMonth() + 1).padStart(2, '0');
          const a = String(oggiObj.getFullYear()).slice(-2);
          const dataOggiTesto = `${g}/${m}/${a}`;

          const logOggi = elenco.filter((item: any) => item.dataTesto === dataOggiTesto);
          const mappaPasti: Record<string, boolean> = {};
          MOMENTI_ELENCO.forEach(m => { mappaPasti[m] = false; });
          logOggi.forEach((item: any) => {
            if (mappaPasti[item.tipo] !== undefined) mappaPasti[item.tipo] = true;
          });
          setPastiCompletati(mappaPasti);
        } else {
          resettaStati();
        }
      } else {
        resettaStati();
      }
    } catch (e) {
      console.log("Errore caricamento Home");
    }
  };

  const resettaStati = () => {
    setUltimoValore(null);
    setUltimoOrario("");
    setUltimoStato("Nessun dato");
    const mappaPasti: Record<string, boolean> = {};
    MOMENTI_ELENCO.forEach(m => { mappaPasti[m] = false; });
    setPastiCompletati(mappaPasti);
  };

  const ottieniColoreStato = () => {
    if (ultimoValore === null) return COLORS.muted;
    if (ultimoValore < 70) return COLORS.warning;
    if (ultimoValore <= 180) return COLORS.success;
    return COLORS.error;
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* HEADER: Ripristinato classico con solo l'icona i pulita */}
      <View style={styles.rigaHeaderTitolo}>
        <Text style={styles.titoloSchermata}>GlicoTrack</Text>
        <TouchableOpacity 
          onPress={() => setModalVisible(true)} 
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.pulsanteInfoSoloIcona}
        >
          <Ionicons name="information-circle-outline" size={24} color={COLORS.brandPrimary} />
        </TouchableOpacity>
      </View>

      {/* POP-UP MODAL ORIGINALE */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>Classificazione Glicemica</Text>
            <Text style={styles.testoDescrizioneModal}>
              I livelli di glucosio nel sangue vengono suddivisi in base alle linee guida cliniche internazionali (ADA):\n\n
              • In Target (70 - 180 mg/dL): Valori ottimali stabili.\n\n
              • Ipoglicemia (&lt; 70 mg/dL): Livelli bassi.\n\n
              • Iperglicemia (&gt; 180 mg/dL): Livelli alti.\n\n
              L'anello centrale cambia colore in base all'ultimo inserimento effettuato nel diario clinico.
            </Text>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.testoBottoneChiudi}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CARD CENTRALE GRIGIA CLASSICA RIPRISTINATA */}
      <View style={styles.cardCentraleOriginale}>
        <Text style={styles.etichettaStatoSuperiore}>ULTIMA MISURAZIONE</Text>
        
        {/* Cerchione originale intatto */}
        <View style={[styles.anelloGlicemiaEsterno, { borderColor: ottieniColoreStato() }]}>
          <Text style={[styles.valoreGlicemiaTesto, { color: COLORS.onSurface }]}>
            {ultimoValore !== null ? `${ultimoValore}` : '- -'}
          </Text>
          {ultimoValore !== null && <Text style={styles.unitaMisuraTestoSub}>mg/dL</Text>}
        </View>

        <Text style={[styles.testoStatoClinico, { color: ottieniColoreStato() }]}>{ultimoStato}</Text>
        {ultimoOrario !== "" && <Text style={styles.testoOrarioRilevamento}>{ultimoOrario}</Text>}
      </View>
      {/* GRIGLIA PASTI ORIGINALE RIPRISTINATA AL 100% */}
      <View style={[styles.cardCentraleOriginale, { marginTop: 16 }]}>
        <Text style={styles.sezionePastiTitolo}>Controlli Giornalieri</Text>
        
        <View style={styles.contenitoreListaPasti}>
          {MOMENTI_ELENCO.map((pasto, indice) => (
            <View key={indice} style={styles.rigaSingoloPasto}>
              <View style={styles.bloccoInfoSinistro}>
                <Ionicons 
                  name={pastiCompletati[pasto] ? "checkmark-circle" : "ellipse-outline"} 
                  size={18} 
                  color={pastiCompletati[pasto] ? COLORS.success : COLORS.muted} 
                />
                <Text style={[styles.nomePastoTesto, { color: COLORS.onSurface }]}>
                  {pasto}
                </Text>
              </View>
              <Text style={[styles.testoBadgeStato, { color: pastiCompletati[pasto] ? COLORS.success : COLORS.muted }]}>
                {pastiCompletati[pasto] ? "Eseguito" : "Mancante"}
              </Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

// 📐 FOGLI DI STILE CSS COMPLETI ED ORIGINALI AL 100%
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 40, paddingBottom: 30 },
  rigaHeaderTitolo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  titoloSchermata: { fontSize: 24, fontWeight: 'bold', color: COLORS.onSurface },
  pulsanteInfoSoloIcona: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  // Ripristinate le card grigie piatte originali
  cardCentraleOriginale: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  etichettaStatoSuperiore: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 12 },
  
  anelloGlicemiaEsterno: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  valoreGlicemiaTesto: { fontSize: 36, fontWeight: 'bold' },
  unitaMisuraTestoSub: { fontSize: 12, color: COLORS.muted },
  testoStatoClinico: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  testoOrarioRilevamento: { fontSize: 12, color: COLORS.muted },
  
  sezionePastiTitolo: { fontSize: 16, fontWeight: 'bold', color: COLORS.onSurface, alignSelf: 'flex-start', marginBottom: 12 },
  contenitoreListaPasti: { width: '100%', gap: 10 },
  rigaSingoloPasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 8 },
  bloccoInfoSinistro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomePastoTesto: { fontSize: 14 },
  testoBadgeStato: { fontSize: 14, fontWeight: '500' },
  
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  corpoSchedaModal: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 },
  titoloModal: { fontSize: 18, fontWeight: 'bold', color: COLORS.onSurface, marginBottom: 10 },
  testoDescrizioneModal: { fontSize: 14, color: COLORS.onSurface, lineHeight: 20 },
  bottoneChiudiModal: { marginTop: 20, backgroundColor: COLORS.brandPrimary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  testoBottoneChiudi: { fontSize: 14, fontWeight: 'bold', color: COLORS.onSurface }
});
