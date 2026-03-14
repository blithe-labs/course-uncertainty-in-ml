document.addEventListener("DOMContentLoaded", function () {
  var links = Array.from(document.querySelectorAll(".navbar-nav .nav-link"));
  if (links.length < 2) return;

  // Resolve all nav hrefs to absolute URLs for reliable comparison
  var pages = links.map(function (a) {
    var tmp = document.createElement("a");
    tmp.href = a.getAttribute("href");
    return tmp.href;
  });

  // Match current page by URL
  var here = window.location.href.replace(/#.*$/, "");
  var current = pages.findIndex(function (url) { return url === here; });
  if (current === -1) return;

  function go(index) {
    if (index >= 0 && index < pages.length) {
      window.location.href = pages[index];
    }
  }

  // Arrow keys
  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp")    { e.preventDefault(); go(current - 1); }
  });

  // Swipe gestures
  var startX = null;
  var startY = null;
  var threshold = 50;

  document.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) go(current + 1);
    if (dx > 0) go(current - 1);
  }, { passive: true });
});
