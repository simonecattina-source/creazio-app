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

          // Estrae gli ultimi 10 giorni con test per mantenere il grafico pulito su mobile
          setPuntiGrafico(andamentoCronologico.slice(-10));
        } else {
          setMediaGlicemia(0);
          setPuntiGrafico([]);
        }
      }
    } catch (e) {
      console.log("Errore nel caricamento dei dati medici.");
    }
  };
  // 🪄 MOTORE GEOMETRICO: Genera i tracciati SVG matematici per la scala 10-500 e l'asse X
  const renderizzaGraficoLineaNativa = () => {
    if (puntiGrafico.length === 0) return null;

    // Dimensioni responsive adatte allo schermo dell'iPhone
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 32;
    const altezzaGrafico = 250;
    
    // Margini interni per fare spazio alla tabella numerica di sinistra (45px) e alle date in basso
    const margineSinistro = 45;
    const margineDestro = 15;
    const margineSuperiore = 20;
    const margineInferiore = 25;

    const spazioUtileX = larghezzaGrafico - margineSinistro - margineDestro;
    const spazioUtileY = altezzaGrafico - margineSuperiore - margineInferiore;

    // 📈 SOGLIE RICHIESTE: Il grafico scala rigorosamente da un minimo di 10 a un massimo di 500 mg/dL
    const GLICEMIA_MIN = 10;
    const GLICEMIA_MAX = 500;
    
    const calcolaY = (valore: number) => {
      const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valore));
      // Calcola la percentuale invertita perché l'asse Y di SVG parte dall'alto verso il basso
      const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
      return margineSuperiore + spazioUtileY - (percentuale * spazioUtileY);
    };

    // Calcola i punti Y esatti per le righe fisse del range ideale (70 e 180)
    const rigaSoglia180Y = calcolaY(180);
    const rigaSoglia70Y = calcolaY(70);

    // Genera i punti della scala a sinistra (10, 100, 200, 300, 400, 500)
    const valoriAsseY =;

    // Mappa le coordinate X,Y di tutte le medie giornaliere inserite
    const coordinataPunti = puntiGrafico.map((punto, i) => {
      const x = margineSinistro + (i * (spazioUtileX / (puntiGrafico.length - 1 || 1)));
      const y = calcolaY(punto.media);
      return { x, y, ...punto };
    });

    // Costruisce la stringa del tracciato d="M..." per la linea continua dell'andamento quotidiano
    let percorsoLineaD = "";
    coordinataPunti.forEach((p, i) => {
      if (i === 0) {
        percorsoLineaD += `M ${p.x} ${p.y}`;
      } else {
        percorsoLineaD += ` L ${p.x} ${p.y}`;
      }
    });
    // Array fisso di valori per generare i numeri e le linee guida dell'asse verticale
    const taccheAsseY =;

    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height={altezzaGrafico} style={{ display: 'block', overflow: 'visible' }}>
          
          {/* ⚪ SFONDO GENERALE DEL GRAFICO CORRETTO IN GRIGIO CHIARO */}
          <rect
            x={margineSinistro}
            y={margineSuperiore}
            width={spazioUtileX}
            height={spazioUtileY}
            fill="#F4F4F6"
            rx="4"
          />

          {/* 🟢 AREA DI RANGE IDEALE (Evidenziata in verde tenue tra 70 e 180 mg/dL) */}
          <rect
            x={margineSinistro}
            y={rigaSoglia180Y}
            width={spazioUtileX}
            height={rigaSoglia70Y - rigaSoglia180Y}
            fill="rgba(52, 199, 89, 0.12)"
          />

          {/* 📊 RIGHE ORIZZONTALI DELLA TABELLA (Da 10 a 500 mg/dL) */}
          {taccheAsseY.map((valore) => {
            const yPos = calcolaY(valore);
            return (
              <g key={valore}>
                {/* Linea sottile di griglia */}
                <line
                  x1={margineSinistro}
                  y1={yPos}
                  x2={larghezzaGrafico - margineDestro}
                  y2={yPos}
                  stroke="#E5E5EA"
                  strokeWidth="1"
                />
                {/* 🔢 NUMERI ASSE VERTICALE A SINISTRA (Allineati a destra del margine) */}
                <text
                  x={margineSinistro - 8}
                  y={yPos + 4}
                  fill="#1C1C1E"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  textAnchor="end"
                >
                  {valore}
                </text>
              </g>
            );
          })}

          {/* 🛡️ LINEA DI CONTROLLO FISSA ORIZZONTALE SOGLIA ALTA (180 mg/dL) */}
          <line
            x1={margineSinistro}
            y1={rigaSoglia180Y}
            x2={larghezzaGrafico - margineDestro}
            y2={rigaSoglia180Y}
            stroke={COLORS.error}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* 🛡️ LINEA DI CONTROLLO FISSA ORIZZONTALE SOGLIA BASSA (70 mg/dL) */}
          <line
            x1={margineSinistro}
            y1={rigaSoglia70Y}
            x2={larghezzaGrafico - margineDestro}
            y2={rigaSoglia70Y}
            stroke={COLORS.warning}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

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

          {/* 🔵 PUNTINI SUI NODI DELLE MISURAZIONI QUOTIDIANE */}
          {coordinataPunti.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill={p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Valore numerico stampato sopra il nodino per massima leggibilità */}
              <text
                x={p.x}
                y={p.y - 10}
                fill="#1C1C1E"
                fontSize="10"
                fontWeight="700"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {p.media}
              </text>
            </g>
          ))}
        </svg>

        {/* ⏰ ASSE ORIZZONTALE IN BASSO: Elenco proporzionale dei giorni calcolati */}
        <View style={[styles.rigaEtichetteDate, { paddingLeft: margineSinistro, paddingRight: margineDestro }]}>
          {puntiGrafico.map((p, i) => (
            <Text key={i} style={styles.dataTestoLabel}>
              {p.dataLabel.slice(0, 5)}
            </Text>
          ))}
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
          <View style={{ paddingVertical: 40, alignItems: 'center', width: '100%' }}>
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
  containerGraficoSvg: { width: '100%', marginTop: 10, position: 'relative' },
  rigaEtichetteDate: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 2 },
  dataTestoLabel: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '600', color: COLORS.muted }
});
