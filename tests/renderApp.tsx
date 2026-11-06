import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { AppRoutes } from '../src/app/AppRoutes';
import i18n, { initI18n } from '../src/app/i18n';

/** Renders the full app shell at a given route with English as the starting language. */
export async function renderApp(route = '/') {
  initI18n('en');
  await i18n.changeLanguage('en');
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}
