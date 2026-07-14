import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface SlaTimerProps {
  dueAt: string;
  isResolvedOrClosed: boolean;
}

export function SlaTimer({ dueAt, isResolvedOrClosed }: SlaTimerProps) {
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [alertLevel, setAlertLevel] = useState<"normal" | "warning" | "danger" | "breached" | "cleared">("normal");

  useEffect(() => {
    if (isResolvedOrClosed) {
      setTimeLeftStr("Cleared");
      setAlertLevel("cleared");
      return;
    }

    const calculateTime = () => {
      const diffMs = new Date(dueAt).getTime() - Date.now();

      if (diffMs <= 0) {
        const overMs = Math.abs(diffMs);
        const overHours = Math.floor(overMs / 3600000);
        const overMins = Math.floor((overMs % 3600000) / 60000);
        setTimeLeftStr(`-${overHours}h ${overMins}m overdue`);
        setAlertLevel("breached");
        return;
      }

      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const seconds = Math.floor((diffMs % 60000) / 1000);

      let str = "";
      if (hours > 0) str += `${hours}h `;
      str += `${minutes}m `;
      if (hours === 0) str += `${seconds}s`;
      setTimeLeftStr(str.trim());

      // Fixed thresholds: < 30 min = danger, < 2 hours = warning
      const totalHoursRemaining = diffMs / 3600000;
      if (totalHoursRemaining < 0.5) {
        setAlertLevel("danger");
      } else if (totalHoursRemaining < 2) {
        setAlertLevel("warning");
      } else {
        setAlertLevel("normal");
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [dueAt, isResolvedOrClosed]);

  const config = {
    breached: {
      className: "text-rose-400 font-bold animate-pulse bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md",
      icon: <AlertTriangle size={10} />,
    },
    danger: {
      className: "text-rose-400 font-bold animate-pulse-subtle bg-rose-500/5 px-2 py-0.5 rounded-md",
      icon: <AlertTriangle size={10} />,
    },
    warning: {
      className: "text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded-md",
      icon: <Clock size={10} />,
    },
    normal: {
      className: "text-slate-500 dark:text-slate-400 font-semibold",
      icon: <Clock size={10} />,
    },
    cleared: {
      className: "text-emerald-500 font-semibold",
      icon: <CheckCircle size={10} />,
    },
  };

  const { className, icon } = config[alertLevel];

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${className}`}>
      {icon} {timeLeftStr}
    </span>
  );
}
