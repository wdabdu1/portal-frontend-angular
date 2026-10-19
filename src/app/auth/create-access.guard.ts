import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// New Supplier Order / New Shipment are create screens — the backend
// (AppRoles.OrdersShipmentsEditors) only accepts IP_User, IP_Supervisor and
// SuperUser. Without this guard a view-only role (e.g. BU) could still open
// the screen by typing the URL, fill the form, and only then get a 403.
export const createAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canCreateOrders()) return true;
  router.navigate(['/shipments']);
  return false;
};
