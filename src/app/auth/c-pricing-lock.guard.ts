import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Real page-level lockdown for the CPricing role: unlike every other role
// in the app (where restriction is "soft" — the menu just hides an item,
// but a typed URL still loads the page shell before its API calls 403),
// a CPricing-only user must never land anywhere but the C Pricing pages,
// including by typing a URL directly. Applied alongside authGuard on every
// route except the three C Pricing routes themselves and /login.
export const cPricingLockGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isCPricingOnly()) {
    router.navigate(['/c-pricing']);
    return false;
  }
  return true;
};
