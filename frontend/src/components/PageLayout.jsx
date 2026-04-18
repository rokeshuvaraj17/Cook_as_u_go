import Logo from "./Logo";
import Navigation from "./Navigation";
import Footer from "./Footer";

function PageLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
      </header>

      <div className="page">
        <aside className="left">
          <Navigation />
        </aside>
        <main className="content">{children}</main>
      </div>

      <Footer />
    </div>
  );
}

export default PageLayout;