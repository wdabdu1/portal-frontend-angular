import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface BusinessUnit extends LookupEntity {
  code: string;
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-business-units',
  imports: [CommonModule, FormsModule],
  templateUrl: './business-units.html'
})
export class BusinessUnits implements OnInit {
  units: BusinessUnit[] = [];
  newCode = '';
  newName = '';
  loading = true;
  error = '';

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<BusinessUnit>('business-units').subscribe({
      next: (units) => { this.units = units; this.loading = false; },
      error: () => { this.error = 'Could not load business units.'; this.loading = false; }
    });
  }

  add(): void {
    if (!this.newCode || !this.newName) return;
    this.lookups.create<BusinessUnit>('business-units', { code: this.newCode, name: this.newName, isActive: true }).subscribe({
      next: () => { this.newCode = ''; this.newName = ''; this.load(); },
      error: () => (this.error = 'Could not create business unit.')
    });
  }
}
