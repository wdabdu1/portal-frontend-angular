import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Model/Product management moved out of Settings into Update Order and,
// per that request, is now restricted to Manager and IP_Supervisor
// (SuperUser kept too — the same admin escape hatch every other guard
// in this file includes). Anyone else hitting the URL directly is sent
// back to Orders rather than Settings, since this page no longer lives
// there.
export const modelProductsAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole('Manager') || auth.hasRole('IP_Supervisor') || auth.hasRole('SuperUser')) {
    return true;
  }
  router.navigate(['/orders']);
  return false;
};
