import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { Scene, type SceneName } from "./Art";

/** A loading placeholder shaped like the programme cards, so the page doesn't jump when they arrive. */
export function LoadingCards({ count = 3, label }: { count?: number; label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rp-grid" role="status">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-band"><i className="sk sk-round" /><i className="sk sk-line" /></div>
          <div className="skeleton-body"><i className="sk sk-title" /><i className="sk sk-line" /><i className="sk sk-btn" /></div>
        </div>
      ))}
    </div>
  );
}

export function LoadingLines({ count = 4, label }: { count?: number; label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="skeleton-lines" role="status">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: count }, (_, i) => <i key={i} className="sk sk-row" aria-hidden="true" />)}
    </div>
  );
}

/** Empty and error states: say what happened and offer the way forward. */
export function StatePanel({ art, icon: Icon, title, tone = "empty", onInk, children, action }: { art?: SceneName; icon?: LucideIcon; title?: string; tone?: "empty" | "error" | "warn"; onInk?: boolean; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`state-panel ${tone}${tone === "error" ? " error" : ""}${onInk ? " ink" : ""}${art ? " with-art" : ""}`} role={tone === "error" ? "alert" : undefined}>
      {art && <Scene name={art} className="state-art" />}
      {!art && Icon && <span className="state-icon" aria-hidden="true"><Icon size={22} /></span>}
      <div className="state-text">
        {title && <h3>{title}</h3>}
        {children && <div>{children}</div>}
        {action && <div className="state-action">{action}</div>}
      </div>
    </div>
  );
}
