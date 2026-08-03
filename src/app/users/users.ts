import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../settings/settings-lookup.service';
import { BuAccessInput, UserSummary, UsersService } from './users.service';

const ROLES = ['IP_User', 'IP_Supervisor', 'CLR_Usr', 'CLR_Supervisor', 'BU', 'Treasury', 'CorpFinance', 'Manager', 'SuperUser'];
const BU_SCOPED_ROLES = ['IP_User', 'IP_Supervisor', 'BU'];

interface NewBuRow {
  businessUnitId: number | null;
  accessLevel: 'Read' | 'ReadWrite';
}

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users.html'
})
export class Users implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  users: UserSummary[] = [];
  businessUnits: LookupEntity[] = [];
  loading = true;
  error = '';
  roles = ROLES;
  buScopedRoles = BU_SCOPED_ROLES;

  get newRoleIsBuScoped(): boolean {
    return this.buScopedRoles.includes(this.newRole);
  }

  showAddForm = false;
  newEmail = '';
  newDisplayName = '';
  newPassword = '';
  newRole = 'Standard';
  newBuRows: NewBuRow[] = [];
  creating = false;

  constructor(private service: UsersService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({
      next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.users = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load users.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.newEmail = '';
      this.newDisplayName = '';
      this.newPassword = '';
      this.newRole = 'Standard';
      this.newBuRows = [];
    }
  }

  addBuRow(): void {
    this.newBuRows.push({ businessUnitId: null, accessLevel: 'Read' });
  }

  removeBuRow(index: number): void {
    this.newBuRows.splice(index, 1);
  }

  businessUnitName(id: number): string {
    return (this.businessUnits.find((b) => b.id === id)?.['name'] as string) ?? '';
  }

  createUser(): void {
    if (!this.newEmail || !this.newDisplayName || !this.newPassword) return;

    const businessUnits: BuAccessInput[] = this.newBuRows
      .filter((r) => r.businessUnitId !== null)
      .map((r) => ({ businessUnitId: r.businessUnitId!, accessLevel: r.accessLevel }));

    this.creating = true;
    this.service.create({
      email: this.newEmail, displayName: this.newDisplayName, password: this.newPassword,
      role: this.newRole, businessUnitAccess: businessUnits
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showAddForm = false;
        this.load();
      },
      error: (err) => {
        this.creating = false;
        this.error = err?.error?.message || 'Could not create user.';
        this.cdr.markForCheck();
      }
    });
  }

  deactivate(user: UserSummary): void {
    this.service.deactivate(user.id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Could not deactivate user.'; this.cdr.markForCheck(); }
    });
  }

  reactivate(user: UserSummary): void {
    this.service.reactivate(user.id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Could not reactivate user.'; this.cdr.markForCheck(); }
    });
  }
}
