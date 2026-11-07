// Runs before first paint (loaded in <head>) so dark-mode users never see a white flash.
// The person's choice wins; otherwise the phone's setting decides (pure CSS, no attribute).
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  } catch {
    // Storage blocked (private mode): the system setting still applies.
  }
})();
