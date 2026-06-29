import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const STARTING_SOON_MS = 60 * 60 * 1000; // 60 minutes
const TICK_MS = 30_000;

export type WorkshopStatus = {
  label: string;
  tone: "accent" | "primary";
} | null;

export function useWorkshopStatus(
  startTime: string,
  durationMinutes: number,
): WorkshopStatus {
  const { t } = useTranslation();

  const compute = (): WorkshopStatus => {
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const end = start + durationMinutes * 60 * 1000;
    const msToStart = start - now;

    if (now >= start && now < end) {
      return { label: t("workshop.status_ongoing"), tone: "accent" };
    }
    if (msToStart > 0 && msToStart <= STARTING_SOON_MS) {
      const minutes = Math.ceil(msToStart / 60_000);
      return {
        label: t("workshop.status_starting_in", { minutes }),
        tone: "primary",
      };
    }
    return null;
  };

  const [status, setStatus] = useState<WorkshopStatus>(compute);

  useEffect(() => {
    setStatus(compute());
    const timer = setInterval(() => setStatus(compute()), TICK_MS);
    return () => clearInterval(timer);
  }, [startTime, durationMinutes, t]);

  return status;
}
