import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "./components/PageLoader";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const ExplorerPage = lazy(() =>
  import("./pages/ExplorerPage").then((module) => ({
    default: module.ExplorerPage,
  })),
);
const RebuildPage = lazy(() =>
  import("./pages/RebuildPage").then((module) => ({
    default: module.RebuildPage,
  })),
);

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore/:caseId" element={<ExplorerPage />} />
        <Route path="/explore/:caseId/:nodeId" element={<ExplorerPage />} />
        <Route path="/rebuild/:caseId" element={<RebuildPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
