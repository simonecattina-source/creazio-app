import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 🎨 PALETTE COORDINATA ALLA SCHEDA GRAFICI PREMIUM
const COLORS = {
  backgroundBar: "#0A0A0C",      // Nero Oled profondo per la barra
  activeNeon: "#00E5FF",         // Azzurro Cyan elettrico per il tasto attivo
  inactiveTech: "#636366",       // Grigio scuro per i tasti non selezionati
  borderGlass: "rgba(255, 255, 255, 0.08)" // Finissimo contorno superiore lucido
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.activeNeon,
        tabBarInactiveTintColor: COLORS.inactiveTech,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundBar,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderGlass,
          // 🍏 ALTEZZA STANDARDIZZATA PER IPHONE CON TACCA INFERIORE NATIVA
          height: Platform.OS === 'ios' ? 92 : 64,
          paddingBottom: Platform.OS === 'ios' ? 32 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        }
      }}
    >
      {/* PULSANTE 1: INSERISCI / HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inserisci',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "add-circle" : "add-circle-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* PULSANTE 2: GRAFICI / ANALISI */}
      <Tabs.Screen
        name="grafici"
        options={{
          title: 'Grafici',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      {/* PULSANTE 3: STORICO / REGISTRO */}
      <Tabs.Screen
        name="storico"
        options={{
          title: 'Storico',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "document-text" : "document-text-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

    </Tabs>
  );
}
