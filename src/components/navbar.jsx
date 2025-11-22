import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import "./styles/navbar.css";
import { Context } from "./context";

const Navbar = () => {
  const { role, logout } = useContext(Context)

  const [isOpen, setIsOpen] = useState(false);
  const [isCoursOpen, setIsCoursOpen] = useState(false);
  const [isTdOpen, setIsTdOpen] = useState(false);
  const location = useLocation();

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleNavigate = () => {
    setIsOpen(false);
    setIsCoursOpen(false);
    setIsTdOpen(false);
  };

  React.useEffect(() => {
    setIsOpen(false);
    setIsCoursOpen(false);
    setIsTdOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-link" onClick={handleNavigate}>
            <div className="navbar-brand">
              <img src="NewLogo.png" alt="" />
              <h2 style={{cursor: "pointer"}}>Ouafa Barakat</h2>
            </div></Link>

          <button
            className={`navbar-toggle${isOpen ? " is-open" : ""}`}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            aria-controls="primary-navigation"
            onClick={handleToggle}
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>

          <ul
            id="primary-navigation"
            className={`navbar-menu${isOpen ? " is-open" : ""}`}
          >
            <li className="navbar-item">
              <Link to="/" className="navbar-link" onClick={handleNavigate}>
                Accueil
              </Link>
            </li>

            <li
              className={`navbar-item dropdown${isCoursOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="navbar-link dropdown-toggle"
                aria-haspopup="true"
                aria-expanded={isCoursOpen}
                onClick={() => setIsCoursOpen((prev) => !prev)}
              >
                Cours ▾
              </button>
              <ul className="dropdown-menu" role="menu">
                <li>
                  <Link to="/cours/3eme" className="navbar-link" onClick={handleNavigate}>
                    3ème année ENCG
                  </Link>
                </li>
                <li>
                  <Link to="/cours/4eme" className="navbar-link" onClick={handleNavigate}>
                    4ème année ENCG
                  </Link>
                </li>
                <li>
                  <Link to="/cours/5eme" className="navbar-link" onClick={handleNavigate}>
                    5ème année ENCG
                  </Link>
                </li>
              </ul>
            </li>

            <li className={`navbar-item dropdown${isTdOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className="navbar-link dropdown-toggle"
                aria-haspopup="true"
                aria-expanded={isTdOpen}
                onClick={() => setIsTdOpen((prev) => !prev)}
              >
                TD ▾
              </button>
              <ul className="dropdown-menu" role="menu">
                <li>
                  <Link to="/td/3eme" className="navbar-link" onClick={handleNavigate}>
                    3ème année ENCG
                  </Link>
                </li>
                <li>
                  <Link to="/td/4eme" className="navbar-link" onClick={handleNavigate}>
                    4ème année ENCG
                  </Link>
                </li>
                <li>
                  <Link to="/td/5eme" className="navbar-link" onClick={handleNavigate}>
                    5ème année ENCG
                  </Link>
                </li>
              </ul>
            </li>

            <li className="navbar-item">
              <Link
                to="/seminaires"
                className="navbar-link"
                onClick={handleNavigate}
              >
                Séminaires & Conférences
              </Link>
            </li>

            <li className="navbar-item">
              <Link
                to="/a-propos"
                className="navbar-link"
                onClick={handleNavigate}
              >
                À propos
              </Link>
            </li>
            {role === 'admin' && (
              <li className="navbar-item">
                <Link
                  to="/dashboard"
                  className="navbar-link"
                  onClick={handleNavigate}
                >
                  Dashboard
                </Link>
              </li>
            )}
            {role ?
              <li className="navbar-item">
                <button
                  type="button"
                  className="navbar-link navbar-logout-btn"
                  onClick={() => {
                    logout();
                    handleNavigate();
                  }}
                >
                  Déconnecter
                </button>
              </li>
              : (<li className="navbar-item">
                <Link
                  to="/login"
                  className="navbar-link"
                  onClick={handleNavigate}
                >
                  Se connecter
                </Link>
              </li>)}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Navbar;