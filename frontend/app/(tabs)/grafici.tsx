import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// 🎨 Palette colori coerente Dark Mode
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

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

  // Carica i dati memorizzati nel trimestre per fare i calcoli preliminari
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
        } else {
          setMediaGlicemia(0);
        }
      }
    } catch (e) {
      console.log("Errore nel caricamento dati.");
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>
      
      {/* Riquadro di riepilogo rapido del trimestre dei 91 giorni */}
      <View style={styles.riepilogoCard}>
        <Text style={styles.sectionLabel}>Panoramica Trimestrale</Text>
        
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

      {/* Spazio vuoto temporaneo pronto ad ospitare i grafici medici */}
      <View style={styles.placeholderGrafico}>
        <Ionicons name="bar-chart-outline" size={44} color={COLORS.muted} style={{ marginBottom: 12 }} />
        <Text style={styles.placeholderText}>Area Grafico Andamento</Text>
        <Text style={styles.placeholderSubText}>Iniziamo a configurare qui dentro i grafici a colonne o a linee per il tuo medico.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 45, paddingBottom: 30 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 12 },
  riepilogoCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 },
  containerRigaRiepilogo: { flexDirection: 'row', gap: 12, width: '100%' },
  infoBoxStat: { flex: 1, backgroundColor: '#121212', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'flex-start' },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  statValue: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  
  placeholderGrafico: { width: '100%', minHeight: 220, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 4 },
  placeholderText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  placeholderSubText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 18 }
});
