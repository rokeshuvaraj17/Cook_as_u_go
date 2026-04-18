import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

function Navigation() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  return (
    <nav className="nav" aria-label="Main">
      <button className="hamburger" onClick={() => setOpen((v) => !v)}>
        ☰
      </button>

      {open && (
        <div className="nav-menu">
          <NavLink to="/" className="nav-link">Home</NavLink>
          <NavLink to="/bills" className="nav-link">View Bills</NavLink>
          <NavLink to="/past-uploads" className="nav-link">Past Uploads</NavLink>
          <NavLink to="/inventory" className="nav-link">Inventory</NavLink>
          <button className="nav-link nav-logout" onClick={logout}>Logout</button>
        </div>
      )}
    </nav>
  );
}

export default Navigation;