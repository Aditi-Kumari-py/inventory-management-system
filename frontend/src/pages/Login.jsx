import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "admin",
    password: "admin123",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);

      localStorage.setItem(
        "inventory_token",
        response.data.token
      );

      localStorage.setItem(
        "inventory_user",
        JSON.stringify(response.data.user)
      );

      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to login"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-violet-100 via-white to-amber-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-violet-100 p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl font-bold">
            FIFO
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Inventory Login
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to view inventory and transactions
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Username
            </label>

            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Default credentials: admin / admin123
        </p>
      </div>
    </div>
  );
}
