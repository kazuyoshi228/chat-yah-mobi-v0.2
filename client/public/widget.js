/**
 * yah.mobile Chat Widget - External Embed Script
 *
 * Usage:
 *   <script src="https://yahchatapp-wagyp22n.manus.space/widget.js"
 *           data-app-id="yah-mobile"
 *           data-lang="ja"
 *           data-position="bottom-right"
 *           data-color="#000000">
 *   </script>
 */
(function () {
  "use strict";

  // Prevent double initialization
  if (window.__yahChatWidgetLoaded) return;
  window.__yahChatWidgetLoaded = true;

  // ── Configuration ─────────────────────────────────────────────────────────
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var BASE_URL = (function () {
    var src = currentScript.src || "";
    var match = src.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : "https://yahchatapp-wagyp22n.manus.space";
  })();

  var config = {
    lang: currentScript.getAttribute("data-lang") || "ja",
    position: currentScript.getAttribute("data-position") || "bottom-right",
    color: currentScript.getAttribute("data-color") || "#000000",
    zIndex: parseInt(currentScript.getAttribute("data-z-index") || "999999", 10),
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  var BUTTON_SIZE = 56;
  var WIDGET_WIDTH = 380;
  var WIDGET_HEIGHT = 560;
  var OFFSET = 24;

  var isRight = config.position !== "bottom-left";
  var posH = isRight ? "right:" + OFFSET + "px;" : "left:" + OFFSET + "px;";

  var style = document.createElement("style");
  style.textContent =
    "#yah-chat-btn{" +
      "position:fixed;bottom:" + OFFSET + "px;" + posH +
      "width:" + BUTTON_SIZE + "px;height:" + BUTTON_SIZE + "px;" +
      "border-radius:50%;background:" + config.color + ";" +
      "border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.25);" +
      "display:flex;align-items:center;justify-content:center;" +
      "z-index:" + config.zIndex + ";transition:transform 0.15s ease,box-shadow 0.15s ease;" +
      "outline:none;" +
    "}" +
    "#yah-chat-btn:hover{transform:scale(1.07);box-shadow:0 6px 20px rgba(0,0,0,0.3);}" +
    "#yah-chat-btn:active{transform:scale(0.95);}" +
    "#yah-chat-badge{" +
      "position:absolute;top:-4px;" + (isRight ? "right:-4px;" : "left:-4px;") +
      "width:20px;height:20px;border-radius:50%;background:#ef4444;" +
      "color:#fff;font-size:11px;font-weight:700;display:none;" +
      "align-items:center;justify-content:center;font-family:sans-serif;" +
    "}" +
    "#yah-chat-frame-wrap{" +
      "position:fixed;bottom:" + (OFFSET + BUTTON_SIZE + 12) + "px;" + posH +
      "width:" + WIDGET_WIDTH + "px;height:" + WIDGET_HEIGHT + "px;" +
      "border-radius:16px;overflow:hidden;" +
      "box-shadow:0 8px 40px rgba(0,0,0,0.18);border:1px solid rgba(0,0,0,0.08);" +
      "z-index:" + (config.zIndex - 1) + ";" +
      "display:none;flex-direction:column;" +
      "transform:scale(0.95) translateY(8px);opacity:0;" +
      "transition:transform 0.2s cubic-bezier(0.23,1,0.32,1),opacity 0.2s ease;" +
      "transform-origin:" + (isRight ? "bottom right" : "bottom left") + ";" +
    "}" +
    "#yah-chat-frame-wrap.yah-open{display:flex;}" +
    "#yah-chat-frame-wrap.yah-visible{transform:scale(1) translateY(0);opacity:1;}" +
    "#yah-chat-iframe{width:100%;height:100%;border:none;background:#fff;}" +
    "@media(max-width:440px){" +
      "#yah-chat-frame-wrap{" +
        "width:calc(100vw - 16px);" +
        (isRight ? "right:8px;" : "left:8px;") +
        "bottom:" + (OFFSET + BUTTON_SIZE + 8) + "px;" +
      "}" +
    "}";
  document.head.appendChild(style);

  // ── DOM ────────────────────────────────────────────────────────────────────
  // Button
  var btn = document.createElement("button");
  btn.id = "yah-chat-btn";
  btn.setAttribute("aria-label", "チャットサポートを開く");
  btn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
    "</svg>";

  // Unread badge
  var badge = document.createElement("span");
  badge.id = "yah-chat-badge";
  btn.appendChild(badge);

  // iframe wrapper
  var wrap = document.createElement("div");
  wrap.id = "yah-chat-frame-wrap";

  // iframe
  var iframe = document.createElement("iframe");
  iframe.id = "yah-chat-iframe";
  iframe.title = "yah.mobile Chat Support";
  iframe.allow = "microphone";
  var iframeSrc =
    BASE_URL +
    "/widget-chat?lang=" + encodeURIComponent(config.lang) +
    "&color=" + encodeURIComponent(config.color) +
    "&origin=" + encodeURIComponent(window.location.origin);
  iframe.src = iframeSrc;

  wrap.appendChild(iframe);
  document.body.appendChild(wrap);
  document.body.appendChild(btn);

  // ── State ──────────────────────────────────────────────────────────────────
  var isOpen = false;
  var unread = 0;

  // Separate icon elements so badge is never removed from DOM
  var iconChat = document.createElement("span");
  iconChat.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
    "</svg>";
  var iconClose = document.createElement("span");
  iconClose.style.display = "none";
  iconClose.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">' +
      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
    "</svg>";
  // Remove the inline SVG set earlier and use span elements instead
  btn.innerHTML = "";
  btn.appendChild(iconChat);
  btn.appendChild(iconClose);
  btn.appendChild(badge); // re-append badge after clearing innerHTML

  function openWidget() {
    isOpen = true;
    unread = 0;
    badge.style.display = "none";
    badge.textContent = "0";
    wrap.classList.add("yah-open");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add("yah-visible");
      });
    });
    btn.setAttribute("aria-label", "チャットを閉じる");
    iconChat.style.display = "none";
    iconClose.style.display = "";
    iframe.contentWindow &&
      iframe.contentWindow.postMessage({ type: "yah:open" }, BASE_URL);
  }

  function closeWidget() {
    isOpen = false;
    wrap.classList.remove("yah-visible");
    setTimeout(function () {
      wrap.classList.remove("yah-open");
    }, 220);
    btn.setAttribute("aria-label", "チャットサポートを開く");
    iconChat.style.display = "";
    iconClose.style.display = "none";
    if (unread > 0) {
      badge.style.display = "flex";
      badge.textContent = String(unread > 9 ? "9+" : unread);
    }
  }

  btn.addEventListener("click", function () {
    isOpen ? closeWidget() : openWidget();
  });

  // ── postMessage bridge ─────────────────────────────────────────────────────
  window.addEventListener("message", function (event) {
    if (event.origin !== BASE_URL) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "yah:close":
        closeWidget();
        break;
      case "yah:unread":
        if (!isOpen) {
          unread = (data.count || 1);
          badge.textContent = String(unread > 9 ? "9+" : unread);
          badge.style.display = "flex";
        }
        break;
      case "yah:resize":
        if (data.height) {
          wrap.style.height = Math.min(data.height, 640) + "px";
        }
        break;
    }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  window.YahChat = {
    open: openWidget,
    close: closeWidget,
    toggle: function () { isOpen ? closeWidget() : openWidget(); },
  };
})();
