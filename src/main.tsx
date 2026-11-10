import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './styles/global.css';
import SitePage from './site/SitePage';

const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const NotFound = lazy(() => import('./pages/NotFound'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
          <Routes>
            <Route path="/" element={<SitePage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
