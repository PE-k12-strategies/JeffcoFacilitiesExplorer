import { NavLink, Link } from "react-router-dom";
import { LanguagePicker } from "./LanguagePicker";
import { assetUrl } from "../lib/assetUrl";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="utility-bar">
        <div className="utility-bar-inner">
          <Link to="/" className="brand brand-in-utility notranslate" translate="no">
            <img
              className="brand-logo brand-logo-mark"
              src={assetUrl("logos/jeffco-public-schools-logo-color.png")}
              alt="Jeffco Public Schools"
            />
            <span className="brand-text">
              <span className="brand-title">Facilities Explorer</span>
            </span>
          </Link>
          <span>
            A public tool from{" "}
            <a href="https://www.jeffcopublicschools.org/" rel="noreferrer">
              Jeffco Public Schools
            </a>
            {" · "}Jefferson County, Colorado
          </span>
          <LanguagePicker />
        </div>
      </div>
      <div className="header-row">
        <Link to="/" className="brand notranslate" translate="no">
          <img
            className="brand-logo brand-logo-wide"
            src={assetUrl("logos/JeffCoLogo.webp")}
            alt="Jeffco Public Schools"
          />
          <img
            className="brand-logo brand-logo-mark"
            src={assetUrl("logos/jeffco-public-schools-logo-color.png")}
            alt="Jeffco Public Schools"
          />
          <span className="brand-text">
            <span className="brand-title">Facilities Explorer</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          <NavLink to="/" end>
            Welcome
          </NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/schools">Schools</NavLink>
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end>
        Welcome
      </NavLink>
      <NavLink to="/map">Map</NavLink>
      <NavLink to="/schools">Schools</NavLink>
    </nav>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-copy">
          <img
            className="footer-logo"
            src={assetUrl("logos/jeffco-public-schools-logo-color.png")}
            alt="Jeffco Public Schools"
          />
          <p>
            Jeffco Facilities Explorer is a public-facing view of planning data for
            school buildings in Jefferson County. Figures are a planning snapshot
            and may be revised as assessments are updated.
          </p>
          <p>
            <a href="https://www.jeffcopublicschools.org/" rel="noreferrer">
              Jeffco Public Schools
            </a>
            {" · "}
            1829 Denver West Drive #27, Golden, CO 80401 · 303-982-6500
          </p>
        </div>
        <div className="footer-developed">
          <p className="footer-developed-label">Developed by</p>
          <a
            href="https://www.perkinseastman.com/"
            rel="noreferrer"
            className="footer-pe-link"
          >
            <img
              className="footer-pe-logo"
              src={assetUrl("logos/FWL - PE_Wordmark_01_White_RGB_mr.png")}
              alt="Perkins Eastman"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
