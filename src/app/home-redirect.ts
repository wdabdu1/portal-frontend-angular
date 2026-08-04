import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';

// Root path lands here first, then immediately redirects — Orders for
// roles that can see it, Clearance for everyone else (universal fallback,
// since every role has at least View there).
@Component({
  selector: 'app-home-redirect',
  template: ''
})
export class HomeRedirect implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.router.navigate([this.auth.canSeeOrders() ? '/orders' : '/clearance']);
  }
}
