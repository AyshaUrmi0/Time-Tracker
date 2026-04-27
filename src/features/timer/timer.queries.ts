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
      qc.setQueryData<CurrentTimerResponse>(TIMER_CURRENT_KEY, {
        timer: data.timer,
      });
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
    mutationFn: () => timerService.stop(),
    onSuccess: (data) => {
      qc.setQueryData<CurrentTimerResponse>(TIMER_CURRENT_KEY, { timer: null });
      qc.invalidateQueries({ queryKey: TIMER_KEY });
      qc.invalidateQueries({ queryKey: ["tasks", "list"] });
      const minutes = Math.max(1, Math.round(data.timer.durationSeconds / 60));
      const label = minutes === 1 ? "1 min" : `${minutes} min`;
      toast.success(`Stopped "${data.timer.task.title}" — ${label} logged`);
    },
    onError: (err) =>
      toast.error("Couldn't stop the timer. Please try again.", err),
  });
}
