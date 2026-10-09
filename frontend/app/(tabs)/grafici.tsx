import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
// 🌟 IMPORTE FONDAMENTALE: Componenti SVG nativi per prevenire il crash su iPhone
import Svg, { Path, Circle, Text as SvgText, Line, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';

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
      setModalTesto("Statistiche complessive degli ultimi 90 giorni.\n\n• Media: la media aritmetica totale.\n• In Range (TIR): test rimasti tra 70 e 180 mg/dL.");
    } else if (tipo === 'oggi') {
      setModalTitolo("Media di Oggi");
      setModalTesto("Media aritmetica dei test effettuati nella giornata di oggi.");
    } else if (tipo === '24h') {
      setModalTitolo("Andamento 24 Ore");
      setModalTesto("Curva continua che unisce cronologicamente i test odierni partendo dall'ultimo valore di ieri sera.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Trend macro trimestrale delle tue medie giornaliere.");
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
          if (logDiOggi.length > 0) {
            const sommaOggi = logDiOggi.reduce((acc: number, item: any) => acc + item.glicemia, 0);
            setMediaOggi(Math.round(sommaOggi / logDiOggi.length));
          } else {
            setMediaOggi(0);
          }

          const logDiIeri = elenco.filter((item: any) => item.dataTesto === dataIeriTesto);

          let puntiOggi = logDiOggi.map((item: any) => {
            let ore = 12, oreMinuti = 0;
            if (item.ora && item.ora.includes(':')) {
              const [h, m] = item.ora.split(':');
              ore = parseInt(h);
              oreMinuti = parseInt(m);
            }
            return { minutesAssoluti: (ore * 60) + oreMinuti, glicemia: item.glicemia };
          });

          if (logDiIeri.length > 0) {
            const logDiIeriOrdinati = logDiIeri.map((item: any) => {
              let ore = 0, oreMinuti = 0;
              if (item.ora && item.ora.includes(':')) {
                const [h, m] = item.ora.split(':');
                ore = parseInt(h);
                oreMinuti = parseInt(m);
              }
              return { minutesAssoluti: (ore * 60) + oreMinuti, glicemia: item.glicemia };
            }).sort((a: any, b: any) => a.minutesAssoluti - b.minutesAssoluti);

            const ultimoControlloIeriSera = logDiIeriOrdinati[logDiIeriOrdinati.length - 1];
            puntiOggi.unshift({ minutesAssoluti: 0, glicemia: ultimoControlloIeriSera.glicemia });
          }

          setPuntiGrafico24Ore(puntiOggi.sort((a: any, b: any) => a.minutesAssoluti - b.minutesAssoluti));

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

  const calcolaCoordinateLineaX = (valoreGlicemia: number, altezzaGrafico: number) => {
    const GLICEMIA_MIN = 40;
    const GLICEMIA_MAX = 240;
    const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valeurGlicemia));
    const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
    return altezzaGrafico - (percentuale * altezzaGrafico);
  };

  const generaPercorsoCurvoBezier = (punti: any[]) => {
    if (!punti || punti.length === 0) return "";
    if (punti.length === 1) return `M ${punti[0].x} ${punti[0].y}`;
    let d = `M ${punti[0].x} ${punti[0].y}`;
    for (let i = 0; i < punti.length - 1; i++) {
      const cpX1 = punti[i].x + (punti[i + 1].x - punti[i].x) / 3;
      const cpY1 = punti[i].y;
      const cpX2 = punti[i].x + 2 * (punti[i + 1].x - punti[i].x) / 3;
      const cpY2 = punti[i + 1].y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${punti[i + 1].x} ${punti[i + 1].y}`;
    }
    return d;
  };
  const renderizzaGraficoLinea24Ore = () => {
    if (puntiGrafico24Ore.length === 0) return null;
    const larghezzaGrafico = Dimensions.get('window').width - 64;
    const altezzaGrafico = 150;
    const margineLaterale = 25;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const rigaSoglia180Y = calcolaCoordinateLineaX(180, altezzaGrafico);
    const rigaSoglia70Y = calcolaCoordinateLineaX(70, altezzaGrafico);

    const coordinataPunti = puntiGrafico24Ore.map((punto) => {
      const percentualeX = punto.minutesAssoluti / 1440;
      const x = margineLaterale + (percentualeX * spazioUtileX);
      const y = calcolaCoordinateLineaX(punto.glicemia, altezzaGrafico);
      return { x, y, ...punto };
    });

    const percorsoCurvaStr = generaPercorsoCurvoBezier(coordinataPunti);
    let percorsoGradienteStr = "";
    if (coordinataPunti.length > 0) {
      percorsoGradienteStr = percorsoCurvaStr + ` L ${coordinataPunti[coordinataPunti.length - 1].x} ${altezzaGrafico} L ${coordinataPunti[0].x} ${altezzaGrafico} Z`;
    }

    return (
      <View style={styles.containerGraficoSvg}>
        <Svg width={larghezzaGrafico} height="175">
          <Defs>
            <LinearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.brandPrimary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={COLORS.brandPrimary} stopOpacity="0.00" />
            </linearGradient>
          </Defs>
          <Rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(0, 230, 118, 0.04)" />
          <Line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
          <SvgText x={larghezzaGrafico - 5} y={rigaSoglia180Y + 3} fill={COLORS.error} fontSize="9" fontWeight="bold" textAnchor="end">180</SvgText>
          <Line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
          <SvgText x={larghezzaGrafico - 5} y={rigaSoglia70Y + 3} fill={COLORS.warning} fontSize="9" fontWeight="bold" textAnchor="end">70</SvgText>
          {percorsoGradienteStr !== "" && <Path d={percorsoGradienteStr} fill="url(#neonCyanGrad)" />}
          {percorsoCurvaStr !== "" && <Path d={percorsoCurvaStr} fill="none" stroke={COLORS.brandPrimary} strokeWidth="3" />}
          {coordinataPunti.map((p, i) => (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r="4" fill={p.glicemia > 180 ? COLORS.error : p.glicemia < 70 ? COLORS.warning : COLORS.success} />
              <SvgText x={p.x} y={p.y - 9} fill={COLORS.onSurface} fontSize="9" fontWeight="bold" textAnchor="middle">{p.glicemia}</SvgText>
            </G>
          ))}
        </Svg>
      </View>
    );
  };

  const renderizzaGraficoLineaGiorni = () => {
    if (puntiGraficoLinea.length === 0) return null;
    const larghezzaGrafico = Dimensions.get('window').width - 64;
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

    const percorsoCurvaStr = generaPercorsoCurvoBezier(coordinataPunti);
    let percorsoGradienteStr = "";
    if (coordinataPunti.length > 0) {
      percorsoGradienteStr = percorsoCurvaStr + ` L ${coordinataPunti[coordinataPunti.length - 1].x} ${altezzaGrafico} L ${coordinataPunti[0].x} ${altezzaGrafico} Z`;
    }

    return (
      <View style={styles.containerGraficoSvg}>
        <Svg width={larghezzaGrafico} height="175">
          <Defs>
            <LinearGradient id="neonPurpleGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.brandSecondary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={COLORS.brandSecondary} stopOpacity="0.00" />
            </linearGradient>
          </Defs>
          <Rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(0, 230, 118, 0.03)" />
          <Line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
          <Line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
          {percorsoGradienteStr !== "" && <Path d={percorsoGradienteStr} fill="url(#neonPurpleGrad)" />}
          {percorsoCurvaStr !== "" && <Path d={percorsoCurvaStr} fill="none" stroke={COLORS.brandSecondary} strokeWidth="3" />}
          {coordinataPunti.map((p, i) => (
            <G key={`macro-${i}`}>
              <Circle cx={p.x} cy={p.y} r="3" fill={p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success} />
              {(coordinataPunti.length < 15 || i % 3 === 0) && (
                <SvgText x={p.x} y={p.y - 9} fill={COLORS.onSurface} fontSize="9" textAnchor="middle">{p.media}</SvgText>
              )}
            </G>
          ))}
        </Svg>
      </View>
    );
  };

  const renderizzaGraficoColonneMomenti = () => {
    if (medieMomenti.length === 0) return null;
    return (
      <View style={styles.rigaColonneContainer}>
        {medieMomenti.map((m, i) => {
          const altezzaCalcolata = m.media > 0 ? Math.min(110, (m.media / 300) * 110) : 4;
          const coloreColonna = m.media === 0 ? "#1F1F29" : m.media > 180 ? COLORS.error : m.media < 70 ? COLORS.warning : COLORS.success;
          return (
            <View key={i} style={styles.singolaColonnaWrapper}>
              <Text style={[styles.valoreColonnaTesto, { color: m.media === 0 ? COLORS.muted : COLORS.onSurface }]}>{m.media > 0 ? m.media : '-'}</Text>
              <View style={[styles.colonnaRettangolo, { height: altezzaCalcolata, backgroundColor: coloreColonna }]} />
              <Text style={styles.etichettaColonnaMomento}>{MOMENTI_SHORT[m.momento as keyof typeof MOMENTI_SHORT]}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const ottieniColoreGlicata = (val: number) => {
    if (val === 0) return "#1F1F29";
    return val < 7.0 ? COLORS.success : val <= 8.0 ? COLORS.warning : COLORS.error;                    
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
      
      {/* 🌟 LAYOUT DELLE CARD ORIZZONTALI: 2/3 E 1/3 PERFETTAMENTE INTEGRATI */}
      <View style={styles.rigaCardSuperioriContainer}>
        <View style={styles.cardSuperioreDueTerzi}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel}>Trimestre (90 GG)</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('trimestrale')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.brandSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.rigaBoxInterniTrimestre}>
            <View style={[styles.infoBoxStatMini, { borderLeftColor: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel}>Media</Text>
              <Text style={[styles.statValueMini, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg/dL</Text>
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
            <View style={[styles.infoBoxStatOggiCompatto, { borderLeftColor: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel}>Media</Text>
              <Text style={[styles.statValueOggiCentrale, { color: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaOggi > 0 ? `${mediaOggi}` : '-'}
              </Text>
              <Text style={styles.unitaMisuraSub}>{mediaOggi > 0 ? 'mg/dL' : 'no test'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* CARD 3: GRAFICO CURVO ANDAMENTO 24 ORE */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento sulle 24 Ore (Oggi)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('24h')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        {puntiGrafico24Ore.length > 0 ? renderizzaGraficoLinea24Ore() : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>Nessuna misurazione disponibile.</Text>
        )}
      </View>

      {/* CARD 4: GRAFICO MACRO TREND 90 GIORNI */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('giornaliere')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandSecondary} />
          </TouchableOpacity>
        </View>
        {pJMutiGraficoLinea.length > 0 ? renderizzaGraficoLineaGiorni() : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>Nessun dato disponibile.</Text>
        )}
      </View>

      {/* CARD 5: ISTOGRAMMI ORARI */}
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Medie per Momento della Giornata</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('momenti')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        {totaleMisurazioni > 0 ? renderizzaGraficoColonneMomenti() : (
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 10 }}>Nessun dato inserito.</Text>
        )}
      </View>

      {/* CARD 6: EMOGLOBINA GLICATA */}
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
  containerGraficoSvg: { width: '100%', marginTop: 10, alignItems: 'center' },
  
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
