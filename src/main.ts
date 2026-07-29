import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
// Test connection to live .NET backend
fetch('https://portal-backend-dotnet.onrender.com/weatherforecast')
  .then(response => response.json())
  .then(data => console.log('✅ API Response Success:', data))
  .catch(error => console.error('❌ API Request Error:', error));