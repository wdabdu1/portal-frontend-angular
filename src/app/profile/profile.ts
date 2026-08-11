import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  email = '';
  displayNameForm = '';

  savingName = false;
  nameSaved = false;
  nameError = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = false;
  passwordSaved = false;
  passwordError = '';

  constructor(private service: ProfileService, private auth: AuthService) {}

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (p) => { this.email = p.email; this.displayNameForm = p.displayName; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  saveName(): void {
    if (!this.displayNameForm.trim()) return;
    this.savingName = true;
    this.nameSaved = false;
    this.nameError = '';
    this.service.update(this.displayNameForm.trim()).subscribe({
      next: () => {
        this.savingName = false;
        this.nameSaved = true;
        this.auth.setDisplayName(this.displayNameForm.trim());
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingName = false;
        this.nameError = err?.error?.message || 'Could not save display name.';
        this.cdr.markForCheck();
      }
    });
  }

  savePassword(): void {
    this.passwordError = '';
    this.passwordSaved = false;
    if (!this.currentPassword || !this.newPassword) {
      this.passwordError = 'Fill in both your current and new password.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New password and confirmation do not match.';
      return;
    }
    this.savingPassword = true;
    this.service.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSaved = true;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordError = err?.error?.message || 'Could not change password.';
        this.cdr.markForCheck();
      }
    });
  }
}
