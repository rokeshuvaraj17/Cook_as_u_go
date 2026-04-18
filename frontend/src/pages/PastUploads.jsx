import PageLayout from "../components/PageLayout";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ReceiptRow({ id, store, date, onDelete }) {
  const handleDeleteClick = (e) => {
    // Prevent the Link from firing when clicking the delete button
    e.preventDefault(); 
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete the receipt from ${store}?`)) {
      onDelete(id);
    }
  };

  return (
    <Link to={`/past-uploads/${id}`} className="block group">
      <li className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl mb-3 hover:border-blue-500 hover:shadow-md transition-all">
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
            {store}
          </span>
          <span className="text-sm text-slate-400">
            {new Date(date).toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-slate-300 group-hover:text-blue-500 transition-colors flex items-center">
            <span className="text-xs font-semibold mr-2 uppercase tracking-wider">View Details</span>
            →
          </div>
          
          {/* Delete Button */}
          <button 
            onClick={handleDeleteClick}
            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Delete Receipt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </li>
    </Link>
  );
}

// 2. Updated List Component
function ReceiptList({ items, onDelete }) {
  if (!items.length) return (
    <div className="text-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
       <p className="text-slate-400">No uploads found yet.</p>
    </div>
  );

  return (
    <ul className="mt-6">
      {items.map((receipt) => (
        <ReceiptRow
          key={receipt.receipt_id}
          id={receipt.receipt_id}
          store={receipt.store}
          date={receipt.purchase_date || receipt.date}
          onDelete={onDelete} // Pass the function down
        />
      ))}
    </ul>
  );
}

// 3. Main Page with Delete Logic
function PastUploads() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");

  const fetchAllReceipts = async () => {
    try {
      const response = await fetch(`http://localhost:8000/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch receipts");
      const data = await response.json();
      setReceipts(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // The Delete Function
  const deleteReceipt = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/receipts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Optimistic Update: Filter out the deleted receipt from state
        setReceipts(prev => prev.filter(r => r.receipt_id !== id));
      } else {
        alert("Failed to delete the receipt.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting.");
    }
  };

  useEffect(() => {
    if (token) fetchAllReceipts();
  }, [token]);

  return (
    <PageLayout>
      <section className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900">Past Uploads</h1>
          <p className="text-slate-500 mt-2">Manage your categorized receipts.</p>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
          </div>
        ) : (
          <ReceiptList items={receipts} onDelete={deleteReceipt} />
        )}
      </section>
    </PageLayout>
  );
}

export default PastUploads;