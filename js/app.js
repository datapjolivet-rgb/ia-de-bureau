// Application installable (téléphone, tablette, ordinateur) : icône sur l'écran d'accueil, plein écran, jeu solo hors ligne.
// Seulement sur le site du jeu (la page porte alors un manifeste) : rien ne change dans l'artefact claude.ai ni en fichier local.
// - Android, ordinateur (Chrome, Edge…) : le navigateur propose l'installation ; le menu de départ affiche « Installer l'application ».
// - iPhone, iPad : pas d'installation automatique ; le menu explique comment l'ajouter depuis Safari.
(function () {
  const App = (G.App = { prompt: null, installed: false });
  const site = !!document.querySelector('link[rel="manifest"]') && 'serviceWorker' in navigator && !(window.claude && window.claude.use);
  App.site = site;
  const mq = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  // lancé depuis l'icône de l'écran d'accueil ?
  App.standalone = () => mq('(display-mode: fullscreen)') || mq('(display-mode: standalone)') || navigator.standalone === true;
  App.ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  App.canInstall = () => site && !App.standalone() && !App.installed && (!!App.prompt || App.ios());

  // le menu de départ se redessine quand l'installation devient possible (ou vient d'être faite)
  function refresh() {
    const UI = G.UI;
    if (G.Game && G.Game.mode === 'title' && UI.titleView === 'home') UI.showTitle();
  }
  App.install = function () {
    if (App.prompt) {
      const p = App.prompt;
      App.prompt = null;
      p.prompt();
      Promise.resolve(p.userChoice).then((c) => { if (c && c.outcome === 'accepted') App.installed = true; refresh(); }).catch(() => refresh());
      return;
    }
    if (App.ios() && G.UI.showInstallHelp) G.UI.showInstallHelp();
  };

  if (!site) return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.prompt = e; refresh(); });
  window.addEventListener('appinstalled', () => { App.prompt = null; App.installed = true; refresh(); });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* pas de mode hors ligne : le jeu marche quand même */ });
    // application installée : on demande que les sauvegardes ne soient jamais effacées pour faire de la place
    if (App.standalone() && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  });
})();
