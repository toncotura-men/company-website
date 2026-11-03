/* ボタンの文字を1字ずつに分け、動きの準備をする（見た目は assets/css/btn2.css）
   2026-11-03 オーナー指示「縦に大きすぎる・もっとかっこいいボタンに・他のとこも」
   ・読み上げ（スクリーンリーダー）には元の文がそのまま読まれるよう aria-label を付ける
   ・スマホは押した瞬間に文字が流れる（kb-roll）
   ・画面に入ると1字ずつ立ち上がる（kb-wait → kb-in） */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sel = ".x-btn, .btn, .float-entry, .nav-cta, .drawer-cta";

  function split(text) {
    var t = document.createElement("span");
    t.className = "kb-t"; t.setAttribute("aria-hidden", "true");
    Array.from(text.trim()).forEach(function (ch, i) {
      var c = document.createElement("span");
      if (ch === " " || ch === "　") { c.className = "kb-sp"; t.appendChild(c); return; }
      c.className = "kb-c"; c.style.setProperty("--i", i);
      c.innerHTML = "<span></span><span></span>";
      c.firstChild.textContent = ch; c.lastChild.textContent = ch;
      t.appendChild(c);
    });
    return t;
  }
  function arrow(el) {
    var a = el || document.createElement("span");
    a.classList.add("kb-a"); a.setAttribute("aria-hidden", "true");
    a.innerHTML = "<span>→</span><span>→</span>";
    return a;
  }

  document.querySelectorAll(sel).forEach(function (el) {
    if (el.classList.contains("kb")) return;
    var arr = el.querySelector("i, .arr");
    var small = el.querySelector("small");
    var labelEl = Array.from(el.children).find(function (c) { return c.tagName === "SPAN" && !c.classList.contains("arr"); });
    var label = labelEl ? labelEl.textContent : Array.from(el.childNodes).filter(function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join("");
    if (!label.trim()) return;
    el.setAttribute("aria-label", (label.trim() + (small ? "（" + small.textContent.trim() + "）" : "")));

    var t = split(label);
    if (labelEl) labelEl.replaceWith(t);
    else {
      Array.from(el.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove(); });
      el.insertBefore(t, el.firstChild);
    }
    if (arr) arrow(arr);
    else if (!small) el.appendChild(arrow());

    el.classList.add("kb");
    if (el.classList.contains("x-btn-lg")) el.classList.add("kb-lg");
    if (el.classList.contains("float-entry")) el.classList.add("kb-f");
    else if (el.classList.contains("nav-cta")) el.classList.add("kb-n");
    else if (el.classList.contains("drawer-cta")) el.classList.add("kb-d");
    else if (el.classList.contains("btn-light")) el.classList.add("kb-l");
    else if (el.classList.contains("btn-ghost")) el.classList.add("kb-g");
    else el.classList.add("kb-p");

    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" || reduce) return;
      el.classList.add("kb-roll");
      setTimeout(function () { el.classList.remove("kb-roll"); }, 700);
    });

    if (!reduce && "IntersectionObserver" in window && !el.classList.contains("kb-f") && !el.classList.contains("kb-d")) {
      el.classList.add("kb-wait");
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          el.classList.add("kb-in");
          requestAnimationFrame(function () { el.classList.remove("kb-wait"); });
          setTimeout(function () { el.classList.remove("kb-in"); }, 1600);
          io.disconnect();
        });
      }, { threshold: 0.4 });
      io.observe(el);
    }
  });
})();
