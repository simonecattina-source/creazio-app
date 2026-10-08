// Local persistence + React Query hooks for measurements.
// All data lives on-device via the shared storage util (AsyncStorage).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { storage } from "@/src/utils/storage";
import { Measurement } from "@/src/types";

const KEY = "glicotrack.measurements.v1";

export const measurementsQueryKey = ["measurements"] as const;

async function readAll(): Promise<Measurement[]> {
  const raw = await storage.getItem<string>(KEY, "[]");
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as Measurement[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: Measurement[]): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(list));
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useMeasurements() {
  return useQuery({
    queryKey: measurementsQueryKey,
    queryFn: readAll,
  });
}

export type NewMeasurement = Omit<Measurement, "id">;

export function useAddMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewMeasurement) => {
      const list = await readAll();
      const record: Measurement = { ...input, id: genId() };
      await writeAll([record, ...list]);
      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: measurementsQueryKey });
    },
  });
}

export function useUpdateMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Measurement) => {
      const list = await readAll();
      await writeAll(list.map((m) => (m.id === record.id ? record : m)));
      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: measurementsQueryKey });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const list = await readAll();
      await writeAll(list.filter((m) => m.id !== id));
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: measurementsQueryKey });
    },
  });
}
