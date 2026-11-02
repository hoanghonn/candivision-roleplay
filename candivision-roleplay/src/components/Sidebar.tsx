import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Blocks, ChevronUp, FileAudio, House, PanelLeft, PanelLeftOpen, PhoneCall, Settings, Theater, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLearnerName } from "../live";
import LanguageSwitch from "./LanguageSwitch";

/** `short` is what fits under the icon in the phone's bottom bar. */
export const LINKS = [
  { to: "/start", label: "nav.home", short: "nav.home", icon: House, group: "nav.practise" },
  { to: "/programmes", label: "nav.roleplays", short: "nav.roleplaysShort", icon: Theater, group: "nav.practise" },
  { to: "/calls", label: "nav.calls", short: "nav.callsShort", icon: FileAudio, group: "nav.practise" },
  { to: "/create", label: "nav.builder", short: "nav.builderShort", icon: Wrench, group: "nav.lead" },
  { to: "/team", label: "nav.team", short: "nav.teamShort", icon: Blocks, group: "nav.lead" },
] as const;

export default function Sidebar() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  // The call room gets the whole screen unless someone has asked for the sidebar back.
  const inCall = pathname === "/call" && search.includes("version=");
  const [choice, setChoice] = useState<boolean | null>(null);
  const collapsed = choice ?? inCall;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const name = useLearnerName();

  useEffect(() => {
    const away = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const go = (to: string) => { setOpen(false); navigate(to); };

  return (
    <aside className={`sidebar on-ink ${collapsed ? "collapsed" : ""}`} ref={ref}>
      <div className="brand">
        {collapsed ? (
          <button className="logo-mark-box" aria-label={t("nav.expand")} title={t("nav.expand")} onClick={() => setChoice(false)}>
            <img src="/brand/logo-mark.svg" alt={t("common.logoAlt")} />
            <PanelLeftOpen size={16} className="brand-open" aria-hidden="true" />
          </button>
        ) : (
          <>
            <NavLink to="/start" className="logo">
              <span className="logo-mark-box"><img src="/brand/logo-mark.svg" alt={t("common.logoAlt")} /></span>
              <img src="/brand/logo-text.svg" className="logo-text" alt="CandiVision" />
            </NavLink>
            <button className="icon-btn" aria-label={t("nav.collapse")} title={t("nav.collapse")} onClick={() => setChoice(true)}><PanelLeft size={18} /></button>
          </>
        )}
      </div>

      <div className="dock">
        <nav className="nav" aria-label={t("nav.main")}>
          {LINKS.map(({ to, label, short, icon: Icon, group }, i) => (
            <div key={to} className="nav-item" data-to={to.slice(1)}>
              {!collapsed && group !== LINKS[i - 1]?.group && <span className="nav-group">{t(group)}</span>}
              <NavLink to={to} className="nav-link" title={t(label)} aria-label={t(label)}>
                <Icon size={20} aria-hidden="true" />
                {!collapsed && <span className="nav-full">{t(label)}</span>}
                <span className="nav-short" aria-hidden="true">{t(short)}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="start-wrap">
          <button className="btn start" aria-label={t("nav.start")} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
            <PhoneCall size={20} aria-hidden="true" />
            {!collapsed && <span>{t("nav.start")}</span>}
            {!collapsed && <ChevronUp size={16} className={`start-chevron ${open ? "open" : ""}`} aria-hidden="true" />}
          </button>
          {open && (
            <div className="popover start-menu" role="menu">
              <button role="menuitem" onClick={() => go("/call")}><PhoneCall size={16} aria-hidden="true" /> {t("common.takeCall")}</button>
              <button role="menuitem" onClick={() => go("/create")}><Wrench size={16} aria-hidden="true" /> {t("common.buildProgramme")}</button>
            </div>
          )}
        </div>
      </div>

      {!collapsed && <LanguageSwitch compact />}

      <NavLink to="/account" className="account-btn" aria-label={t("nav.accountSettings")}>
        <span className="avatar">{(name[0] ?? "?").toUpperCase()}</span>
        {!collapsed && (
          <>
            <span className="account-text">
              <strong className="ellipsis">{name || t("nav.addName")}</strong>
              <span className="muted">{t("nav.privateWorkspace")}</span>
            </span>
            <Settings size={16} className="muted" aria-hidden="true" />
          </>
        )}
      </NavLink>
    </aside>
  );
}
