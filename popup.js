(async () => {
  const stored = (await chrome.storage.local.get("cfg")).cfg || {};
  const cfg = { ...DEFAULTS, ...stored };
  const root = document.getElementById("toggles");

  for (const key of Object.keys(DEFAULTS)) {
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !!cfg[key];
    box.addEventListener("change", async () => {
      cfg[key] = box.checked;
      await chrome.storage.local.set({ cfg });
    });
    label.append(box, document.createTextNode(LABELS[key]));
    root.append(label);
  }

  document.getElementById("panic").addEventListener("click", async () => {
    await chrome.browsingData.remove({ since: 0 }, {
      cache: true,
      cacheStorage: true,
      cookies: true,
      fileSystems: true,
      indexedDB: true,
      localStorage: true,
      serviceWorkers: true
    });
    window.close();
  });
})();
