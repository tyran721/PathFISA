import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { SlidesPage } from "./pages/SlidesPage";
import { TasksPage } from "./pages/TasksPage";
import { ModelsPage } from "./pages/ModelsPage";
import { AnnotationPage } from "./pages/AnnotationPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/slides" element={<SlidesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/models" element={<ModelsPage />} />
      </Route>
      <Route path="/annotate/:slideId" element={<AnnotationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

