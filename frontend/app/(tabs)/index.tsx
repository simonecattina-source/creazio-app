import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// 🎨 DESIGN SYSTEM ORIGINALE PRESERVATO CON ACCENTI PREMIUM
const COLORS = {
  background: "#000000",
  surfaceSecondary: "#1C1C1E", // Grigio classico originale delle tue card
  onSurface: "#FFFFFF",
  muted: "#8E8E93",
  success: "#34C759", // Verde clinico standard
  warning: "#FF9500", // Arancione ipoglicemia
  error: "#FF3B30",   // Rosso iperglicemia
  brandPrimary: "#00E5FF" // Cyan elettrico per l'icona info premium
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
      
      {/* HEADER: HEADER CLASSICO ED ICONA INFO AGGIORNATA MINIMAL IN CIANO NEON */}
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

      {/* POP-UP MODAL: GUIDA ALL'USO IN STILE PREMIUM DARK SCURO (I 4 PUNTI ORIGINALI) */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>Guida all'Uso</Text>
            <ScrollView style={{ width: '100%', maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.testoDescrizioneModal}>
                <Text style={{ fontWeight: '800', color: COLORS.onSurface }}>🛡️ Archivio Rotante di 90 Giorni</Text>{"\n"}
                L'app memorizza ed esegue il calcolo dei dati basandosi sull'ultimo trimestre completo (13 settimane). Ad ogni nuovo inserimento, i log antecedenti ai 90 giorni vengono eliminati automaticamente per salvaguardare spazio e privacy.{"\n\n"}
                
                <Text style={{ fontWeight: '800', color: COLORS.onSurface }}>⏰ Tracciamento Orario Intraday</Text>{"\n"}
                L'orario selezionato viene memorizzato per ordinare cronologicamente la timeline e viene fuso automaticamente tra parentesi quadre all'inizio delle deine Note. In questo modo rimarrà impresso in modo chiaro anche nell'esportazione.{"\n\n"}
                
                <Text style={{ fontWeight: '800', color: COLORS.success }}>📊 Codici Colore Medici</Text>{"\n"}
                I valori inseriti assumono colori diversi in base alle soglie cliniche standard: Verde per valori normali (70-180 mg/dL), Arancione in caso di ipoglicemia (&lt;70 mg/dL) e Rosso per iperglicemia (&gt;180 mg/dL).{"\n\n"}
                
                <Text style={{ fontWeight: '800', color: COLORS.brandPrimary }}>📄 Esportazione PDF Griglia Orizzontale</Text>{"\n"}
                Dalla sezione "Storico" puoi applicare i filtri rapidi (7, 14, 30, 90 giorni) e generare un report a griglia orizzontale strutturato pronto per la stampa o l'invio diretto al tuo medico diabetologo.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.testoBottoneChiudi}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CARD CENTRALE CLASSICA GRIGIA PRESERVATA AL 100% INALTERATA */}
      <View style={styles.cardCentraleOriginale}>
        <Text style={styles.etichettaStatoSuperiore}>ULTIMA MISURAZIONE</Text>
        
        {/* Cerchione originale intatto con dimensioni fisse stabili */}
        <View style={[styles.anelloGlicemiaEsterno, { borderColor: ottieniColoreStato() }]}>
          <Text style={[styles.valoreGlicemiaTesto, { color: COLORS.onSurface }]}>
            {ultimoValore !== null ? `${ultimoValore}` : '- -'}
          </Text>
          {ultimoValore !== null && <Text style={styles.unitaMisuraTestoSub}>mg/dL</Text>}
        </View>

        <Text style={[styles.testoStatoClinico, { color: ottieniColoreStato() }]}>{ultimoStato}</Text>
        {ultimoOrario !== "" && <Text style={styles.testoOrarioRilevamento}>{ultimoOrario}</Text>}
      </View>
      {/* GRIGLIA PASTI ORIGINALE INTEGRALE E PRESERVATA AL 100% */}
      <View style={[styles.cardCentraleOriginale, { marginTop: 16 }]}>
        <Text style={styles.sezionePastiTitolo}>Controlli Giornalieri Diario</Text>
        
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

// 📐 FOGLI DI STILE CSS COMPLETI: PRESERVATI TUTTI I PARAMETRI E LE CARD ORIGINALI RIGIDE
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 35 },
  rigaHeaderTitolo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  titoloSchermata: { fontSize: 24, fontWeight: 'bold', color: COLORS.onSurface },
  
  // 🌟 Pulsante minimal pulito con area di tocco confortevole estesa
  pulsanteInfoSoloIcona: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  // Le card grigie piatte classiche del tuo layout d'origine
  cardCentraleOriginale: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  etichettaStatoSuperiore: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 14 },
  
  // Cerchione di controllo originale (Altezze e diametri fisse stabili)
  anelloGlicemiaEsterno: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  valoreGlicemiaTesto: { fontSize: 36, fontWeight: 'bold' },
  unitaMisuraTestoSub: { fontSize: 12, color: COLORS.muted },
  testoStatoClinico: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  testoOrarioRilevamento: { fontSize: 12, color: COLORS.muted },
  
  // Sezione lista pasti classica
  sezionePastiTitolo: { fontSize: 16, fontWeight: 'bold', color: COLORS.onSurface, alignSelf: 'flex-start', marginBottom: 14 },
  contenitoreListaPasti: { width: '100%', gap: 10 },
  rigaSingoloPasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 8 },
  bloccoInfoSinistro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomePastoTesto: { fontSize: 14 },
  testoBadgeStato: { fontSize: 14, fontWeight: '500' },
  
  // 🌟 Modal Pop-Up in stile Premium Dark Vetro coerente con i grafici curvi
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#111116', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'flex-start' },
  titoloModal: { fontSize: 18, fontWeight: '800', color: COLORS.onSurface, marginBottom: 14 },
  testoDescrizioneModal: { fontSize: 13, color: '#8E8E93', lineHeight: 20, textAlign: 'left' },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' },
  testoBottoneChiudi: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface }
});
