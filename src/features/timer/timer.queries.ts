"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { timerService } from "./timer.service";
import type { StartTimerInput } from "./timer.schema";
import type { CurrentTimerResponse } from "./types";

const TIMER_KEY = ["timer"] as const;
const TIMER_CURRENT_KEY = ["timer", "current"] as const;

export function useCurrentTimer() {
  return useQuery({
    queryKey: TIMER_CURRENT_KEY,
    queryFn: () => timerService.getCurrent(),
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
    staleTime: 0,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartTimerInput) => timerService.start(input),
    onSuccess: (data) => {
      qc.setQueryData<CurrentTimerResponse>(TIMER_CURRENT_KEY, (prev) => ({
        timer: data.timer,
        others: prev?.others ?? [],
      }));
      qc.invalidateQueries({ queryKey: TIMER_KEY });
      qc.invalidateQueries({ queryKey: ["tasks", "list"] });
      if (data.stoppedPrevious) {
        toast.success(
          `Stopped "${data.stoppedPrevious.task.title}". Tracking "${data.timer.task.title}".`,
        );
      } else {
        toast.success(`Tracking "${data.timer.task.title}"`);
      }
    },
    onError: (err) =>
      toast.error("Couldn't start the timer. Please try again.", err),
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId?: string) => timerService.stop(entryId),
    onMutate: (entryId) => {
      const prev = qc.getQueryData<CurrentTimerResponse>(TIMER_CURRENT_KEY);
      const stoppingOwn = !entryId || entryId === prev?.timer?.id;
      return { stoppingOwn };
    },
    onSuccess: (data, entryId, context) => {
      qc.setQueryData<CurrentTimerResponse>(TIMER_CURRENT_KEY, (prev) => {
        if (!prev) return { timer: null, others: [] };
        if (entryId && entryId !== prev.timer?.id) {
          return {
            timer: prev.timer,
            others: prev.others.filter((t) => t.id !== entryId),
          };
        }
        return { timer: null, others: prev.others };
      });
      qc.invalidateQueries({ queryKey: TIMER_KEY });
      qc.invalidateQueries({ queryKey: ["tasks", "list"] });
      const minutes = Math.max(1, Math.round(data.timer.durationSeconds / 60));
      const label = minutes === 1 ? "1 min" : `${minutes} min`;
      if (context?.stoppingOwn) {
        toast.success(`Stopped "${data.timer.task.title}" — ${label} logged`);
      } else {
        toast.success(
          `Stopped ${data.timer.user.name}'s timer on "${data.timer.task.title}" — ${label}`,
        );
      }
    },
    onError: (err) =>
      toast.error("Couldn't stop the timer. Please try again.", err),
  });
}
