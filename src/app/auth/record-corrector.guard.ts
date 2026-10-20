import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Edit Order / Edit Shipment screens — Manager and SuperUser only (the
// backend enforces the same via AppRoles.RecordCorrectors).
export const recordCorrectorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canCorrectRecords()) return true;
  router.navigate(['/orders']);
  return false;
};
