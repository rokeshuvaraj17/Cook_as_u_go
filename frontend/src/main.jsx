import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import PastUploads from "./pages/PastUploads";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";
import Register from "./pages/Register";
import ReceiptDetail from "./pages/ReceiptDetail";
import Bills from "./pages/Bills";
import BillDetail from "./pages/BillDetail";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/bills", element: <Bills /> },
      { path: "/bills/:id", element: <BillDetail /> },
      { path: "/past-uploads", element: <PastUploads /> },
      { path: "/inventory", element: <Inventory /> },
      { path: "/past-uploads/:id", element: <ReceiptDetail /> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);