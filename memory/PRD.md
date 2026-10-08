# GlicoTrack — Diario Glicemia & Insulina

## Problem Statement (original)
App mobile iOS single-user (nessun login/registrazione/credenziali), uso personale, ottimizzata per iPhone, per il tracciamento giornaliero di glicemia (mg/dL) e insulina. Dati salvati in locale sul dispositivo. Esportazione PDF orizzontale con tabella a 10 colonne e intestazioni nidificate. Tecnologie: Expo, React Native, TypeScript, expo-print, expo-sharing.

## User Choices
- Aspetto: pulito e medicale (bianco/blu)
- Colori per valori glicemici fuori range (standard: <70 basso, >180 alto)
- Apertura diretta sul modulo di inserimento rapido
- Solo iOS

## Architecture
- **Frontend only** (Expo Router, React Native, TypeScript). Nessun backend: tutti i dati sono locali.
- **Storage locale**: AsyncStorage via `@/src/utils/storage`, chiave `glicotrack.measurements.v1`, hook React Query (`src/measurements.ts`).
- **Navigazione**: Bottom Tabs — `Inserisci` (home) e `Storico`. NativeTabs su iOS 26+, classic Tabs altrove (`src/navigation.ts`).
- **Tema**: light + dark (`src/theme.ts`, token da `design_guidelines.json`). Font Space Grotesk (numeri) + Plus Jakarta Sans (testo).
- **PDF**: `src/pdf.ts` genera HTML landscape (10 colonne, header a doppio livello, date GG/MM, celle dinamiche 1-3 righe) con `expo-print`, condivisione via `expo-sharing` (Apple Share Sheet).

## User Persona
Persona singola con diabete che registra glicemia/insulina ai vari momenti del giorno e condivide il diario PDF con il medico via File/WhatsApp/Mail.

## Core Requirements (static)
- Inserimento: data, ora, glicemia (mg/dL), insulina (UI, opzionale), momento (9), nota (opzionale)
- 9 momenti: Prima/Dopo Colazione, Prima/Dopo Pranzo, Prima/Dopo Merenda, Prima/Dopo Cena, Notte
- Storico raggruppato per giorno, con colore stato glicemia
- Esporta PDF landscape con tabella nidificata a 10 colonne

## Implemented (2026-06)
- [x] Schermata Inserimento con form rapido, glicemia a colore dinamico, 9 chip momenti, picker data/ora nativi (iOS inline compact)
- [x] Validazione + salvataggio locale + toast + reset form + haptics
- [x] Schermata Storico (SectionList per giorno, timeline con dot colorati, insulina, note, orario)
- [x] Eliminazione con modale di conferma + empty state
- [x] Esporta PDF landscape 10 colonne nested header, celle adattive (1/2/3 righe), date GG/MM, via Apple Share Sheet
- [x] Dark mode automatica
- [x] Testing agent: 13/13 flussi superati

## Backlog (prioritized)
- P1: Modifica di una misurazione esistente (tap per editare)
- P1: Statistiche/medie glicemiche e grafico andamento
- P2: Filtro Storico per periodo / per momento
- P2: Promemoria orari di misurazione (richiede build nativa)
- P2: Backup/condivisione dati (export/import JSON)

## Next Tasks
- In attesa di feedback utente.
