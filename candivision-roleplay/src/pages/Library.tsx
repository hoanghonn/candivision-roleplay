import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, PhoneCall, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandRule, Scene } from "../components/Art";
import { Footer } from "../components/Cards";
import { StatePanel } from "../components/States";
import { dateLocale } from "../i18n";
import { CALL_TONE, clock, useCalls } from "../live";

const ALL = "__all";

export default function Library() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { calls, error } = useCalls();
  const [type, setType] = useState<"all" | "full" | "drill">("all");
  const [programme, setProgramme] = useState(ALL);
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const filtered = (calls ?? []).filter(
      (c) =>
        (type === "all" || type === c.mode) &&
        (programme === ALL || c.title === programme) &&
        c.title.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => (newestFirst ? b.created - a.created : a.created - b.created));
  }, [calls, type, programme, query, newestFirst]);

  const lastPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
  const current = Math.min(page, lastPage);
  const visible = rows.slice(current * rowsPerPage, (current + 1) * rowsPerPage);
  const titles = [...new Set((calls ?? []).map((c) => c.title))];

  return (
    <div className="page calls">
      <header className="paper-head page-head tabbed">
        <div>
          <p className="eyebrow">{t("library.eyebrow")}</p>
          <h1>{t("nav.calls")}</h1>
          <BrandRule />
        </div>
        <button className="btn primary big" onClick={() => navigate("/call")}><PhoneCall size={18} aria-hidden="true" /> {t("common.takeCall")}</button>
      </header>
      <div className="content">
        {error && <StatePanel art="error-state" tone="error" title={t("common.callsFailedText")}><p>{error}</p></StatePanel>}
        <div className="filters">
          <label>{t("library.programme")}
            <select value={programme} onChange={(e) => setProgramme(e.target.value)}>
              <option value={ALL}>{t("library.all")}</option>
              {titles.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label>{t("library.type")}
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {(["all", "full", "drill"] as const).map((o) => <option key={o} value={o}>{t(`library.${o}`)}</option>)}
            </select>
          </label>
          <label className="search table-search">
            <Search size={16} aria-hidden="true" />
            <input placeholder={t("library.search")} aria-label={t("library.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        <div className="table-wrap">
          <table className="rec-table calls-table">
            <thead>
              <tr>
                <th>{t("library.call")}</th>
                <th><button onClick={() => setNewestFirst(!newestFirst)}>{t("library.date")} <ArrowUpDown size={12} aria-hidden="true" /></button></th>
                <th>{t("common.level")}</th>
                <th>{t("library.type")}</th>
                <th>{t("library.length")}</th>
                <th>{t("library.result")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="cell-title"><button className="rec-link" lang={c.language} onClick={() => navigate(`/debrief/${encodeURIComponent(c.id)}`)}>{c.title}</button></td>
                  <td data-label={t("library.date")}>{new Date(c.created).toLocaleDateString(dateLocale(), { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td data-label={t("common.level")}>{c.level}</td>
                  <td data-label={t("library.type")}><span className={`type-pill ${c.mode}`}>{t(c.mode === "drill" ? "library.drill" : "library.full")}</span></td>
                  <td data-label={t("library.length")}>{clock(c.durationMs)}</td>
                  <td data-label={t("library.result")}><span className={`score ${CALL_TONE[c.status]}`}>{t(`callStatus.${c.status}`)}</span></td>
                </tr>
              ))}
              {calls && visible.length === 0 && (
                <tr className="row-empty"><td colSpan={6} className="table-empty">
                  <Scene name={calls.length === 0 ? "empty-calls" : "empty-search"} className="table-art" />
                  <p>{t(calls.length === 0 ? "library.none" : "library.noMatch")}</p>
                </td></tr>
              )}
              {calls === null && !error && <tr className="row-empty"><td colSpan={6} className="table-empty"><span role="status">{t("common.loading")}</span><i className="sk sk-row" aria-hidden="true" /><i className="sk sk-row" aria-hidden="true" /></td></tr>}
            </tbody>
          </table>
          <div className="table-foot">
            <label>{t("library.rows")}
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
                {[10, 20, 50].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <span className="pager">
              {rows.length === 0 ? t("library.zero") : t("library.range", { from: current * rowsPerPage + 1, to: Math.min(rows.length, (current + 1) * rowsPerPage), total: rows.length })}
              <button className="icon-btn" aria-label={t("library.prev")} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></button>
              <button className="icon-btn" aria-label={t("library.next")} disabled={current === lastPage} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></button>
            </span>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
