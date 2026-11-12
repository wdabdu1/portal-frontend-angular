import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Replaces logisticsLockGuard on the Clearance screens only. Coordinator
// may now open Clearance (read-only, enforced again on the backend);
// LogisticsOfficer stays locked to the Logistics box.
export const clearanceScreenGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canSeeClearanceScreen()) return true;
  router.navigate(['/logistics']);
  return false;
};
