import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { HomePage } from '../pages/HomePage';
import { BiblePage } from '../pages/BiblePage';
import { ReaderPage } from '../pages/ReaderPage';
import { SearchPage } from '../pages/SearchPage';
import { PlansPage } from '../pages/PlansPage';
import { PlanDetailPage } from '../pages/PlanDetailPage';
import { PrayerPage } from '../pages/PrayerPage';
import { DevotionalPage, DevotionalsPage } from '../pages/DevotionalsPage';
import { AskPage } from '../pages/AskPage';
import { ContentPage, DiscoverPage, DiscoverSectionPage } from '../pages/DiscoverPage';
import { PremiumPage } from '../pages/PremiumPage';
import { AdminPage } from '../pages/AdminPage';
import { JourneyPage } from '../pages/JourneyPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ContactPage, LegalPage } from '../pages/LegalPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="bible" element={<BiblePage />} />
        <Route path="bible/search" element={<SearchPage />} />
        <Route path="bible/:version/:book/:chapter" element={<ReaderPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:slug" element={<PlanDetailPage />} />
        <Route path="devotionals" element={<DevotionalsPage />} />
        <Route path="devotionals/:slug" element={<DevotionalPage />} />
        <Route
          path="prayer"
          element={
            <ProtectedRoute>
              <PrayerPage />
            </ProtectedRoute>
          }
        />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="discover/:section" element={<DiscoverSectionPage />} />
        <Route path="discover/:section/:slug" element={<ContentPage />} />
        <Route
          path="journey"
          element={
            <ProtectedRoute>
              <JourneyPage />
            </ProtectedRoute>
          }
        />
        <Route path="premium" element={<PremiumPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="terms" element={<LegalPage doc="terms" />} />
        <Route path="privacy" element={<LegalPage doc="privacy" />} />
        <Route path="refunds" element={<LegalPage doc="refunds" />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
