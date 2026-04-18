import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";

const API_BASE = "http://127.0.0.1:8000";

function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadPreview, setUploadPreview] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/receipts/process-receipt/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Receipt processing failed");
      }

      const receipt = await res.json();
      const detailRes = await fetch(`${API_BASE}/receipts/${receipt.receipt_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detail = detailRes.ok ? await detailRes.json() : null;
      setUploadPreview({
        receiptId: receipt.receipt_id,
        store: detail?.store || receipt.store || "Scanned receipt",
        items: Array.isArray(detail?.items) ? detail.items : [],
      });
    } catch (err) {
      setError("Could not process receipt. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <PageLayout>
      <section className="hero">
        <h1>Track groceries. Save money. Reduce waste.</h1>
        <p>
          Upload a receipt and instantly see your spending breakdown and updated
          inventory.
        </p>

        <label className="upload-cta">
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={isUploading}
            onChange={handleFileChange}
          />
          {isUploading ? "Processing..." : "Upload A Receipt"}
        </label>
        <div className="mt-3">
          <button
            onClick={() => navigate("/bills")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
          >
            View Bills
          </button>
        </div>

        {error ? <p className="text-red-600 mt-3">{error}</p> : null}
      </section>

      <section className="how">
        <h2>How it works</h2>

        <div className="how-grid">
          <article className="how-card">
            <img src="/images/step-upload.png" alt="Upload receipt" />
            <h3>1. Upload your receipt</h3>
            <p>Take a photo or upload an image.</p>
          </article>

          <article className="how-card">
            <img src="/images/step-insights.png" alt="AI insights" />
            <h3>2. Review AI insights</h3>
            <p>See categorized spending + expiration estimates.</p>
          </article>

          <article className="how-card">
            <img src="/images/step-inventory.png" alt="Manage inventory" />
            <h3>3. Manage your inventory</h3>
            <p>Track what you have and avoid waste.</p>
          </article>
        </div>
      </section>

      {uploadPreview ? (
        <div className="fixed inset-0 bg-slate-900/45 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Scanned Items</h2>
                <p className="text-slate-600 mt-1">{uploadPreview.store}</p>
              </div>
              <button
                onClick={() => setUploadPreview(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-100">
              {(uploadPreview.items || []).length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uploadPreview.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-slate-800">
                          {item.normalized_name || item.raw_name || "Item"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{Number(item.quantity || 1)}</td>
                        <td className="px-4 py-3 text-slate-600">${Number(item.price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-4 text-slate-600">No items detected for this receipt.</p>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => navigate(`/past-uploads/${uploadPreview.receiptId}?fromUpload=1`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Review full receipt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}

export default Home;