import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DeckPage } from "./pages/DeckPage";
import { SnapshotPage } from "./pages/SnapshotPage";

const router = createBrowserRouter([
  { path: "/", element: <DeckPage /> },
  { path: "/deck/:auditId", element: <DeckPage /> },
  { path: "/snapshot/:auditId", element: <SnapshotPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
