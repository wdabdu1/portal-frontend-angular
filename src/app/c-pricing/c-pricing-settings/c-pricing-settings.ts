import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CPricingCategory, CPricingService, CPricingType } from '../c-pricing.service';

// Mini-settings for the C Pricing feature only — C_Cat and C_Type. Kept
// separate from the general Settings admin screens since the CPricing role
// (not just Manager/SuperUser) needs to manage these, and a C_Type must
// always be created against an existing C_Cat (never standalone).
@Component({
  selector: 'app-c-pricing-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './c-pricing-settings.html'
})
export class CPricingSettings implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  categories: CPricingCategory[] = [];
  types: CPricingType[] = [];
  loading = true;
  error = '';

  newCategoryName = '';
  savingCategory = false;

  newTypeName = '';
  newTypeCategoryId: number | null = null;
  savingType = false;

  editingCategoryId: number | null = null;
  editCategoryName = '';
  editingTypeId: number | null = null;
  editTypeName = '';
  editTypeCategoryId: number | null = null;

  constructor(private service: CPricingService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getCategories().subscribe({
      next: (r) => {
        this.categories = r;
        this.service.getTypes().subscribe({
          next: (t) => { this.types = t; this.loading = false; this.cdr.markForCheck(); },
          error: () => { this.error = 'Could not load C_Type list.'; this.loading = false; this.cdr.markForCheck(); }
        });
      },
      error: () => { this.error = 'Could not load C_Cat list.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  categoryName(id: number): string {
    return this.categories.find((c) => c.id === id)?.name ?? '—';
  }

  typesFor(categoryId: number): CPricingType[] {
    return this.types.filter((t) => t.cPricingCategoryId === categoryId);
  }

  addCategory(): void {
    if (!this.newCategoryName.trim()) return;
    this.savingCategory = true;
    this.service.createCategory(this.newCategoryName.trim()).subscribe({
      next: () => { this.newCategoryName = ''; this.savingCategory = false; this.load(); },
      error: () => { this.error = 'Could not create this C_Cat.'; this.savingCategory = false; this.cdr.markForCheck(); }
    });
  }

  startEditCategory(c: CPricingCategory): void {
    this.editingCategoryId = c.id;
    this.editCategoryName = c.name;
  }

  saveEditCategory(c: CPricingCategory): void {
    this.service.updateCategory(c.id, this.editCategoryName, c.isActive).subscribe({
      next: () => { this.editingCategoryId = null; this.load(); },
      error: () => { this.error = 'Could not update this C_Cat.'; this.cdr.markForCheck(); }
    });
  }

  toggleCategoryActive(c: CPricingCategory): void {
    this.service.updateCategory(c.id, c.name, !c.isActive).subscribe({ next: () => this.load() });
  }

  deleteCategory(c: CPricingCategory): void {
    if (!window.confirm(`Delete C_Cat "${c.name}"? This can't be undone.`)) return;
    this.service.deleteCategory(c.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.error = err?.status === 409 ? `"${c.name}" is in use and can't be deleted.` : 'Could not delete this C_Cat.';
        this.cdr.markForCheck();
      }
    });
  }

  addType(): void {
    if (!this.newTypeName.trim() || !this.newTypeCategoryId) return;
    this.savingType = true;
    this.service.createType(this.newTypeName.trim(), this.newTypeCategoryId).subscribe({
      next: () => { this.newTypeName = ''; this.savingType = false; this.load(); },
      error: () => { this.error = 'Could not create this C_Type.'; this.savingType = false; this.cdr.markForCheck(); }
    });
  }

  startEditType(t: CPricingType): void {
    this.editingTypeId = t.id;
    this.editTypeName = t.name;
    this.editTypeCategoryId = t.cPricingCategoryId;
  }

  saveEditType(t: CPricingType): void {
    if (!this.editTypeCategoryId) return;
    this.service.updateType(t.id, this.editTypeName, this.editTypeCategoryId, t.isActive).subscribe({
      next: () => { this.editingTypeId = null; this.load(); },
      error: () => { this.error = 'Could not update this C_Type.'; this.cdr.markForCheck(); }
    });
  }

  toggleTypeActive(t: CPricingType): void {
    this.service.updateType(t.id, t.name, t.cPricingCategoryId, !t.isActive).subscribe({ next: () => this.load() });
  }

  deleteType(t: CPricingType): void {
    if (!window.confirm(`Delete C_Type "${t.name}"? This can't be undone.`)) return;
    this.service.deleteType(t.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.error = err?.status === 409 ? `"${t.name}" is in use and can't be deleted.` : 'Could not delete this C_Type.';
        this.cdr.markForCheck();
      }
    });
  }
}
