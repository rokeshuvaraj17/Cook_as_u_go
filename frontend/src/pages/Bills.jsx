import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5051").replace(/\/$/, "");

function toMoney(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

function toCsv(rows) {
  const header = ["merchant", "billed_at", "location", "subtotal", "tax", "total", "items"];
  const lines = rows.map((b) =>
    [
      b.merchant_name,
      b.billed_at || "",
      b.location_text || "",
      toMoney(b.subtotal),
      toMoney(b.tax_amount),
      toMoney(b.total_amount),
      b.item_count ?? 0,
    ]
      .map((x) => `"${String(x).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export default function Bills() {
  const token = localStorage.getItem("access_token");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [maxSpend, setMaxSpend] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (store.trim()) p.set("store", store.trim());
    if (fromDate) p.set("fromDate", fromDate);
    if (toDate) p.set("toDate", toDate);
    if (minSpend.trim()) p.set("minSpend", minSpend.trim());
    if (maxSpend.trim()) p.set("maxSpend", maxSpend.trim());
    return p.toString();
  }, [fromDate, maxSpend, minSpend, store, toDate]);

  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/bills${query ? `?${query}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load bills");
        setBills(Array.isArray(data.bills) ? data.bills : []);
      } catch (e) {
        setBills([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) run();
  }, [query, token]);

  function exportReport() {
    const csv = toCsv(bills);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <PageLayout>
      <section className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Bills</h1>
            <p className="text-slate-500 mt-1">Filter by date, merchant, and spending.</p>
          </div>
          <button
            onClick={exportReport}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
          >
            Generate report
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="rounded-lg border px-3 py-2" placeholder="Store name" value={store} onChange={(e) => setStore(e.target.value)} />
          <input className="rounded-lg border px-3 py-2" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="rounded-lg border px-3 py-2" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <input className="rounded-lg border px-3 py-2" placeholder="Min spend" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
          <input className="rounded-lg border px-3 py-2" placeholder="Max spend" value={maxSpend} onChange={(e) => setMaxSpend(e.target.value)} />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs uppercase text-slate-500">Company</th>
                <th className="px-4 py-3 text-xs uppercase text-slate-500">Purchase Date</th>
                <th className="px-4 py-3 text-xs uppercase text-slate-500">Spend</th>
                <th className="px-4 py-3 text-xs uppercase text-slate-500">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-4" colSpan={4}>Loading...</td></tr>
              ) : bills.length ? bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link className="text-blue-700 hover:underline" to={`/bills/${b.id}`}>{b.merchant_name}</Link>
                  </td>
                  <td className="px-4 py-3">{b.billed_at ? new Date(b.billed_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">${toMoney(b.total_amount)}</td>
                  <td className="px-4 py-3">{b.item_count ?? 0}</td>
                </tr>
              )) : (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No bills found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageLayout>
  );
}
