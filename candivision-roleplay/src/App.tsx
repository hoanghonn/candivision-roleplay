import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ServerCrash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Account from "./pages/Account";
import { BuilderLayout, BuilderStart, Discover, Personas } from "./pages/Builder";
import Call from "./pages/Call";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Job from "./pages/Job";
import Library from "./pages/Library";
import Programme from "./pages/Programme";
import Report from "./pages/Report";
import Roleplays from "./pages/Roleplays";

/** Everything here needs apps/server, so say so plainly when it isn't running. */
function useServerDown() {
  const { pathname } = useLocation();
  const [down, setDown] = useState(false);
  useEffect(() => {
    let live = true;
    api("/api/health").then(() => live && setDown(false)).catch(() => live && setDown(true));
    return () => { live = false; };
  }, [pathname]);
  return down;
}

export default function App() {
  const down = useServerDown();
  // Re-renders every screen when the language changes.
  const { t } = useTranslation();
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="sheet">
        {down && <p className="banner danger-banner" role="alert"><ServerCrash size={18} aria-hidden="true" /> <span>{t("common.serverDownBefore")} <code>npm run dev:server</code> {t("common.serverDownAfter")}</span></p>}
        <Routes>
          <Route path="/" element={<Navigate to="/start" replace />} />
          <Route path="/start" element={<Home />} />
          <Route path="/programmes" element={<Roleplays />} />
          <Route path="/programmes/:id" element={<Programme />} />
          <Route path="/create" element={<BuilderLayout />}>
            <Route index element={<BuilderStart />} />
            <Route path="browse" element={<Discover />} />
            <Route path="characters" element={<Personas />} />
          </Route>
          <Route path="/create/jobs/:id" element={<Job />} />
          <Route path="/call" element={<Call />} />
          <Route path="/debrief/:id" element={<Report />} />
          <Route path="/team" element={<Dashboard />} />
          <Route path="/calls" element={<Library />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/start" replace />} />
        </Routes>
        </div>
      </main>
    </div>
  );
}
