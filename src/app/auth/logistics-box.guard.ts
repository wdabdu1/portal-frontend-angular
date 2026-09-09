import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// The other half of the Logistics box lockdown: restricts the box itself
// to LogisticsOfficer, Coordinator, Manager and SuperUser — everyone else
// (Clearance, Finance, BU, etc.) is redirected to Home. Applied only to
// the routes inside the Logistics box (/logistics/*, and the reveal
// settings screen).
export const logisticsBoxGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canSeeLogisticsBox()) return true;
  router.navigate(['/']);
  return false;
};
