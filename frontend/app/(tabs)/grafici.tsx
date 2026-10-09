import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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
      setModalTesto("Statistiche complessive degli ultimi 90 giorni.\n\n• Media: la media aritmetica totale.\n• In Range (TIR): test rimasti tra 70 e 180 mg/dL.");
    } else if (tipo === 'oggi') {
      setModalTitolo("Media di Oggi");
      setModalTesto("Media aritmetica dei test effettuati nella giornata di oggi.");
    } else if (tipo === '24h') {
      setModalTitolo("Andamento 24 Ore");
      setModalTesto("Distribuzione temporale delle misurazioni di oggi divise per fasce di orario.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Trend macro trimestrale delle tue medie per ciascun giorno registrato.");
    } else if (tipo === 'momenti') {
      setModalTitolo("Medie per Momento");
      setModalTesto("Raggruppamento storico diviso per le 7 fasce orarie del diario.");
    } else if (tipo === 'glicata') {
      setModalTitolo("Stima Emoglobina Glicata");
      setModalTesto("Valore puramente indicativo calcolato matematicamente secondo la formula ADA.");
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

          const logDiOggi = elenco.filter((item: any) => item.dataTesto === dataOggiTesto);
          if (logDiOggi.length > 0) {
            const sommaOggi = logDiOggi.reduce((acc: number, item: any) => acc + item.glicemia, 0);
            setMediaOggi(Math.round(sommaOggi / logDiOggi.length));
          } else {
            setMediaOggi(0);
          }

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
      console.log("Errore calcolo dati.");
    }
  };

  const ottieniColoreValore = (val: number) => {
    if (val === 0) return COLORS.borderGlass;
    if (val > 180) return COLORS.error;
    if (val < 70) return COLORS.warning;
    return COLORS.success;
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
      
      {/* 🌟 RIGID PANELS ROW: 2/3 TRIMESTRE E 1/3 OGGI */}
      <View style={styles.rigaCardSuperioriContainer}>
        <View style={styles.cardSuperioreDueTerzi}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel}>Trimestre (90 GG)</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('trimestrale')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.brandSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.rigaBoxInterniTrimestre}>
            <View style={[styles.infoBoxStatMini, { borderLeftColor: ottieniColoreValore(mediaGlicemia) }]}>
              <Text style={styles.statLabel}>Media</Text>
              <Text style={[styles.statValueMini, { color: mediaGlicemia === 0 ? COLORS.muted : ottieniColoreValore(mediaGlicemia) }]}>
                {mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg</Text>
              </Text>
            </View>
            <View style={[styles.infoBoxStatMini, { borderLeftColor: totaleMisurazioni === 0 ? COLORS.borderGlass : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
              <Text style={styles.statLabel}>In Range</Text>
              <Text style={[styles.statValueMini, { color: totaleMisurazioni === 0 ? COLORS.muted : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
                {totaleMisurazioni > 0 ? `${timeInRange}%` : '-'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardSuperioreUnTerzo}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel}>Oggi</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('oggi')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.containerBoxInternoOggi}>
            <View style={[styles.infoBoxStatOggiCompatto, { borderLeftColor: ottieniColoreValore(mediaOggi) }]}>
              <Text style={styles.statLabel}>Media</Text>
              <Text style={[styles.statValueOggiCentrale, { color: mediaOggi === 0 ? COLORS.muted : ottieniColoreValore(mediaOggi) }]}>
                {mediaOggi > 0 ? `${mediaOggi}` : '-'}
              </Text>
              <Text style={styles.unitaMisuraSub}>{mediaOggi > 0 ? 'mg/dL' : 'vuoto'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* GRAFICO 1 NATIVO: TIMELINE DEI LOG ODIERNI */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento sulle 24 Ore (Oggi)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('24h')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={17} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: '100%', marginTop: 12, gap: 8 }}>
          {puntiGrafico24Ore.length > 0 ? puntiGrafico24Ore.map((item: any, idx: number) => (
            <View key={idx} style={styles.barraLogOggiNativa}>
              <Text style={styles.oraLogTesto}>{item.ora || '00:00'}</Text>
              <View style={styles.binarioLineaCentro}>
                <View style={[styles.pallinoNodoIntersezione, { backgroundColor: ottieniColoreValore(item.glicemia) }]} />
              </View>
              <Text style={styles.momentoLogTesto} numberOfLines={1}>{item.tipo}</Text>
              <Text style={[styles.valoreLogTesto, { color: ottieniColoreValore(item.glicemia) }]}>{item.glicemia} mg/dL</Text>
            </View>
          )) : (
            <Text style={{ color: COLORS.muted, fontSize: 13, paddingVertical: 10 }}>Nessun controllo salvato oggi.</Text>
          )}
        </View>
      </View>

      {/* GRAFICO 2 NATIVO: TREND MACRO GIORNALIERO A CASCATA */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('giornaliere')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={17} color={COLORS.brandSecondary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: '100%', marginTop: 12, gap: 10 }}>
          {puntiGraficoLinea.length > 0 ? puntiGraficoLinea.slice(-7).map((item: any, idx: number) => {
            const larghezzaPercentuale = Math.min(100, Math.max(15, (item.media / 250) * 100));
            return (
              <View key={idx} style={styles.rigaMacroTrendOrizzontale}>
                <Text style={styles.etichettaDataMacro}>{item.dataLabel.slice(0, 5)}</Text>
                <View style={styles.areaContenimentoBarra}>
                  <View style={[styles.barraRiempimentoMacro, { width: `${larghezzaPercentuale}%`, backgroundColor: ottieniColoreValore(item.media) }]} />
                </View>
                <Text style={[styles.valoreMacroMedia, { color: ottieniColoreValore(item.media) }]}>{item.media}</Text>
              </View>
            );
          }) : (
            <Text style={{ color: COLORS.muted, fontSize: 13, paddingVertical: 10 }}>Storico diari vuoto.</Text>
          )}
        </View>
      </View>

      {/* GRAFICO 3 NATIVO: ISTOGRAMMI PER MOMENTO (SENZA LIBRERIE ESTERNE) */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Medie per Momento della Giornata</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('momenti')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={17} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        {totaleMisurazioni > 0 ? (
          <View style={styles.rigaColonneContainer}>
            {medieMomenti.map((m, i) => {
              const altezzaCalcolata = m.media > 0 ? Math.min(110, (m.media / 260) * 110) : 4;
              const coloreColonna = m.media === 0 ? "#1F1F29" : ottieniColoreValore(m.media);
              return (
                <View key={i} style={styles.singolaColonnaWrapper}>
                  <Text style={[styles.valoreColonnaTesto, { color: m.media === 0 ? COLORS.muted : COLORS.onSurface }]}>{m.media > 0 ? m.media : '-'}</Text>
                  <View style={[styles.colonnaRettangolo, { height: altezzaCalcolata, backgroundColor: coloreColonna }]} />
                  <Text style={styles.etichettaColonnaMomento}>{MOMENTI_SHORT[m.momento as keyof typeof MOMENTI_SHORT]}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>In attesa di misurazioni.</Text>
        )}
      </View>

      {/* COMPONENTE 4: INTERFACCIA DEDICATA GLICATA */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16, paddingBottom: 20 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Stima Emoglobina Glicata (HbA1c)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('glicata')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={17} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        {totaleMisurazioni > 0 ? (
          <View style={styles.containerInterfacciaGlicata}>
            <View style={styles.rigaDatiGlicataPrincipale}>
              <Text style={[styles.valoreGlicataTestoCentrale, { color: glicataStimata < 7 ? COLORS.success : glicataStimata <= 8 ? COLORS.warning : COLORS.error }]}>
                {glicataStimata > 0 ? `${glicataStimata.toFixed(1)}%` : '-'}
              </Text>
              <Text style={styles.etichettaMmolSecondaria}>
                {glicataMmol > 0 ? `~ ${glicataMmol} mmol/mol` : '-'}
              </Text>
            </View>
            <View style={styles.binarioGrigioBarraSfondo}>
              <View style={[styles.riempimentoAttivoBarra, { width: `${Math.min(100, Math.max(10, (glicataStimata / 12) * 100))}%`, backgroundColor: glicataStimata < 7 ? COLORS.success : glicataStimata <= 8 ? COLORS.warning : COLORS.error }]} />
            </View>
          </View>
        ) : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>Dati storici insufficienti.</Text>
        )}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontWeight: '700', color: COLORS.onSurface, fontSize: 13 },
  
  rigaCardSuperioriContainer: { flexDirection: 'row', width: '100%', gap: 10 },
  cardSuperioreDueTerzi: { flex: 2, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  rigaBoxInterniTrimestre: { flexDirection: 'row', gap: 6, marginTop: 10, width: '100%' },
  infoBoxStatMini: { flex: 1, backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, minHeight: 65 },
  
  cardSuperioreUnTerzo: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  containerBoxInternoOggi: { marginTop: 10, width: '100%' },
  infoBoxStatOggiCompatto: { backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, minHeight: 65 },

  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted, marginBottom: 2 },
  statValueMini: { fontSize: 14, fontWeight: '900', color: COLORS.onSurface },
  unitaMisuraSub: { fontSize: 9, color: COLORS.muted },
  statValueOggiCentrale: { fontSize: 15, fontWeight: '900' },

  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', borderWidth: 1, borderColor: COLORS.borderGlass },
  rigaTitoloGrafico: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  pulsanteInfoTocco: { padding: 2 },
  
  // LOG ODIERNO 24H NATIVO ANTI-CRASH
  barraLogOggiNativa: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 4 },
  oraLogTesto: { fontSize: 12, fontWeight: '700', color: COLORS.muted, width: 40 },
  binarioLineaCentro: { width: 16, alignItems: 'center', justifyContent: 'center' },
  pallinoNodoIntersezione: { width: 8, height: 8, borderRadius: 4 },
  momentoLogTesto: { fontSize: 13, color: COLORS.onSurface, flex: 1, marginLeft: 8 },
  valoreLogTesto: { fontSize: 13, fontWeight: '800' },

  // MACRO TREND ORIZZONTALE NATIVO
  rigaMacroTrendOrizzontale: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  etichettaDataMacro: { fontSize: 12, color: COLORS.muted, width: 40, fontWeight: '600' },
  areaContenimentoBarra: { flex: 1, height: 8, backgroundColor: '#020204', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGlass },
  barraRiempimentoMacro: { height: '100%', borderRadius: 4 },
  valoreMacroMedia: { fontSize: 12, fontWeight: '800', width: 25, textAlign: 'right' },

  rigaColonneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', minHeight: 140, paddingTop: 15, alignItems: 'flex-end' },
  singolaColonnaWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  valoreColonnaTesto: { fontSize: 10, fontWeight: '800' },
  colonnaRettangolo: { width: 14, borderRadius: 4 },
  etichettaColonnaMomento: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#111116', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#22222E' },
  titoloModal: { fontSize: 18, fontWeight: '800', color: COLORS.onSurface, marginBottom: 12 },
  testoDescrizioneModal: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  testoBottoneChiudi: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },

  containerInterfacciaGlicata: { width: '100%', marginTop: 5 },
  rigaDatiGlicataPrincipale: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  valoreGlicataTestoCentrale: { fontSize: 32, fontWeight: '800' },
  etichettaMmolSecondaria: { fontSize: 13, color: COLORS.muted },
  binarioGrigioBarraSfondo: { width: '100%', height: 10, backgroundColor: '#171721', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGlass },
  riempimentoAttivoBarra: { height: '100%' }
});
