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

  editingId: number | null = null;
  editBusinessUnitId: number | null = null;
  editCode = '';
  editName = '';
  saving = false;
  deletingId: number | null = null;

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
      error: () => { this.error = 'Could not create division.'; this.cdr.markForCheck(); }
    });
  }

  startEdit(division: Division): void {
    this.editingId = division.id;
    this.editBusinessUnitId = division.businessUnitId;
    this.editCode = division.code;
    this.editName = division.name;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(division: Division): void {
    if (!this.editBusinessUnitId) return;
    this.saving = true;
    this.lookups.update<Division>('divisions', division.id, {
      businessUnitId: this.editBusinessUnitId, code: this.editCode, name: this.editName
    }).subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Could not update this division.';
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(division: Division): void {
    if (!window.confirm(`Delete "${division.name}"? This can't be undone.`)) return;

    this.deletingId = division.id;
    this.lookups.delete('divisions', division.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.load();
      },
      error: (err) => {
        this.deletingId = null;
        this.error = err?.status === 409
          ? `"${division.name}" is in use and can't be deleted.`
          : `Could not delete this division.`;
        this.cdr.markForCheck();
      }
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
