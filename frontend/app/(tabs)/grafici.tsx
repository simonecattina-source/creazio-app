import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const COLORS = {
  background: "#121212",        
  surfaceSecondary: "#1C1C1E",  
  brandPrimary: "#0A66C2",      
  onSurface: "#FFFFFF",         
  muted: "#8E8E93",             
  success: "#34C759",           
  warning: "#FF9F0A",           
  error: "#FF3B30",             
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
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [timeInRange, setTimeInRange] = useState<number>(0);
  
  const [puntiGraficoLinea, setPJMutiGraficoLinea] = useState<any[]>([]);
  const [medieMomenti, setMedieMomenti] = useState<any[]>([]);
  const [puntiGrafico24Ore, setPuntiGrafico24Ore] = useState<any[]>([]);

  // 💡 STATI E PARAMETRI PER IL MODAL INTERNO DELLE SPIEGAZIONI
  const [modalVisibile, setModalVisibile] = useState<boolean>(false);
  const [modalTitolo, setModalTitolo] = useState<string>("");
  const [modalTesto, setModalTesto] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

  const apriSpiegazione = (tipo: string) => {
    if (tipo === '24h') {
      setModalTitolo("Andamento sulle 24 Ore");
      setModalTesto("Questo grafico mostra l'andamento della glicemia nella giornata di oggi.\n\nLa linea continua azzurra unisce cronologicamente i tuoi test. Per evitare interruzioni al mattino, il grafico recupera automaticamente l'ultima misurazione che hai effettuato ieri sera prima di mezzanotte e la usa come punto di partenza a inizio giornata.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Questo grafico mostra il trend macro della tua media glicemica includendo tutti i 90 giorni del trimestre.\n\nLa fascia verde sullo sfondo evidenzia il range ideale (70 - 180 mg/dL). Le linee tratteggiate indicano i limiti di sicurezza: restare all'interno di questa fascia ti permette di mantenere un ottimo Time in Range (TIR).");
    } else if (tipo === 'momenti') {
      setModalTitolo("Medie per Momento");
      setModalTesto("Questo istogramma analizza lo storico trimestrale (90 giorni) diviso per i 7 controlli del diario clinico.\n\nOgni colonna mostra la media glicemica calcolata in quello specifico orario. Il colore della barra ti indica visivamente lo stato: Verde (a target), Arancione (basso/ipo) o Rosso (alto/iper). Il trattino (-) indica che non ci sono ancora dati inseriti.");
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
          setMediaGlicemia(Math.round(somma / elenco.length));

          const testNelRange = elenco.filter((item: any) => item.glicemia >= 70 && item.glicemia <= 180).length;
          setTimeInRange(Math.round((testNelRange / elenco.length) * 100));

          const oggiObj = new Date();
          const ieriObj = new Date();
          ieriObj.setDate(oggiObj.getDate() - 1);

          const formattaDataTesto = (d: Date) => {
            const g = String(d.getDate()).padStart(2, '0');
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const a = String(d.getFullYear()).slice(-2);
            return `${g}/${m}/${a}`;
          };

          const dataOggiTesto = formattaDataTesto(oggiObj);
          const dataIeriTesto = formattaDataTesto(ieriObj);

          const logDiOggi = elenco.filter((item: any) => item.dataTesto === dataOggiTesto);
          const logDiIeri = elenco.filter((item: any) => item.dataTesto === dataIeriTesto);

          let puntiOggi = logDiOggi.map((item: any) => {
            let ore = 12, minuti = 0;
            if (item.ora && item.ora.includes(':')) {
              const [h, m] = item.ora.split(':');
              ore = parseInt(h);
              minuti = parseInt(m);
            }
            return { minutiAssoluti: (ore * 60) + minuti, glicemia: item.glicemia };
          });

          if (logDiIeri.length > 0) {
            const logDiIeriOrdinati = logDiIeri.map((item: any) => {
              let ore = 0, minuti = 0;
              if (item.ora && item.ora.includes(':')) {
                const [h, m] = item.ora.split(':');
                ore = parseInt(h);
                minuti = parseInt(m);
              }
              return { minutiAssoluti: (ore * 60) + minuti, glicemia: item.glicemia };
            }).sort((a: any, b: any) => a.minutiAssoluti - b.minutiAssoluti);

            const ultimoControlloIeriSera = logDiIeriOrdinati[logDiIeriOrdinati.length - 1];
            puntiOggi.unshift({ minutiAssoluti: 0, glicemia: ultimoControlloIeriSera.glicemia });
          }

          const tracciato24hFlesibile = puntiOggi.sort((a: any, b: any) => a.minutiAssoluti - b.minutiAssoluti);
          setPuntiGrafico24Ore(tracciato24hFlesibile);

          const gruppiPerGiorno: Record<string, number[]> = {};
          elenco.forEach((item: any) => {
            const dataChiave = item.dataTesto || "Oggi";
            if (!gruppiPerGiorno[dataChiave]) gruppiPerGiorno[dataChiave] = [];
            gruppiPerGiorno[dataChiave].push(item.glicemia);
          });

          const andamentoCronologico = Object.keys(gruppiPerGiorno)
            .map(dataChiave => {
              const valoriGiorno = gruppiPerGiorno[dataChiave];
              const mediaGiorno = valoriGiorno.reduce((s, v) => s + v, 0) / valoriGiorno.length;
              return { dataLabel: dataChiave, media: Math.round(mediaGiorno) };
            })
            .sort((a, b) => parsingData(a.dataLabel).getTime() - parsingData(b.dataLabel).getTime());
          setPJMutiGraficoLinea(andamentoCronologico);

          const gruppiPerMomento: Record<string, number[]> = {};
          MOMENTI_ELENCO.forEach(m => { gruppiPerMomento[m] = []; });

          elenco.forEach((item: any) => {
            if (gruppiPerMomento[item.tipo] !== undefined) {
              gruppiPerMomento[item.tipo].push(item.glicemia);
            }
          });

          const calcoloMedieMomenti = MOMENTI_ELENCO.map(m => {
            const valori = gruppiPerMomento[m];
            const media = valori.length > 0 ? Math.round(valori.reduce((s, v) => s + v, 0) / valori.length) : 0;
            return { momento: m, media };
          });
          setMedieMomenti(calcoloMedieMomenti);

        } else {
          setMediaGlicemia(0);
          setTimeInRange(0);
          setPJMutiGraficoLinea([]);
          setMedieMomenti([]);
          setPuntiGrafico24Ore([]);
        }
      }
    } catch (e) {
      console.log("Errore calcolo dati.");
    }
  };

  const calcolaCoordinateLineaX = (valoreGlicemia: number, altezzaGrafico: number) => {
    const GLICEMIA_MIN = 40;
    const GLICEMIA_MAX = 240;
    const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valoreGlicemia));
    const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
    return altezzaGrafico - (percentuale * altezzaGrafico);
  };
  const renderizzaGraficoLinea24Ore = () => {
    if (puntiGrafico24Ore.length === 0) return null;
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 150;
    const margineLaterale = 25;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const rigaSoglia180Y = calcolaCoordinateLineaX(180, altezzaGrafico);
    const rigaSoglia70Y = calcolaCoordinateLineaX(70, altezzaGrafico);

    const coordinataPunti = puntiGrafico24Ore.map((punto) => {
      const percentualeX = punto.minutiAssoluti / 1440;
      const x = margineLaterale + (percentualeX * spazioUtileX);
      const y = calcolaCoordinateLineaX(punto.glicemia, altezzaGrafico);
      return { x, y, ...punto };
    });

    let percorsoLineaD = "";
    coordinataPunti.forEach((p, i) => {
      if (i === 0) percorsoLineaD += `M ${p.x} ${p.y}`;
      else percorsoLineaD += ` L ${p.x} ${p.y}`;
    });

    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height="175" style={{ display: 'block', overflow: 'visible' }}>
          <rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(52, 199, 89, 0.06)" />
          <line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 12} y={rigaSoglia180Y + 4} fill={COLORS.error} fontSize="10" fontWeight="bold" textAnchor="end">180</text>
          <line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 12} y={rigaSoglia70Y + 4} fill={COLORS.warning} fontSize="10" fontWeight="bold" textAnchor="end">70</text>
          
          {percorsoLineaD !== "" && <path d={percorsoLineaD} fill="none" stroke="#5AC8FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          
          {coordinataPunti.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill={p.glicemia > 180 ? COLORS.error : p.glicemia < 70 ? COLORS.warning : COLORS.success} stroke="#1C1C1E" strokeWidth="1" />
              <text x={p.x} y={p.y - 8} fill={COLORS.onSurface} fontSize="9" fontWeight="700" textAnchor="middle">{p.glicemia}</text>
            </g>
          ))}
        </svg>
        <View style={styles.rigaEtichetteDate}>
          <Text style={styles.dataTestoLabel}>00:00</Text>
          <Text style={styles.dataTestoLabel}>06:00</Text>
          <Text style={styles.dataTestoLabel}>12:00</Text>
          <Text style={styles.dataTestoLabel}>18:00</Text>
          <Text style={styles.dataTestoLabel}>24:00</Text>
        </View>
      </View>
    );
  };

  const renderizzaGraficoLineaGiorni = () => {
    if (puntiGraficoLinea.length === 0) return null;
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 150;
    const margineLaterale = 20;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const rigaSoglia180Y = calcolaCoordinateLineaX(180, altezzaGrafico);
    const rigaSoglia70Y = calcolaCoordinateLineaX(70, altezzaGrafico);

    const coordinataPunti = puntiGraficoLinea.map((punto, indice) => {
      const x = margineLaterale + (indice * (spazioUtileX / (puntiGraficoLinea.length - 1 || 1)));
      const y = calcolaCoordinateLineaX(punto.media, altezzaGrafico);
      return { x, y, ...punto };
    });

    let percorsoLineaD = "";
    coordinataPunti.forEach((p, i) => {
      if (i === 0) percorsoLineaD += `M ${p.x} ${p.y}`;
      else percorsoLineaD += ` L ${p.x} ${p.y}`;
    });

    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height="175" style={{ display: 'block', overflow: 'visible' }}>
          <rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(52, 199, 89, 0.06)" />
          <line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 12} y={rigaSoglia180Y + 4} fill={COLORS.error} fontSize="10" fontWeight="bold" textAnchor="end">180</text>
          <line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 12} y={rigaSoglia70Y + 4} fill={COLORS.warning} fontSize="10" fontWeight="bold" textAnchor="end">70</text>
          
          {percorsoLineaD !== "" && <path d={percorsoLineaD} fill="none" stroke={COLORS.brandPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          
          {coordinataPunti.map((p, i) => {
            const mostraDettaglioPunto = coordinataPunti.length <= 15;
            if (!mostraDettaglioPunto) return null;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" fill={p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success} stroke="#1C1C1E" strokeWidth="1" />
                <text x={p.x} y={p.y - 8} fill={COLORS.onSurface} fontSize="9" fontWeight="700" textAnchor="middle">{p.media}</text>
              </g>
            );
          })}
        </svg>
        <View style={styles.rigaEtichetteDate}>
          {puntiGraficoLinea.map((p, i) => {
            const mostraData = i === 0 || i === Math.floor(puntiGraficoLinea.length / 2) || i === puntiGraficoLinea.length - 1;
            return <Text key={i} style={[styles.dataTestoLabel, { opacity: mostraData ? 1 : 0 }]}>{p.dataLabel.slice(0, 5)}</Text>;
          })}
        </View>
      </View>
    );
  };
  const renderizzaGraficoColonneMomenti = () => {
    if (medieMomenti.length === 0) return null;
    const altezzaMassimaColonna = 110;
    const valoreMassimoScala = Array.from(new Set()).length + 300;

    return (
      <View style={styles.containerGraficoSvg}>
        <View style={styles.rigaColonneContainer}>
          {medieMomenti.map((m, i) => {
            const altezzaCalcolata = m.media > 0 ? Math.min(altezzaMassimaColonna, (m.media / valoreMassimoScala) * altezzaMassimaColonna) : 4;
            const coloreColonna = m.media === 0 ? "#2C2C2E" : m.media > 180 ? COLORS.error : m.media < 70 ? COLORS.warning : COLORS.success;

            return (
              <View key={i} style={styles.singolaColonnaWrapper}>
                <Text style={[styles.valoreColonnaTesto, { color: m.media === 0 ? COLORS.muted : COLORS.onSurface }]}>{m.media > 0 ? m.media : '-'}</Text>
                <View style={[styles.colonnaRettangolo, { height: altezzaCalcolata, backgroundColor: coloreColonna }]} />
                <Text style={styles.etichettaColonnaMomento}>{MOMENTI_SHORT[m.momento as keyof typeof MOMENTI_SHORT]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>

      {/* 🔮 MODAL PERSONALIZZATO AD ALTA REATTIVITÀ PER L'INTERFACCIA GRAFICA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisibile}
        onRequestClose={() => setModalVisibile(false)}
      >
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>{modalTitolo}</Text>
            <Text style={styles.testoDescrizioneModal}>{modalTesto}</Text>
            <TouchableOpacity 
              style={styles.bottoneChiudiModal} 
              onPress={() => setModalVisibile(false)}
            >
              <Text style={styles.testoBottoneChiudi}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <View style={styles.riepilogoCard}>
        <Text style={styles.sectionLabel}>Panoramica Trimestrale (90 GG)</Text>
        <View style={styles.containerRigaRiepilogo}>
          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Media</Text>
            <Text style={[styles.statValue, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : COLORS.success }]}>{mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg/dL</Text></Text>
          </View>
          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>In Range (TIR)</Text>
            <Text style={[styles.statValue, { color: timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>{totaleMisurazioni > 0 ? `${timeInRange}%` : '-'}</Text>
          </View>
          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Test Totali</Text>
            <Text style={styles.statValue}>{totaleMisurazioni}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardGraficoContenitore}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento sulle 24 Ore (Oggi)</Text>
          <TouchableOpacity 
            onPress={() => apriSpiegazione('24h')} 
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.pulsanteInfoTocco}
          >
            <Ionicons name="information-circle-outline" size={21} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Linea continua collegata dall'ultima misurazione effettuata ieri sera.</Text>
        {puntiGrafico24Ore.length > 0 ? renderizzaGraficoLinea24Ore() : (
          <View style={{ paddingVertical: 45, alignItems: 'center', width: '100%' }}>
            <Ionicons name="time-outline" size={28} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13, fontFamily: 'Plus Jakarta Sans' }}>Nessuna misurazione disponibile.</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
          <TouchableOpacity 
            onPress={() => apriSpiegazione('giornaliere')} 
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.pulsanteInfoTocco}
          >
            <Ionicons name="information-circle-outline" size={21} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>La fascia evidenziata indica il range ideale (70-180 mg/dL).</Text>
        {puntiGraficoLinea.length > 0 ? renderizzaGraficoLineaGiorni() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="analytics-outline" size={28} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato disponibile.</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Medie per Momento della Giornata</Text>
          <TouchableOpacity 
            onPress={() => apriSpiegazione('momenti')} 
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.pulsanteInfoTocco}
          >
            <Ionicons name="information-circle-outline" size={21} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Analisi divisa per i 7 controlli del diario clinico.</Text>
        {totaleMisurazioni > 0 ? renderizzaGraficoColonneMomenti() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="bar-chart-outline" size={28} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato inserito.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 30 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  subLabelSpiegazione: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 16 },
  riepilogoCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 },
  containerRigaRiepilogo: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 10 },
  infoBoxStat: { flex: 1, backgroundColor: '#121212', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'flex-start' },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  statValue: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  unitaMisuraSub: { fontSize: 10, color: COLORS.muted, fontWeight: '400' },
  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'flex-start' },
  rigaTitoloGrafico: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  pulsanteInfoTocco: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  containerGraficoSvg: { width: '100%', marginTop: 6, position: 'relative' },
  rigaEtichetteDate: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingHorizontal: 2 },
  dataTestoLabel: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '600', color: COLORS.muted },
  rigaColonneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', minHeight: 140, paddingTop: 15, alignItems: 'flex-end' },
  singolaColonnaWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  valoreColonnaTesto: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '700' },
  colonnaRettangolo: { width: 18, borderRadius: 5, minHeight: 4 },
  etichettaColonnaMomento: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  
  // 🎨 STILI CSS PER LA SCHEDA DEL NUOVO MODAL
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'flex-start' },
  titoloModal: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },
  testoDescrizioneModal: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, lineHeight: 20, textAlign: 'left' },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: COLORS.brandPrimary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' },
  testoBottoneChiudi: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface }
});
