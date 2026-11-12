import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

// "Logistics - Settings" — the hub at the end of the Logistics menu that
// gives Logistics/Coordinator (and Manager/SuperUser) direct access to the
// logistics master lists. These always show here, regardless of the admin
// switch that hides them from the main Settings menu.
@Component({
  selector: 'app-logistics-settings',
  imports: [RouterLink],
  template: `
    <div style="max-width: 700px; margin: 2rem auto; font-family: sans-serif; padding: 0 1rem;">
      <h1 style="font-size: 20px; font-weight: 500;">Logistics - Settings</h1>
      <p style="color: #666; font-size: 13px;">
        Lists used when allocating trucks and planning deliveries.
        @if (!auth.canEditLogisticsLists()) { <span>(View only for your role.)</span> }
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" style="padding: 8px 14px; background: #f0f0f0; color: #333; border-radius: 4px; text-decoration: none; font-size: 13px;">{{ l.label }}</a>
        }
      </div>
    </div>
  `
})
export class LogisticsSettings {
  constructor(public auth: AuthService) {}

  links = [
    { label: 'Drivers', path: '/logistics/settings/drivers' },
    { label: 'Trucks', path: '/logistics/settings/trucks' },
    { label: 'Warehouses', path: '/logistics/settings/warehouses' },
    { label: 'External Transporters', path: '/logistics/settings/external-transporters' },
    { label: 'Logistics Cities', path: '/logistics/settings/logistics-cities' }
  ];
}
