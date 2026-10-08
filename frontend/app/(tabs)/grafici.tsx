import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions } from 'react-native';
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
  "Prima Colazione": "Pr.Col", "Dopo Colazione": "Dp.Col",
  "Prima Pranzo": "Pr.Prz", "Dopo Pranzo": "Dp.Prz",
  "Prima Cena": "Pr.Cen", "Dopo Cena": "Dp.Cen", "Notte": "Notte"
};

export default function GraficiScreen() {
  const [datiReales, setDatiReales] = useState<any[]>([]);
  const [mediaGlicemia, setMediaGlicemia] = useState<number>(0);
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [puntiGrafico, setPuntiGrafico] = useState<{ dataLabel: string; media: number }[]>([]);
  const [medieMomenti, setMedieMomenti] = useState<{ momento: string; media: number }[]>([]);
  
  // 📊 Nuovo stato per memorizzare la percentuale esatta di Time in Range
  const [timeInRange, setTimeInRange] = useState<number>(0);

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

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
        setDatiReales(elenco);
        setTotaleMisurazioni(elenco.length);

        if (elenco.length > 0) {
          // 1. Media Totale
          const somma = elenco.reduce((acc: number, item: any) => acc + item.glicemia, 0);
          setMediaGlicemia(Math.round(somma / elenco.length));

          // 2. 🪄 CALCOLO MATEMATICO DEL TIME IN RANGE (Soglie cliniche rigide 70-180 mg/dL)
          const testNelRange = elenco.filter((item: any) => item.glicemia >= 70 && item.glicemia <= 180).length;
          const percentualeTIR = Math.round((testNelRange / elenco.length) * 100);
          setTimeInRange(percentualeTIR);

          // 3. Grafico Linea: Raggruppamento per giorno
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

          setPuntiGrafico(andamentoCronologico.slice(-10));

          // 4. Algoritmo Medie sui 7 Momenti principali
          const gruppiPerMomento: Record<string, number[]> = {};
          MOMENTI_ELENCO.forEach(m => { gruppiPerMomento[m] = []; });

          elenco.forEach((item: any) => {
            if (gruppiPerMomento[item.tipo] !== undefined) {
              gruppiPerMomento[item.tipo].push(item.glicemia);
            }
          });

          const calcoloMedieMomenti = MOMENTI_ELENCO.map(m => {
            const valori = gruppiPerMomento[m];
            const media = valori.length > 0 
              ? Math.round(valori.reduce((s, v) => s + v, 0) / valori.length)
              : 0;
            return { momento: m, media };
          });
          setMedieMomenti(calcoloMedieMomenti);

        } else {
          setMediaGlicemia(0);
          setTimeInRange(0);
          setPuntiGrafico([]);
          setMedieMomenti([]);
        }
      }
    } catch (e) {
      console.log("Errore nel calcolo del Time in Range.");
    }
  };

  const renderizzaGraficoLineaNativa = () => {
    if (puntiGrafico.length === 0) return null;
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 160;
    const margineLaterale = 20;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const GLICEMIA_MIN = 40;
    const GLICEMIA_MAX = 240;
    
    const calcolaY = (valore: number) => {
      const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valore));
      const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
      return altezzaGrafico - (percentuale * altezzaGrafico);
    };

    const rigaSoglia180Y = calcolaY(180);
    const rigaSoglia70Y = calcolaY(70);

    const coordinataPunti = puntiGrafico.map((punto, indice) => {
      const x = margineLaterale + (indice * (spazioUtileX / (puntiGrafico.length - 1 || 1)));
      const y = calcolaY(punto.media);
      return { x, y, ...punto };
    });

    let percorsoLineaD = "";
    coordinataPunti.forEach((p, i) => {
      if (i === 0) percorsoLineaD += `M ${p.x} ${p.y}`;
      else percorsoLineaD += ` L ${p.x} ${p.y}`;
    });
    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height="185" style={{ display: 'block', overflow: 'visible' }}>
          <rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(52, 199, 89, 0.06)" />
          <line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 15} y={rigaSoglia180Y + 4} fill={COLORS.error} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="end">180</text>
          <line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={larghezzaGrafico - 15} y={rigaSoglia70Y + 4} fill={COLORS.warning} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="end">70</text>
          {percorsoLineaD !== "" && <path d={percorsoLineaD} fill="none" stroke={COLORS.brandPrimary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {coordinataPunti.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill={p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success} stroke="#1C1C1E" strokeWidth="1.5" />
              {(coordinataPunti.length < 8 || i % 2 === 0) && <text x={p.x} y={p.y - 10} fill={COLORS.onSurface} fontSize="10" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">{p.media}</text>}
            </g>
          ))}
        </svg>
        <View style={styles.rigaEtichetteDate}>
          {puntiGrafico.map((p, i) => {
            const mostraData = i === 0 || i === Math.floor(puntiGrafico.length / 2) || i === puntiGrafico.length - 1;
            return <Text key={i} style={[styles.dataTestoLabel, { opacity: mostraData ? 1 : 0 }]}>{p.dataLabel.slice(0, 5)}</Text>;
          })}
        </View>
      </View>
    );
  };

  const renderizzaGraficoColonneMomenti = () => {
    if (medieMomenti.length === 0) return null;
    const altezzaMassimaColonna = 120;
    const valoreMassimoScala = 300; 

    return (
      <View style={styles.containerGraficoSvg}>
        <View style={styles.rigaColonneContainer}>
          {medieMomenti.map((m, i) => {
            const altezzaCalcolata = m.media > 0 ? Math.min(altezzaMassimaColonna, (m.media / valoreMassimoScala) * altezzaMassimaColonna) : 4;
            const coloreColonna = m.media === 0 ? "#2C2C2E" : m.media > 180 ? COLORS.error : m.media < 70 ? COLORS.warning : COLORS.success;

            return (
              <View key={i} style={styles.singolaColonnaWrapper}>
                <Text style={[styles.valoreColonnaTesto, { color: m.media === 0 ? COLORS.muted : COLORS.onSurface }]}>
                  {m.media > 0 ? m.media : '-'}
                </Text>
                <View style={[styles.colonnaRettangolo, { height: altezzaCalcolata, backgroundColor: coloreColonna }]} />
                <Text style={styles.etichettaColonnaMomento}>
                  {MOMENTI_SHORT[m.momento as keyof typeof MOMENTI_SHORT]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // 🪄 Ritorna l'assegnazione colore in base alla percentuale clinica di Time in Range dell'utente
  const ottieniColoreTIR = () => {
    if (timeInRange === 0) return COLORS.onSurface;
    if (timeInRange >= 70) return COLORS.success; // Sopra il 70% l'obiettivo medico è centrato eccellentemente
    if (timeInRange >= 50) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>
      
      {/* 📊 PANNELLO RIEPILOGO STATISTICO AGGIORNATO CON 3 RIQUADRI AFFIANCATI */}
      <View style={styles.riepilogoCard}>
        <Text style={styles.sectionLabel}>Panoramica Trimestrale (91 GG)</Text>
        <View style={styles.containerRigaRiepilogo}>
          
          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Media</Text>
            <Text style={[styles.statValue, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : COLORS.success }]}>
              {mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg/dL</Text>
            </Text>
          </View>

          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>In Range (TIR)</Text>
            <Text style={[styles.statValue, { color: ottieniColoreTIR() }]}>
              {totaleMisurazioni > 0 ? `${timeInRange}%` : '-'}
            </Text>
          </View>

          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Test Totali</Text>
            <Text style={styles.statValue}>{totaleMisurazioni}</Text>
          </View>

        </View>
      </View>

      <View style={styles.cardGraficoContenitore}>
        <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
        <Text style={styles.subLabelSpiegazione}>La fascia evidenziata indica il range ideale (70-180 mg/dL).</Text>
        {puntiGrafico.length > 0 ? renderizzaGraficoLineaNativa() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="analytics-outline" size={28} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato disponibile.</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Medie per Momento della Giornata</Text>
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
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  subLabelSpiegazione: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  riepilogoCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 },
  containerRigaRiepilogo: { flexDirection: 'row', gap: 10, width: '100%' },
  
  /* Box riorganizzati a 3 colonne simmetriche ed eleganti */
  infoBoxStat: { flex: 1, backgroundColor: '#121212', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'flex-start' },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  statValue: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  unitaMisuraSub: { fontSize: 10, color: COLORS.muted, fontWeight: '400' },
  
  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'flex-start' },
  containerGraficoSvg: { width: '100%', marginTop: 6, position: 'relative' },
  rigaEtichetteDate: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingHorizontal: 2 },
  dataTestoLabel: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '600', color: COLORS.muted },

  rigaColonneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', minHeight: 155, paddingTop: 15, alignItems: 'flex-end' },
  singolaColonnaWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  valoreColonnaTesto: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '700' },
  colonnaRettangolo: { width: 18, borderRadius: 5, minHeight: 4 }, 
  地にetaColonnaMomento: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  etichettaColonnaMomento: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 2 }
});
