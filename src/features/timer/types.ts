import type { TaskStatus } from "@/features/tasks/types";

export type TimerTaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type TimerUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type RunningTimer = {
  id: string;
  userId: string;
  taskId: string;
  note: string | null;
  startTime: string;
  task: TimerTaskSummary;
  user: TimerUserSummary;
};

export type StoppedTimer = RunningTimer & {
  endTime: string;
  durationSeconds: number;
};

export type StartTimerResponse = {
  timer: RunningTimer;
  stoppedPrevious: StoppedTimer | null;
};

export type StopTimerResponse = {
  timer: StoppedTimer;
};

export type CurrentTimerResponse = {
  timer: RunningTimer | null;
  others: RunningTimer[];
};
