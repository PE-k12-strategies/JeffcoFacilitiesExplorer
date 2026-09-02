import { Route, Routes, useLocation } from "react-router-dom";
import { AppFooter, AppHeader, BottomNav } from "./components/Chrome";
import { PasswordGate } from "./components/PasswordGate";
import { DataProvider } from "./data/DataProvider";
import { LandingPage } from "./views/LandingPage";
import { MapPage } from "./views/MapPage";
import { SchoolsPage } from "./views/SchoolPage";

export default function App() {
  const location = useLocation();
  const isMap = location.pathname.startsWith("/map");

  return (
    <PasswordGate>
    <DataProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className={isMap ? "app-shell map-shell" : "app-shell"}>
        <AppHeader />
        <main id="main" className={isMap ? "main map-mode" : "main"}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/schools" element={<SchoolsPage />} />
            <Route path="/schools/:id" element={<SchoolsPage />} />
          </Routes>
        </main>
        {isMap ? null : <AppFooter />}
        <BottomNav />
      </div>
    </DataProvider>
    </PasswordGate>
  );
}
