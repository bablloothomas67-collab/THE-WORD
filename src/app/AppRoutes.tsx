import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { HomePage } from '../pages/HomePage';
import { BiblePage } from '../pages/BiblePage';
import { AskPage } from '../pages/AskPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { JourneyPage } from '../pages/JourneyPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="bible" element={<BiblePage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
