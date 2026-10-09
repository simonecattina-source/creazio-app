import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// 🎨 DESIGN SYSTEM NEON HIGH-CONTRAST PREMIUM (COERENTE CON I GRAFICI)
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan elettrico neon per gli accenti
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled (A Target)
  warning: "#FF9100",           // Arancione vivo (Ipo/Attenzione)
  error: "#FF5252",             // Rosso corallo neon (Iper/Alto)
  borderGlass: "rgba(255, 255, 255, 0.06)" 
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
          // Ordina per data e ora decrescente per prendere l'ultimo
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

          // Verifica quali pasti sono stati fatti OGGI
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
      
      {/* HEADER PRINCIPALE: PULSANTE INFO MODIFICATO CON SOLO ICONA REATTIVA */}
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

      {/* POP-UP MODAL INFORMATIVO SUI RANGE CLINICI */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>Classificazione Glicemica</Text>
            <Text style={styles.testoDescrizioneModal}>
              I livelli di glucosio nel sangue vengono suddivisi in base alle linee guida cliniche internazionali (ADA):\n\n
              • <Text style={{ color: COLORS.success, fontWeight: '700' }}>In Target (70 - 180 mg/dL)</Text>: Valori ottimali stabili.\n\n
              • <Text style={{ color: COLORS.warning, fontWeight: '700' }}>Ipoglicemia (&lt; 70 mg/dL)</Text>: Livelli bassi. Richiedono assunzione rapida di carboidrati.\n\n
              • <Text style={{ color: COLORS.error, fontWeight: '700' }}>Iperglicemia (&gt; 180 mg/dL)</Text>: Livelli alti. Monitorare con attenzione.\n\n
              L'anello centrale e i bordi delle card si colorano automaticamente per darti un feedback visivo immediato sullo stato attuale.
            </Text>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.testoBottoneChiudi}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CARD CENTRALE ANNELLO DI CONTROLLO IN VETRO SATINATO (SIZE PRESERVATE AL 100%) */}
      <View style={styles.cardCentraleVetro}>
        <Text style={styles.etichettaStatoSuperiore}>ULTIMA MISURAZIONE</Text>
        
        {/* IL CERCHIONE OLED CENTRAL NEON */}
        <View style={[styles.anelloGlicemiaEsterno, { borderColor: ottieniColoreStato() }]}>
          <Text style={[styles.valoreGlicemiaTesto, { color: ultimoValore ? COLORS.onSurface : COLORS.muted }]}>
            {ultimoValore !== null ? `${ultimoValore}` : '- -'}
          </Text>
          {ultimoValore !== null && <Text style={styles.unitaMisuraTestoSub}>mg/dL</Text>}
        </View>

        <Text style={[styles.testoStatoClinico, { color: ottieniColoreStato() }]}>{ultimoStato}</Text>
        {ultimoOrario !== "" && <Text style={styles.testoOrarioRilevamento}>{ultimoOrario}</Text>}
      </View>
      {/* GRIGLIA DEI PASTI GIORNALIERI IN STILE GLASSMORPHIC SCURO */}
      <View style={[styles.cardCentraleVetro, { marginTop: 16, paddingBottom: 20 }]}>
        <Text style={styles.sezionePastiTitolo}>Controlli Giornalieri Diario</Text>
        <Text style={styles.subDescrizionePasti}>Monitoraggio dello stato dei test eseguiti nella giornata di oggi.</Text>
        
        <View style={styles.contenitoreListaPasti}>
          {MOMENTI_ELENCO.map((pasto, indice) => (
            <View key={indice} style={[styles.rigaSingoloPasto, { borderLeftColor: pastiCompletati[pasto] ? COLORS.success : COLORS.borderGlass }]}>
              <View style={styles.bloccoInfoSinistro}>
                <Ionicons 
                  name={pastiCompletati[pasto] ? "checkmark-circle" : "ellipse-outline"} 
                  size={18} 
                  color={pastiCompletati[pasto] ? COLORS.success : COLORS.muted} 
                />
                <Text style={[styles.nomePastoTesto, { color: pastiCompletati[pasto] ? COLORS.onSurface : COLORS.muted }]}>
                  {pasto}
                </Text>
              </View>
              <View style={[styles.badgeStatoPasto, { backgroundColor: pastiCompletati[pasto] ? "rgba(0, 230, 118, 0.1)" : "#171721" }]}>
                <Text style={[styles.testoBadgeStato, { color: pastiCompletati[pasto] ? COLORS.success : COLORS.muted }]}>
                  {pastiCompletati[pasto] ? "Eseguito" : "Mancante"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

// 📐 FOGLI DI STILE CSS (PROPORZIONI, SIZE E ALTEZZE ORIGINARIE BLOCCATE AL 100%)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 40 },
  
  // Header coordinato: rimosso testi di troppo, solo icona "i" sulla destra
  rigaHeaderTitolo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  titoloSchermata: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.5 },
  pulsanteInfoSoloIcona: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', opacity: 0.9 },
  
  // Card principale in stile vetro scuro coerente con la scheda analisi
  cardCentraleVetro: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  etichettaStatoSuperiore: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 18 },
  
  // Cerchione Oled centrale (Dimensioni strutturali fisse preservate)
  anelloGlicemiaEsterno: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020204', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  valoreGlicemiaTesto: { fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  unitaMisuraTestoSub: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, fontWeight: '600', marginTop: 2 },
  testoStatoClinico: { fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  testoOrarioRilevamento: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  
  // Sezione Griglia dei Pasti inferiore
  sezionePastiTitolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, alignSelf: 'flex-start', letterSpacing: -0.2 },
  subDescrizionePasti: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, alignSelf: 'flex-start', marginTop: 3, marginBottom: 16 },
  contenitoreListaPasti: { width: '100%', gap: 8 },
  
  // Righe dei singoli pasti con bordo indicatore sinistro (3.5px) come nei box delle statistiche
  rigaSingoloPasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: '#020204', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3.5 },
  bloccoInfoSinistro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomePastoTesto: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700' },
  badgeStatoPasto: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  testoBadgeStato: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '800' },
  
  // Modal Pop-Up stile Dark Premium
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#111116', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#22222E', alignItems: 'flex-start' },
  titoloModal: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '800', color: COLORS.onSurface, marginBottom: 12 },
  testoDescrizioneModal: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, lineHeight: 20, textAlign: 'left' },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' },
  testoBottoneChiudi: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface }
});
