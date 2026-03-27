import { app } from 'electron';
console.log('App successfully loaded:', !!app);
if (app) app.quit();
