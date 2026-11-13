import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../auth/useAuth';
import { billingService, isPremium } from './billingService';

/**
 * Whether premium locks are switched on, and whether this reader is a subscriber.
 * This only decides what the screen offers; the database enforces the real access.
 */
export function usePremium() {
  const { user } = useAuth();
  const state = useAsync(
    () => (user ? billingService.premiumState() : billingService.paywallLive().then((paywallLive) => ({ premiumUntil: null, paywallLive }))),
    [user?.id],
  );
  const premium = isPremium(state.data);
  return {
    loading: state.loading,
    premium,
    premiumUntil: state.data?.premiumUntil ?? null,
    paywallLive: state.data?.paywallLive ?? false,
    /** True when a premium feature should be shown as locked to this reader. */
    locked: (state.data?.paywallLive ?? false) && !premium,
    reload: state.reload,
  };
}
