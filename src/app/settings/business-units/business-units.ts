import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface BusinessUnit extends LookupEntity {
  code: string;
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-business-units',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './business-units.html'
})
export class BusinessUnits implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  units: BusinessUnit[] = [];
  newCode = '';
  newName = '';
  loading = true;
  error = '';

  editingId: number | null = null;
  editCode = '';
  editName = '';
  saving = false;
  deletingId: number | null = null;

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
      next: (units) => {
        this.units = units;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not create business unit.';
        this.cdr.markForCheck();
      }
    });
  }

  startEdit(unit: BusinessUnit): void {
    this.editingId = unit.id;
    this.editCode = unit.code;
    this.editName = unit.name;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(unit: BusinessUnit): void {
    this.saving = true;
    this.lookups.update<BusinessUnit>('business-units', unit.id, { code: this.editCode, name: this.editName }).subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Could not update this business unit.';
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(unit: BusinessUnit): void {
    if (!window.confirm(`Delete "${unit.name}"? This can't be undone.`)) return;

    this.deletingId = unit.id;
    this.lookups.delete('business-units', unit.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.load();
      },
      error: (err) => {
        this.deletingId = null;
        this.error = err?.status === 409
          ? `"${unit.name}" is in use and can't be deleted.`
          : `Could not delete this business unit.`;
        this.cdr.markForCheck();
      }
    });
  }


  add(): void {
    if (!this.newCode || !this.newName) return;
    this.lookups.create<BusinessUnit>('business-units', { code: this.newCode, name: this.newName, isActive: true }).subscribe({
      next: () => {
        this.newCode = '';
        this.newName = '';
        this.load();
      },
      error: () => {
        this.error = 'Could not create business unit.';
        this.cdr.markForCheck();
      }
    });
  }
}
