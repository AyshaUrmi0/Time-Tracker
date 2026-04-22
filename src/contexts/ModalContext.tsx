"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ModalContextType = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    opts: ConfirmOptions;
  }>({ open: false, opts: { title: "" } });
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setBusy(false);
    setConfirmState((s) => ({ ...s, open: false }));
    resolve?.(result);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({ open: true, opts });
    });
  }, []);

  const api = useMemo<ModalContextType>(() => ({ confirm }), [confirm]);

  const opts = confirmState.opts;

  return (
    <ModalContext.Provider value={api}>
      {children}
      <Dialog
        open={confirmState.open}
        onClose={() => !busy && settle(false)}
        title={opts.title}
        description={opts.description}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => settle(false)}
              disabled={busy}
            >
              {opts.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              size="sm"
              variant={opts.destructive ? "danger" : "primary"}
              onClick={() => {
                setBusy(true);
                settle(true);
              }}
              loading={busy}
            >
              {opts.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      />
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextType {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside <ModalProvider>");
  return ctx;
}
