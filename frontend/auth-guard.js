/**
 * auth-guard.js — CareerMap AI
 * Must be loaded as the FIRST script in every protected page's <head>.
 * Runs synchronously — redirects to login before any content paints.
 */
(function () {
  const token = localStorage.getItem('cm_token') || localStorage.getItem('currentUser');
  if (!token) {
    // Immediately hide page to prevent flash
    document.documentElement.style.visibility = 'hidden';
    // Redirect to index.html — use replace so back button doesn't loop
    window.location.replace('index.html');
  }
})();

