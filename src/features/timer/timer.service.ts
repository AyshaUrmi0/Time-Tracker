import { apiFetch } from "@/lib/api-client";
import type { StartTimerInput } from "./timer.schema";
import type {
  CurrentTimerResponse,
  StartTimerResponse,
  StopTimerResponse,
} from "./types";

export const timerService = {
  getCurrent() {
    return apiFetch<CurrentTimerResponse>("/api/timer/current");
  },

  start(input: StartTimerInput) {
    return apiFetch<StartTimerResponse>("/api/timer/start", {
      method: "POST",
      body: input,
    });
  },

  stop() {
    return apiFetch<StopTimerResponse>("/api/timer/stop", { method: "POST" });
  },
};
