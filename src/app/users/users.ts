import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../settings/settings-lookup.service';
import { BuAccessInput, UserSummary, UsersService } from './users.service';

const ROLES = ['IP_User', 'IP_Supervisor', 'CLR_Usr', 'CLR_Supervisor', 'BU', 'Treasury', 'CorpFinance', 'Manager', 'SuperUser', 'CPricing'];
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
  newUsername = '';
  newEmail = '';
  newDisplayName = '';
  newPassword = '';
  newRole = 'IP_User';
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
      this.newUsername = '';
      this.newEmail = '';
      this.newDisplayName = '';
      this.newPassword = '';
      this.newRole = 'IP_User';
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
    if (!this.newUsername || !this.newEmail || !this.newDisplayName || !this.newPassword) return;

    const businessUnits: BuAccessInput[] = this.newBuRows
      .filter((r) => r.businessUnitId !== null)
      .map((r) => ({ businessUnitId: r.businessUnitId!, accessLevel: r.accessLevel }));

    this.creating = true;
    this.service.create({
      username: this.newUsername, email: this.newEmail, displayName: this.newDisplayName, password: this.newPassword,
      role: this.newRole, businessUnitAccess: businessUnits
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showAddForm = false;
        this.load();
      },
      error: (err) => {
        this.creating = false;
        const backendError = err?.error;
        this.error = backendError?.message
          || (Array.isArray(backendError) ? backendError.map((e: any) => e.description).join('; ') : null)
          || 'Could not create user.';
        this.cdr.markForCheck();
      }
    });
  }

  // --- Unified Edit modal: Username, Display Name, Role, BU access, Status ---
  editingUser: UserSummary | null = null;
  editForm = { username: '', displayName: '', role: '', isActive: true, buRows: [] as NewBuRow[] };
  savingEdit = false;
  editError = '';

  get editRoleIsBuScoped(): boolean {
    return this.buScopedRoles.includes(this.editForm.role);
  }

  startEdit(user: UserSummary): void {
    this.editingUser = user;
    this.editError = '';
    this.editForm = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      buRows: user.businessUnits.map((b) => ({ businessUnitId: b.businessUnitId, accessLevel: b.accessLevel as 'Read' | 'ReadWrite' }))
    };
  }

  cancelEdit(): void {
    this.editingUser = null;
  }

  addEditBuRow(): void {
    this.editForm.buRows.push({ businessUnitId: null, accessLevel: 'Read' });
  }

  removeEditBuRow(index: number): void {
    this.editForm.buRows.splice(index, 1);
  }

  // Each field only saved if it actually changed, so an edit that only
  // touches the role doesn't also silently rewrite an unrelated field
  // via a stale/unmodified value racing with something else.
  saveEdit(): void {
    if (!this.editingUser) return;
    const user = this.editingUser;
    this.savingEdit = true;
    this.editError = '';

    const calls: Promise<any>[] = [];

    if (this.editForm.username !== user.username) {
      calls.push(firstValueFrom(this.service.updateUsername(user.id, this.editForm.username)));
    }
    if (this.editForm.displayName !== user.displayName) {
      calls.push(firstValueFrom(this.service.updateDisplayName(user.id, this.editForm.displayName)));
    }

    const businessUnits: BuAccessInput[] = this.editForm.buRows
      .filter((r) => r.businessUnitId !== null)
      .map((r) => ({ businessUnitId: r.businessUnitId!, accessLevel: r.accessLevel }));
    calls.push(firstValueFrom(this.service.updateRoles(user.id, this.editForm.role, businessUnits)));

    if (this.editForm.isActive !== user.isActive) {
      calls.push(firstValueFrom(this.editForm.isActive ? this.service.reactivate(user.id) : this.service.deactivate(user.id)));
    }

    Promise.all(calls).then(
      () => { this.savingEdit = false; this.editingUser = null; this.load(); },
      (err) => { this.savingEdit = false; this.editError = err?.error?.message ?? 'Could not save changes.'; this.cdr.markForCheck(); }
    );
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

  revokingId: string | null = null;
  revokedId: string | null = null;

  revokeSessions(user: UserSummary): void {
    this.revokingId = user.id;
    this.service.revokeSessions(user.id).subscribe({
      next: () => {
        this.revokingId = null;
        this.revokedId = user.id;
        setTimeout(() => { this.revokedId = null; this.cdr.markForCheck(); }, 2500);
        this.cdr.markForCheck();
      },
      error: () => { this.revokingId = null; this.error = 'Could not revoke sessions.'; this.cdr.markForCheck(); }
    });
  }

  // Delete is permanent and destructive — a plain click can't trigger
  // it. Confirming here means typing the person's own username back,
  // the same "type it to confirm" pattern used for the database
  // restore feature.
  deletingUser: UserSummary | null = null;
  deleteConfirmText = '';
  deleteError = '';

  startDelete(user: UserSummary): void {
    this.deletingUser = user;
    this.deleteConfirmText = '';
    this.deleteError = '';
  }

  cancelDelete(): void {
    this.deletingUser = null;
  }

  confirmDelete(): void {
    if (!this.deletingUser || this.deleteConfirmText !== this.deletingUser.username) return;
    this.service.delete(this.deletingUser.id).subscribe({
      next: () => { this.deletingUser = null; this.load(); },
      error: (err) => { this.deleteError = err?.error?.message ?? 'Could not delete user.'; this.cdr.markForCheck(); }
    });
  }
}
