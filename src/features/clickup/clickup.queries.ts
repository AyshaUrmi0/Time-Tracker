"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { clickupService } from "./clickup.service";
import type { ConnectClickUpInput } from "./clickup.schema";

const CLICKUP_STATUS_KEY = ["clickup", "status"] as const;

export function useClickUpStatus() {
  return useQuery({
    queryKey: CLICKUP_STATUS_KEY,
    queryFn: () => clickupService.status(),
  });
}

export function useConnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectClickUpInput) => clickupService.connect(input),
    onSuccess: (status) => {
      qc.setQueryData(CLICKUP_STATUS_KEY, status);
      toast.success("ClickUp connected");
    },
    onError: (err) => toast.error("Couldn't connect ClickUp. Please try again.", err),
  });
}

export function useDisconnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clickupService.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLICKUP_STATUS_KEY });
      toast.success("ClickUp disconnected");
    },
    onError: (err) => toast.error("Couldn't disconnect. Please try again.", err),
  });
}
