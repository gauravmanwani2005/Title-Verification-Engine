import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import { SubmissionStoreProvider } from './context/SubmissionStore';
import { Layout } from './components/layout/Layout';
import { RoleDashboard } from './pages/RoleDashboard';
import { VerifyTitle } from './pages/VerifyTitle';
import { VerificationResult } from './pages/VerificationResult';
import { TitleDatabase } from './pages/TitleDatabase';
import { TitleDetail } from './pages/TitleDetail';
import { VerificationHistory } from './pages/VerificationHistory';
import { RulesGuidelines } from './pages/RulesGuidelines';
import { Analytics } from './pages/Analytics';
import { AboutSystem } from './pages/AboutSystem';
import { MyApplications } from './pages/MyApplications';

export default function App() {
  return (
    <RoleProvider>
      <SubmissionStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<RoleDashboard />} />
              <Route path="verify"            element={<VerifyTitle />} />
              <Route path="result"            element={<VerificationResult />} />
              <Route path="database"          element={<TitleDatabase />} />
              <Route path="database/:id"      element={<TitleDetail />} />
              <Route path="history"           element={<VerificationHistory />} />
              <Route path="rules"             element={<RulesGuidelines />} />
              <Route path="analytics"         element={<Analytics />} />
              <Route path="about"             element={<AboutSystem />} />
              <Route path="my-applications"   element={<MyApplications />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SubmissionStoreProvider>
    </RoleProvider>
  );
}
