import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface Division extends LookupEntity {
  businessUnitId: number;
  code: string;
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-divisions',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './divisions.html'
})
export class Divisions implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  divisions: Division[] = [];
  businessUnits: LookupEntity[] = [];
  loading = true;
  error = '';

  newBusinessUnitId: number | null = null;
  newCode = '';
  newName = '';

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({
      next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  businessUnitName(id: number): string {
    return (this.businessUnits.find((b) => b.id === id)?.['name'] as string) ?? '';
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<Division>('divisions').subscribe({
      next: (r) => { this.divisions = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load divisions.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  add(): void {
    if (!this.newBusinessUnitId || !this.newCode || !this.newName) return;
    this.lookups.create<Division>('divisions', {
      businessUnitId: this.newBusinessUnitId, code: this.newCode, name: this.newName, isActive: true
    }).subscribe({
      next: () => {
        this.newBusinessUnitId = null;
        this.newCode = '';
        this.newName = '';
        this.load();
      },
      error: () => { this.error = 'Could not create division.'; this.cdr.markForCheck(); }
    });
  }
}
