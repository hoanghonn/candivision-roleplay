import { Link } from "react-router-dom";
import { BookOpenCheck, PhoneIncoming, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { callUrl, type ProgrammeCard } from "../live";
import { hueStyle, Portrait } from "./Art";
import { HeatLadder } from "./Signals";

const CASES = ["outage_call", "sales_onboarding", "customer_service", "partner_certification", "manager_conversations", "regulated_messaging", "generic"] as const;
/** A case id from the server, as one we have a label for. */
export const caseKey = (id: string | null): (typeof CASES)[number] => CASES.find((c) => c === id) ?? "generic";

export function Footer() {
  const { t } = useTranslation();
  return <footer className="foot"><Shield size={14} aria-hidden="true" /> {t("common.footer")}</footer>;
}

/** A programme as an incoming call: who is on the line and the first thing they say. */
export function ProgrammeTile({ programme: p }: { programme: ProgrammeCard }) {
  const { t } = useTranslation();
  const opening = p.levels[0]?.opening;
  const language = p.language === "en" || p.language === "vi" || p.language === "ja" ? p.language : null;
  return (
    <article className="rp-card" style={p.persona ? hueStyle(p.persona.name) : undefined}>
      <div className="rp-caller on-ink">
        {p.persona ? (
          <div className="rp-who">
            <Portrait programmeId={p.id} name={p.persona.name} voice={p.persona.voice} className="rp-art" />
            <p className="persona-row"><strong>{p.persona.name}</strong><span>{p.persona.role}</span></p>
            <span className="rp-ring" aria-hidden="true"><PhoneIncoming size={16} /></span>
          </div>
        ) : (
          <p className="rp-building"><i className="sk sk-round" aria-hidden="true" /> {t("card.written")}</p>
        )}
        {opening && <blockquote className="rp-opening" lang={p.language ?? undefined}>{opening}</blockquote>}
      </div>
      <div className="rp-body">
        <header className="tag-row">
          <span className="kind-badge">{t(`case.${caseKey(p.caseId)}`)}</span>
          {language && <span className="tag">{t(`language.${language}`)}</span>}
          {!p.readyBuilt && <span className="tag">{t(p.status === "published" ? "status.published" : p.ready ? "status.draft" : "status.building")}</span>}
        </header>
        <h3 lang={p.language ?? undefined}>{p.title}</h3>
        {(p.levels.length > 0 || p.sourceCount > 0) && (
          <div className="rp-facts">
            <HeatLadder levels={p.levels} />
            {p.sourceCount > 0 && <span className="rp-sources"><BookOpenCheck size={14} aria-hidden="true" /> {t("card.builtOn", { count: p.sourceCount })}</span>}
          </div>
        )}
        <div className="grow" />
        <div className="card-actions">
          {p.latestVersionId && <Link className="btn primary" aria-label={t("common.startCallFor", { title: p.title })} to={callUrl(p.latestVersionId, p.levels[0]?.id ?? "L1")}>{t("common.startCall")}</Link>}
          <Link className="btn outline" aria-label={t("common.seeResearchFor", { title: p.title })} to={`/programmes/${encodeURIComponent(p.id)}`}>{t("common.seeResearch")}</Link>
        </div>
      </div>
    </article>
  );
}
