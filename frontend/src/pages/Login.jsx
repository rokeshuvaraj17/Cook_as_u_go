import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5051").replace(/\/$/, "");

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Invalid email or password");
      }

      if (!data?.token) {
        throw new Error("Invalid login response from server");
      }

      // Keep compatibility with existing web pages expecting `access_token`.
      localStorage.setItem("access_token", data.token);
      localStorage.setItem("token", data.token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Login</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ marginTop: "10px" }}>
            New here? <Link to="/register">Create an account</Link>
            </p>

        {error ? <p className="login-error">{error}</p> : null}
      </section>
    </main>
  );
}

export default Login;