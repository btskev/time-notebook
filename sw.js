/* 时间笔记 · 离线缓存 */
var CACHE = "time-notebook-v6";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./maskable-512.png", "./apple-touch-icon.png", "./screenshot-timeline.png", "./screenshot-stats.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  // 页面本身：网络优先（保证更新立刻生效），断网时用缓存
  var isDoc = e.request.mode === "navigate" || e.request.destination === "document";
  if (isDoc) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) {
          return r || new Response("离线状态，请联网后重试。", { status: 503, headers: { "Content-Type": "text/plain;charset=utf-8" } });
        });
      })
    );
    return;
  }

  // 图标等静态资源：缓存优先
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return new Response("", { status: 503 });
      });
    })
  );
});

