import { Link } from "react-router-dom";

function Logo() {
  return (
    <Link to="/" className="logo">
      <img src="/images/logo.png" alt="ScanAndSave logo" className="logo-image" />
    </Link>
  );
}

export default Logo;