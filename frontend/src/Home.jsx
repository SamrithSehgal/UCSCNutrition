import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home__overlay" />

      <header className="home__header">
        <span className="home__logo">SlugEats</span>
      </header>

      <main className="home__main">
        <h1 className="home__title">
          Track every meal,<br />from anywhere.
        </h1>
        <p className="home__sub">
          Put some stupid ass dumb ass subtitle here
        </p>
      </main>

      <footer className="home__footer">
        <button className="home__btn" onClick={() => navigate("/login")}>
          Log in with UCSC
        </button>
        <p className="home__hint">For registered UCSC students only</p>
      </footer>
    </div>
  );
}
