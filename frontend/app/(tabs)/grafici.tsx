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
  success: "#34C759", // Verde per la fascia ideale         
  warning: "#FF9F0A",           
  error: "#FF3B30",             
};

export default function GraficiScreen() {
  const [datiReali, setDatiReali] = useState<any[]>([]);
  const [mediaGlicemia, setMediaGlicemia] = useState<number>(0);
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [puntiGrafico, setPuntiGrafico] = useState<{ dataLabel: string; media: number }[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

  // Converte la stringa della data GG/MM/AA in un oggetto Date reale per l'ordinamento cronologico
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
          // 1. Calcolo della media glicemica totale complessiva
          const somma = elenco.reduce((acc: number, item: any) => acc + item.glicemia, 0);
          setMediaGlicemia(Math.round(somma / elenco.length));

          // 2. 🪄 ALGORITMO DI RAGGRUPPAMENTO GIORNALIERO: Unisce i test dello stesso giorno per fare una linea pulita
          const gruppiPerGiorno: Record<string, number[]> = {};
          elenco.forEach((item: any) => {
            const dataChiave = item.dataTesto || "Oggi";
            if (!gruppiPerGiorno[dataChiave]) gruppiPerGiorno[dataChiave] = [];
            gruppiPerGiorno[dataChiave].push(item.glicemia);
          });

          // Calcola la media matematica di ogni singolo giorno e ordina le date dal passato al presente
          const andamentoCronologico = Object.keys(gruppiPerGiorno)
            .map(dataChiave => {
              const valoriGiorno = gruppiPerGiorno[dataChiave];
              const mediaGiorno = valoriGiorno.reduce((s, v) => s + v, 0) / valoriGiorno.length;
              return { dataLabel: dataChiave, media: Math.round(mediaGiorno) };
            })
            .sort((a, b) => parsingData(a.dataLabel).getTime() - parsingData(b.dataLabel).getTime());

          // Prende al massimo gli ultimi 15 giorni con misurazioni per non affollare lo schermo dello smartphone
          setPuntiGrafico(andamentoCronologico.slice(-15));
        } else {
          setMediaGlicemia(0);
          setPuntiGrafico([]);
        }
      }
    } catch (e) {
      console.log("Errore nel caricamento dei dati medici.");
    }
  };
  // 🪄 MOTORE GEOMETRICO: Genera i tracciati SVG matematici per la linea e le soglie
  const renderizzaGraficoLineaNativa = () => {
    if (puntiGrafico.length === 0) return null;

    // Dimensioni fisse ideali per lo schermo dell'iPhone
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 200;
    const margineLaterale = 20;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    // Scala l'altezza del grafico impostando i limiti visivi (Minimo 40, Massimo 240 mg/dL)
    const GLICEMIA_MIN = 40;
    const GLICEMIA_MAX = 240;
    
    const calcolaY = (valore: number) => {
      // Clampa il valore per evitare che esca dai bordi del disegno
      const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valore));
      const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
      return altezzaGrafico - (percentuale * altezzaGrafico);
    };

    // Calcola le coordinate Y stabili per le tue due linee di range fisse
    const rigaSoglia180Y = calcolaY(180);
    const rigaSoglia70Y = calcolaY(70);

    // Genera la stringa dei punti (Coordinate X,Y) per la linea continua dell'andamento
    const coordinataPunti = puntiGrafico.map((punto, indice) => {
      const x = margineLaterale + (indice * (spazioUtileX / (puntiGrafico.length - 1 || 1)));
      const y = calcolaY(punto.media);
      return { x, y, ...punto };
    });

    // Costruisce l'attributo d="M..." per il disegno del tracciato della linea continua
    let percorsoLineaD = "";
    coordinataPunti.forEach((p, i) => {
      if (indice === 0) {
        percorsoLineaD += `M ${p.x} ${p.y}`;
      } else {
        percorsoLineaD += ` L ${p.x} ${p.y}`;
      }
    });
    return (
      <View style={styles.containerGraficoSvg}>
        {/* Disegno geometrico nativo ad alta fluidità */}
        <svg width="100%" height="230" style={{ display: 'block', overflow: 'visible' }}>
          
          {/* 🟢 AREA DI RANGE IDEALE (Sfondo verde chiaro sfumato opaco tra 70 e 180) */}
          <rect
            x={margineLaterale}
            y={rigaSoglia180Y}
            width={spazioUtileX}
            height={rigaSoglia70Y - rigaSoglia180Y}
            fill="rgba(52, 199, 89, 0.06)"
          />

          {/* 🛡️ LINEA FISSA ORIZZONTALE SOGLIA ALTA (180 mg/dL) */}
          <line
            x1={margineLaterale}
            y1={rigaSoglia180Y}
            x2={larghezzaGrafico - margineLaterale}
            y2={rigaSoglia180Y}
            stroke={COLORS.error}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={larghezzaGrafico - 15}
            y={rigaSoglia180Y + 4}
            fill={COLORS.error}
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="end"
          >
            180
          </text>

          {/* 🛡️ LINEA FISSA ORIZZONTALE SOGLIA BASSA (70 mg/dL) */}
          <line
            x1={margineLaterale}
            y1={rigaSoglia70Y}
            x2={larghezzaGrafico - margineLaterale}
            y2={rigaSoglia70Y}
            stroke={COLORS.warning}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={larghezzaGrafico - 15}
            y={rigaSoglia70Y + 4}
            fill={COLORS.warning}
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="end"
          >
            70
          </text>

          {/* 📈 TRACCIATO DELLA LINEA CONTINUA DELL'ANDAMENTO GIORNALIERO */}
          {percorsoLineaD !== "" && (
            <path
              d={percorsoLineaD}
              fill="none"
              stroke={COLORS.brandPrimary}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 🔵 PUNTINI INTERATTIVI (Nodi delle misurazioni giornaliere con testo numerico sopra) */}
          {coordinataPunti.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill={p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success}
                stroke="#1C1C1E"
                strokeWidth="1.5"
              />
              {/* Mostra il numero della glicemia sopra ogni nodo solo per i giorni dispari o se sono pochi punti per pulizia */}
              {(coordinataPunti.length < 8 || i % 2 === 0) && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  fill={COLORS.onSurface}
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {p.media}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Etichette delle date posizionate in basso in modo proporzionale */}
        <View style={styles.rigaEtichetteDate}>
          {puntiGrafico.map((p, i) => {
            // Mostra solo la prima, la centrale e l'ultima data per non accavallare i testi
            const mostraData = i === 0 || i === Math.floor(puntiGrafico.length / 2) || i === puntiGrafico.length - 1;
            return (
              <Text key={i} style={[styles.dataTestoLabel, { opacity: mostraData ? 1 : 0 }]}>
                {p.dataLabel.slice(0, 5)}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>
      
      {/* Riquadro di riepilogo rapido del trimestre dei 91 giorni */}
      <View style={styles.riepilogoCard}>
        <Text style={styles.sectionLabel}>Panoramica Trimestrale (91 GG)</Text>
        
        <View style={styles.containerRigaRiepilogo}>
          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Media Glicemica</Text>
            <Text style={[styles.statValue, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : COLORS.success }]}>
              {mediaGlicemia > 0 ? `${mediaGlicemia} mg/dL` : '-'}
            </Text>
          </View>

          <View style={styles.infoBoxStat}>
            <Text style={styles.statLabel}>Test Totali</Text>
            <Text style={styles.statValue}>{totaleMisurazioni}</Text>
          </View>
        </View>
      </View>

      {/* Sezione del grafico interattivo con le due soglie fisse */}
      <View style={styles.cardGraficoContenitore}>
        <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
        <Text style={styles.subLabelSpiegazione}>La fascia evidenziata indica il range ideale (70-180 mg/dL).</Text>
        
        {puntiGrafico.length > 0 ? (
          renderizzaGraficoLineaNativa()
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Ionicons name="analytics-outline" size={32} color={COLORS.muted} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.muted, fontFamily: 'Plus Jakarta Sans', fontSize: 13 }}>Nessun dato disponibile per generare il grafico.</Text>
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
  subLabelSpiegazione: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginBottom: 16 },
  riepilogoCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 },
  containerRigaRiepilogo: { flexDirection: 'row', gap: 12, width: '100%' },
  infoBoxStat: { flex: 1, backgroundColor: '#121212', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'flex-start' },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  statValue: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  
  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'flex-start' },
  containerGraficoSvg: { width: '100%', alignItems: 'center', marginTop: 10, position: 'relative' },
  rigaEtichetteDate: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, marginTop: 10 },
  dataTestoLabel: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '600', color: COLORS.muted }
});
