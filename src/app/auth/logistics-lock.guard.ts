import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Real page-level lockdown for LogisticsOfficer/Coordinator, mirroring
// cPricingLockGuard: these two roles must never land anywhere but the
// Logistics box, including by typing a URL directly — most importantly
// they must never reach Clearance, FZ Inventory, or Withdrawal detail,
// which is exactly what this redesign is meant to prevent. Applied
// alongside authGuard on every route except the Logistics-box routes
// themselves (which carry logisticsBoxGuard instead) and /login.
export const logisticsLockGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLogisticsBoxOnly()) {
    router.navigate(['/logistics']);
    return false;
  }
  return true;
};
