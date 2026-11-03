/* トップ「4つの軸」のスポットライト（見た目は assets/css/home2.css の最後）。2026-11-03
   ・パソコン（カーソルが使える）：乗せた行を選ぶ。離れたら画面の真ん中の行に戻る
   ・スマホ・iPad：画面の真ん中を通る行を選ぶ（スクロールで1行ずつ切り替わる）。タップした行もすぐ選ばれる */
(function () {
  var list = document.querySelector(".x-rules .pillars");
  if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll(".pillar"));
  var hovered = null, centered = null;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  function paint() {
    var on = hovered || centered;
    rows.forEach(function (r) { r.classList.toggle("is-on", r === on); });
    list.classList.toggle("has-on", !!on);
  }
  function pickCenter() {
    var mid = innerHeight / 2, best = null, bestD = Infinity;
    var lr = list.getBoundingClientRect();
    if (lr.bottom < innerHeight * 0.2 || lr.top > innerHeight * 0.8) { centered = null; return paint(); }
    rows.forEach(function (r) {
      var b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid);
      if (d < bestD) { bestD = d; best = r; }
    });
    centered = best; paint();
  }
  var ticking = false;
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; pickCenter(); }); }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  rows.forEach(function (r) {
    if (fine) {
      r.addEventListener("mouseenter", function () { hovered = r; paint(); });
      r.addEventListener("mouseleave", function () { if (hovered === r) hovered = null; paint(); });
    }
    r.addEventListener("click", function () { centered = r; hovered = fine ? r : null; paint(); });
  });
  pickCenter();
})();
