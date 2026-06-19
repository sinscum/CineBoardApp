import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import LibraryPage from "./pages/LibraryPage";
import DisplaysPage from "./pages/DisplaysPage";
import SchedulesPage from "./pages/SchedulesPage";
import PersonalizationPage from "./pages/PersonalizationPage";
import SettingsPage from "./pages/SettingsPage";
import DisplayPage from "./pages/DisplayPage";
import ErrorBoundary from "./components/ErrorBoundary";

const NotFound = () => (
  <div style={{ padding: 24, color: "#fff" }}>404 - Not Found</div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/displays" element={<DisplaysPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/personalization" element={<PersonalizationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="/display" element={<Navigate to="/display/1" replace />} />
          <Route path="/display/:id" element={<DisplayPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
