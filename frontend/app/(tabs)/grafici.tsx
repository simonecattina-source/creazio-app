import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// 🎨 PALETTE NEON HIGH-CONTRAST PREMIUM COORDINATA
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan elettrico neon
  brandSecondary: "#7D52FF",    // Viola tech
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  warning: "#FF9100",           // Arancione vivo
  error: "#FF5252",             // Rosso corallo neon
  borderGlass: "rgba(255, 255, 255, 0.06)" 
};

const MOMENTI_ELENCO = [
  "Prima Colazione", "Dopo Colazione",
  "Prima Pranzo", "Dopo Pranzo",
  "Prima Cena", "Dopo Cena", "Notte"
];

const MOMENTI_SHORT = {
  "Prima Colazione": "8:00",
  "Dopo Colazione": "11:00",
  "Prima Pranzo": "12:00",
  "Dopo Pranzo": "15:00",
  "Prima Cena": "20:00",
  "Dopo Cena": "22:00",
  "Notte": "24:00"
};

export default function GraficiScreen() {
  const [datiReali, setDatiReali] = useState<any[]>([]);
  const [mediaGlicemia, setMediaGlicemia] = useState<number>(0);
  const [mediaOggi, setMediaOggi] = useState<number>(0); 
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [timeInRange, setTimeInRange] = useState<number>(0);
  
  const [puntiGraficoLinea, setPJMutiGraficoLinea] = useState<any[]>([]);
  const [medieMomenti, setMedieMomenti] = useState<any[]>([]);
  const [puntiGrafico24Ore, setPuntiGrafico24Ore] = useState<any[]>([]);

  const [glicataStimata, setGlicataStimata] = useState<number>(0);
  const [glicataMmol, setGlicataMmol] = useState<number>(0);

  const [modalVisibile, setModalVisibile] = useState<boolean>(false);
  const [modalTitolo, setModalTitolo] = useState<string>("");
  const [modalTesto, setModalTesto] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

  const apriSpiegazione = (tipo: string) => {
    if (tipo === 'trimestrale') {
      setModalTitolo("Panoramica Trimestrale");
      setModalTesto("Questo modulo riassume le tue statistiche complessive degli ultimi 90 giorni.\n\n• Media: la media aritmetica di tutti i test.\n• In Range (TIR): la percentuale di misurazioni rimaste all'interno del range ideale di sicurezza (70 - 180 mg/dL).");
    } else if (tipo === 'oggi') {
      setModalTitolo("Media di Oggi");
      setModalTesto("Questo box calcola in tempo reale la media aritmetica di tutte le misurazioni effettuate esclusivamente nella data corrente (dalle 00:00 ad adesso).\n\nTi permette un controllo immediato per capire se l'andamento della giornata è a target.");
    } else if (tipo === '24h') {
      setModalTitolo("Andamento sulle 24 Ore");
      setModalTesto("Questo grafico mostra l'andamento tracciato riga per riga dei valori glicemici inseriti nella giornata odierna.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Questo grafico mostra il trend macro della tua media glicemica includendo tutti i giorni del diario registrato.");
    } else if (tipo === 'momenti') {
      setModalTitolo("Medie per Momento");
      setModalTesto("Questo grafico analizza lo storico diviso per i momenti chiave della giornata.");
    } else if (tipo === 'glicata') {
      setModalTitolo("Stima Emoglobina Glicata (HbA1c)");
      setModalTesto("Questo modulo esegue una stima matematica predittiva della tua Emoglobina Glicata (HbA1c).\n\nAttenzione: questo valore è puramente indicativo e matematico. Non sostituisce l'esame del sangue effettuato in laboratorio medico.");
    }
    setModalVisibile(true);
  };

  const parsingData = (stringaData: string) => {
    if (!stringaData || !stringaData.includes('/')) return new Date(0);
    const [g, m, a] = stringaData.split('/');
    const annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
    return new Date(annoCompleto, parseInt(m) - 1, parseInt(g));
  };
  const caricaDatiECalcola = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        const elenco = JSON.parse(datiSalvati);
        setDatiReali(elenco);
        setTotaleMisurazioni(elenco.length);

        if (elenco.length > 0) {
          const somma = elenco.reduce((acc: number, item: any) => acc + item.glicemia, 0);
          const mediaCalcolata = Math.round(somma / elenco.length);
          setMediaGlicemia(mediaCalcolata);

          const stimaPercentuale = (mediaCalcolata + 46.7) / 28.7;
          setGlicataStimata(Math.round(stimaPercentuale * 10) / 10);
          const stimaMmol = (stimaPercentuale - 2.15) * 10.978;
          setGlicataMmol(Math.round(stimaMmol));

          const testNelRange = elenco.filter((item: any) => item.glicemia >= 70 && item.glicemia <= 180).length;
          setTimeInRange(Math.round((testNelRange / elenco.length) * 100));

          const oggiObj = new Date();
          const formattaDataTesto = (d: Date) => {
            const g = String(d.getDate()).padStart(2, '0');
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const a = String(d.getFullYear()).slice(-2);
            return `${g}/${m}/${a}`;
          };

          const dataOggiTesto = formattaDataTesto(oggiObj);

          // CALCOLO ISOLATO MEDIA DI OGGI
          const logDiOggi = elenco.filter((item: any) => item.dataTesto === dataOggiTesto);
          if (logDiOggi.length > 0) {
            const sommaOggi = logDiOggi.reduce((acc: number, item: any) => acc + item.glicemia, 0);
            setMediaOggi(Math.round(sommaOggi / logDiOggi.length));
          } else {
            setMediaOggi(0);
          }

          // Salva record per i micro-grafici nativi alternativi protetti da crash
          setPuntiGrafico24Ore(logDiOggi.sort((a: any, b: any) => (a.ora || "").localeCompare(b.ora || "")));

          const gruppiPerGiorno: Record<string, number[]> = {};
          elenco.forEach((item: any) => {
            const dataChiave = item.dataTesto || "Oggi";
            if (!gruppiPerGiorno[dataChiave]) gruppiPerGiorno[dataChiave] = [];
            gruppiPerGiorno[dataChiave].push(item.glicemia);
          });

          const andamentoCronologico = Object.keys(gruppiPerGiorno)
            .map(dataChiave => {
              const valoriGiorno = gruppiPerGiorno[dataChiave];
              return { dataLabel: dataChiave, media: Math.round(valoriGiorno.reduce((s, v) => s + v, 0) / valoriGiorno.length) };
            })
            .sort((a, b) => parsingData(a.dataLabel).getTime() - parsingData(b.dataLabel).getTime());
          setPJMutiGraficoLinea(andamentoCronologico);

          const gruppiPerMomento: Record<string, number[]> = {};
          MOMENTI_ELENCO.forEach(m => { gruppiPerMomento[m] = []; });
          elenco.forEach((item: any) => {
            if (gruppiPerMomento[item.tipo] !== undefined) gruppiPerMomento[item.tipo].push(item.glicemia);
          });

          setMedieMomenti(MOMENTI_ELENCO.map(m => {
            const valori = gruppiPerMomento[m];
            return { momento: m, media: valori.length > 0 ? Math.round(valori.reduce((s, v) => s + v, 0) / valori.length) : 0 };
          }));

        } else {
          setMediaGlicemia(0);
          setMediaOggi(0);
          setTimeInRange(0);
          setTotaleMisurazioni(0);
          setGlicataStimata(0);
          setGlicataMmol(0);
          setPJMutiGraficoLinea([]);
          setMedieMomenti([]);
          setPuntiGrafico24Ore([]);
        }
      }
    } catch (e) {
      console.log("Errore storage grafici.");
    }
  };

  const ottieniColoreGlicata = (val: number) => {
    if (val === 0) return "#1F1F29";
    if (val < 7.0) return COLORS.success;   
    return val <= 8.0 ? COLORS.warning : COLORS.error;                    
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>

      <Modal animationType="fade" transparent={true} visible={modalVisibile} onRequestClose={() => setModalVisibile(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>{modalTitolo}</Text>
            <Text style={styles.testoDescrizioneModal}>{modalTesto}</Text>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisibile(false)}>
              <Text style={styles.testoBottoneChiudi}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 🌟 LAYOUT RIGIDO COMPATIBILE ED AFFIANCATO: CARD 1 (2/3) E CARD 2 (1/3) */}
      <View style={styles.rigaCardSuperioriContainer}>
        
        {/* CARD 1: PANORAMICA TRIMESTRALE (PRENDE 2/3 DELLO SPAZIO) */}
        <View style={styles.cardSuperioreDueTerzi}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} numberOfLines={1}>Trimestre (90 GG)</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('trimestrale')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.brandSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rigaBoxInterniTrimestre}>
            {/* BOX MEDIA */}
            <View style={[styles.infoBoxStatMini, { borderLeftColor: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel} numberOfLines={1}>Media</Text>
              <Text style={[styles.statValueMini, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg</Text>
              </Text>
            </View>
            
            {/* BOX TIR */}
            <View style={[styles.infoBoxStatMini, { borderLeftColor: totaleMisurazioni === 0 ? COLORS.borderGlass : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
              <Text style={styles.statLabel} numberOfLines={1}>In Range</Text>
              <Text style={[styles.statValueMini, { color: totaleMisurazioni === 0 ? COLORS.muted : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
                {totaleMisurazioni > 0 ? `${timeInRange}%` : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* CARD 2: MEDIA DI OGGI (PRENDE 1/3 DELLO SPAZIO - IDENTICA AL VECCHIO BOX CANCELLATO) */}
        <View style={styles.cardSuperioreUnTerzo}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} numberOfLines={1}>Oggi</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('oggi')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.containerBoxInternoOggi}>
            <View style={[styles.infoBoxStatOggiCompatto, { borderLeftColor: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel} numberOfLines={1}>Media</Text>
              <Text style={[styles.statValueOggiCentrale, { color: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaOggi > 0 ? `${mediaOggi}` : '-'}
              </Text>
              <Text style={styles.unitaMisuraSub}>{mediaOggi > 0 ? 'mg/dL' : 'vuoto'}</Text>
            </View>
          </View>
        </View>

      </View>

      {/* DETTAGLIO STORICO DEI RECENTI DI OGGI */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Test effettuati nella giornata (24h)</Text>
          <Ionicons name="calendar-outline" size={16} color={COLORS.brandPrimary} />
        </View>
        <View style={{ width: '100%', marginTop: 12 }}>
          {puntiGrafico24Ore.length > 0 ? puntiGrafico24Ore.map((item: any, index: number) => (
            <View key={index} style={styles.rigaTestNativoOggi}>
              <Text style={styles.testoOraLog}>{item.ora || '--:--'}</Text>
              <Text style={styles.testoMomentoLog}>{item.tipo}</Text>
              <View style={[styles.badgeGlicemiaNativa, { backgroundColor: item.glicemia > 180 ? 'rgba(255,82,82,0.15)' : item.glicemia < 70 ? 'rgba(255,145,0,0.15)' : 'rgba(0,230,118,0.15)' }]}>
                <Text style={{ color: item.glicemia > 180 ? COLORS.error : item.glicemia < 70 ? COLORS.warning : COLORS.success, fontWeight: '800', fontSize: 13 }}>{item.glicemia} mg/dL</Text>
              </View>
            </View>
          )) : (
            <Text style={{ color: COLORS.muted, fontSize: 13, paddingVertical: 10 }}>Nessun test registrato nella giornata di oggi.</Text>
          )}
        </View>
      </View>

      {/* EMOGLOBINA GLICATA ESTIMATA STABILE */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16, paddingBottom: 20 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Stima Emoglobina Glicata (HbA1c)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('glicata')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        
        {totaleMisurazioni > 0 ? (
          <View style={styles.containerInterfacciaGlicata}>
            <View style={styles.rigaDatiGlicataPrincipale}>
              <Text style={[styles.valoreGlicataTestoCentrale, { color: ottieniColoreGlicata(glicataStimata) }]}>
                {glicataStimata > 0 ? `${glicataStimata.toFixed(1)}%` : '-'}
              </Text>
              <Text style={styles.etichettaMmolSecondaria}>
                {glicataMmol > 0 ? `~ ${glicataMmol} mmol/mol` : '-'}
              </Text>
            </View>
            <View style={styles.binarioGrigioBarraSfondo}>
              <View style={[styles.riempimentoAttivoBarra, { width: `${Math.min(100, Math.max(10, (glicataStimata / 12) * 100))}%`, backgroundColor: ottieniColoreGlicata(glicataStimata) }]} />
            </View>
          </View>
        ) : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>Dati storici insufficienti nel trimestre.</Text>
        )}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 40 },
  title: { fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif', fontSize: 24, fontWeight: '800', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontWeight: '700', color: COLORS.onSurface, fontSize: 13 },
  
  rigaCardSuperioriContainer: { flexDirection: 'row', width: '100%', gap: 10 },
  
  cardSuperioreDueTerzi: { flex: 2, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  rigaBoxInterniTrimestre: { flexDirection: 'row', gap: 6, marginTop: 10, width: '100%' },
  infoBoxStatMini: { flex: 1, backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },
  
  cardSuperioreUnTerzo: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  containerBoxInternoOggi: { marginTop: 10, width: '100%' },
  infoBoxStatOggiCompatto: { backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },

  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted, marginBottom: 2 },
  statValueMini: { fontSize: 14, fontWeight: '900', color: COLORS.onSurface },
  unitaMisuraSub: { fontSize: 9, color: COLORS.muted, fontWeight: '400' },
  statValueOggiCentrale: { fontSize: 14, fontWeight: '900' },

  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', borderWidth: 1, borderColor: COLORS.borderGlass },
  rigaTitoloGrafico: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  pulsanteInfoTocco: { padding: 2, opacity: 0.85 },
  
  rigaTestNativoOggi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass },
  testoOraLog: { color: COLORS.brandPrimary, fontWeight: '700', fontSize: 13, width: 45 },
  testoMomentoLog: { color: COLORS.onSurface, fontSize: 13, flex: 1, paddingHorizontal: 10 },
  badgeGlicemiaNativa: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },

  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#111116', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#22222E' },
  titoloModal: { fontSize: 18, fontWeight: '800', color: COLORS.onSurface, marginBottom: 12 },
  testoDescrizioneModal: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  testoBottoneChiudi: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },

  containerInterfacciaGlicata: { width: '100%', marginTop: 5 },
  rigaDatiGlicataPrincipale: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  valoreGlicataTestoCentrale: { fontSize: 32, fontWeight: '800' },
  etichettaMmolSecondaria: { fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  binarioGrigioBarraSfondo: { width: '100%', height: 10, backgroundColor: '#171721', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGlass },
  riempimentoAttivoBarra: { height: '100%', borderRadius: 6 }
});
