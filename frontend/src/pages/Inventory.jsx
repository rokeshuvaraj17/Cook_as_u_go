import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";

const API_BASE = "http://127.0.0.1:8000";

function formatDate(value) {
  if (!value) return "No estimate";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access_token");

  async function loadInventory() {
    setLoading(true);
    const res = await fetch(`${API_BASE}/inventory/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTs = a.estimated_expiration_date
          ? new Date(`${a.estimated_expiration_date}T00:00:00`).getTime()
          : -Infinity;
        const bTs = b.estimated_expiration_date
          ? new Date(`${b.estimated_expiration_date}T00:00:00`).getTime()
          : -Infinity;
        return bTs - aTs; // most recent -> least
      }),
    [items]
  );

  async function decrement(id) {
  try {
    const res = await fetch(`${API_BASE}/inventory/${id}/decrement`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 1 }),
    });

    if (res.ok) {
      const updated = await res.json();

      // Check if quantity has hit 0
      if (Number(updated.quantity) <= 0) {
        // Call existing removeItem function to delete from DB
        await removeItem(id);
      } else {
        // Otherwise, just update the list normally
        setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
      }
    }
  } catch (error) {
    console.error("Decrement failed:", error);
  }
}
  async function removeItem(id) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }
  }

  return (
    <PageLayout>
      <section className="inventory-page">
        <h1>Inventory</h1>
        <p className="inventory-subtext">
          Sorted by expiration date (most recent to least recent).
        </p>

        {loading ? <p>Loading...</p> : null}

        {!loading && !sortedItems.length ? (
          <p className="inventory-empty">No inventory items yet.</p>
        ) : null}

        {!loading && sortedItems.length ? (
          <ul className="inventory-list">
            {sortedItems.map((item) => (
              <li key={item.id} className="inventory-row">
                <span className="inventory-name">{item.name}</span>
                <span>{item.category || "Uncategorized"}</span>
                <span>{formatDate(item.estimated_expiration_date)}</span>
                <span>Qty: {item.quantity}</span>
                <div className="inventory-actions">
                  <button className="inventory-btn" onClick={() => decrement(item.id)}>
                    -1
                  </button>
                  <button
                    className="inventory-btn inventory-btn-danger"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </PageLayout>
  );
}

export default Inventory;