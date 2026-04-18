import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5051").replace(/\/$/, "");

function m(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function BillDetail() {
  const { id } = useParams();
  const token = localStorage.getItem("access_token");
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch(`${API_BASE}/api/bills/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load bill");
        setBill(data.bill || null);
      } catch (e) {
        setError(e.message || "Failed to load bill");
      }
    }
    if (id && token) run();
  }, [id, token]);

  return (
    <PageLayout>
      <section className="max-w-5xl mx-auto p-6">
        {error ? <p className="text-red-600">{error}</p> : null}
        {!bill ? <p>Loading...</p> : (
          <>
            <div className="rounded-2xl border bg-white p-4">
              <h1 className="text-2xl font-black">{bill.merchant_name}</h1>
              <p className="text-slate-500">{bill.billed_at ? new Date(bill.billed_at).toLocaleString() : "-"}</p>
              <p className="text-slate-500">{bill.location_text || "No location captured"}</p>
              <div className="mt-2 text-sm">
                Subtotal: ${m(bill.subtotal)} | Tax: ${m(bill.tax_amount)} | Total: ${m(bill.total_amount)}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border bg-white overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs uppercase text-slate-500">Product</th>
                    <th className="px-4 py-3 text-xs uppercase text-slate-500">Qty</th>
                    <th className="px-4 py-3 text-xs uppercase text-slate-500">Rate</th>
                    <th className="px-4 py-3 text-xs uppercase text-slate-500">Tax</th>
                    <th className="px-4 py-3 text-xs uppercase text-slate-500">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(bill.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3">{it.normalized_name || it.raw_name}</td>
                      <td className="px-4 py-3">{Number(it.quantity || 1)} {it.unit || "pcs"}</td>
                      <td className="px-4 py-3">${m(it.unit_price)}</td>
                      <td className="px-4 py-3">${m(it.line_tax)}</td>
                      <td className="px-4 py-3">${m(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </PageLayout>
  );
}
