import PageLayout from "../components/PageLayout";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000";

function ReceiptDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [inventoryMessageType, setInventoryMessageType] = useState("info");

  const token = localStorage.getItem("access_token");
  const fromUpload = searchParams.get("fromUpload") === "1";

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const fetchReceipt = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/receipts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch receipt details");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load receipt");
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      const response = await fetch(`${API_BASE}/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setData((prev) => ({
        ...prev,
        items: (prev?.items || []).filter((item) => item.id !== itemId),
      }));
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const formProps = Object.fromEntries(formData);

    const basePayload = {
      normalized_name: formProps.normalized_name || null,
      category: formProps.category || null,
      price: parseFloat(formProps.price),
      quantity: parseFloat(formProps.quantity || 1),
      estimated_expiration_date: formProps.estimated_expiration_date || null,
    };

    const payload = editingItem
      ? basePayload
      : {
          ...basePayload,
          raw_name: formProps.normalized_name,
          receipt_id: parseInt(id, 10),
        };

    const url = editingItem
      ? `${API_BASE}/items/${editingItem.id}`
      : `${API_BASE}/items`;

    const method = editingItem ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorDetail = await response.json().catch(() => null);
        console.error("Validation error details:", errorDetail);
        throw new Error("Save failed");
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await fetchReceipt();
    } catch (err) {
      alert("Error saving item. Check console for details.");
    }
  };

  const handleSaveToInventory = async () => {
    try {
      setIsSavingInventory(true);
      setInventoryMessage("");

      const response = await fetch(`${API_BASE}/receipts/${id}/save-to-inventory`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Failed to save receipt items to inventory");
      }

      const result = await response.json();
      const created = result.inventory_items_created ?? 0;
      const skipped = result.inventory_items_skipped ?? 0;

      setInventoryMessageType("success");
      setInventoryMessage(
        skipped > 0
          ? `Saved ${created} item(s) to inventory, skipped ${skipped} already-saved item(s).`
          : `Saved ${created} item(s) to inventory.`
      );
    } catch (err) {
      setInventoryMessageType("error");
      setInventoryMessage(err.message || "Could not save to inventory.");
    } finally {
      setIsSavingInventory(false);
    }
  };

  useEffect(() => {
    if (id) fetchReceipt();
  }, [id]);

  const currentTotal = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.items) return [];

    const categories = data.items.reduce((acc, item) => {
      const cat = item.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + Number(item.price || 0) * Number(item.quantity || 1);
      return acc;
    }, {});

    return Object.keys(categories).map((key) => ({
      name: key,
      value: parseFloat(categories[key].toFixed(2)),
    }));
  }, [data]);

  const getExpirationStatus = (dateString) => {
    if (!dateString) return { label: "No Date", color: "text-slate-400 bg-slate-50" };

    const itemDate = new Date(`${String(dateString).split("T")[0]}T00:00:00`);
    const now = new Date();
    const diffDays = Math.ceil((itemDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Expired", color: "text-red-700 bg-red-50" };
    return { label: itemDate.toLocaleDateString(), color: "text-slate-600 bg-slate-50" };
  };

  const dateInputValue = (value) => {
    if (!value) return "";
    return String(value).split("T")[0];
  };

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto p-6 text-red-600">Error: {error}</div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto p-6">Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto space-y-8 p-4 pb-20">
        {fromUpload ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Review and edit items, then click <strong>Save To Inventory</strong>.
          </div>
        ) : null}

        {inventoryMessage ? (
          <div
            className={`rounded-2xl p-4 ${
              inventoryMessageType === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {inventoryMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{data.store}</h1>
            <p className="text-slate-500">
              {new Date(`${data.purchase_date}T00:00:00`).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveToInventory}
              disabled={isSavingInventory}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-60"
            >
              {isSavingInventory ? "Saving..." : "Save To Inventory"}
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              Add Item
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}

                <Label
                  value={`$${currentTotal.toFixed(2)}`}
                  position="center"
                  className="text-2xl font-black fill-slate-900"
                  style={{ fontSize: "24px", fontWeight: "900" }}
                />
              </Pie>

              <Tooltip
                formatter={(value, name, props) => {
                  const percent = props.payload?.percent
                    ? (props.payload.percent * 100).toFixed(1)
                    : "0";
                  return [`$${Number(value).toFixed(2)} (${percent}%)`, name];
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Expires</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(data.items || []).map((item) => {
                const expiry = getExpirationStatus(item.estimated_expiration_date);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        {item.normalized_name || item.raw_name}
                      </p>
                      <p className="text-xs text-slate-400">{item.category || "Uncategorized"}</p>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      ${Number(item.price).toFixed(2)}{" "}
                      <span className="text-xs text-slate-400">x{item.quantity}</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${expiry.color}`}>
                        {expiry.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!data.items?.length ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    No items found for this receipt.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              X
            </button>

            <h2 className="text-2xl font-bold mb-6">{editingItem ? "Edit Item" : "Add New Item"}</h2>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                <input
                  name="normalized_name"
                  defaultValue={editingItem?.normalized_name || editingItem?.raw_name || ""}
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.price}
                    className="w-full bg-slate-50 border-none rounded-xl p-3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qty</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.quantity || 1}
                    className="w-full bg-slate-50 border-none rounded-xl p-3"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                <input
                  name="category"
                  defaultValue={editingItem?.category || ""}
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Expiration Date
                </label>
                <input
                  name="estimated_expiration_date"
                  type="date"
                  defaultValue={dateInputValue(editingItem?.estimated_expiration_date)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all mt-4"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
}

export default ReceiptDetail;