(() => {
  const nativeStr = Function.prototype.toString;
  const faked = new WeakMap();
  const str = function toString() {
    return faked.has(this) ? faked.get(this) : nativeStr.call(this);
  };
  faked.set(str, "function toString() { [native code] }");
  Function.prototype.toString = str;

  function swap(proto, name, make) {
    try {
      const orig = proto[name];
      if (typeof orig !== "function") return;
      const fn = make(orig);
      faked.set(fn, nativeStr.call(orig));
      Object.defineProperty(fn, "name", { value: orig.name });
      Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true });
    } catch {}
  }

  function pin(obj, prop, val) {
    try {
      const desc = Object.getOwnPropertyDescriptor(obj, prop);
      const g = function () { return val; };
      if (desc && desc.get) {
        faked.set(g, nativeStr.call(desc.get));
        Object.defineProperty(g, "name", { value: desc.get.name });
      }
      Object.defineProperty(obj, prop, {
        get: g,
        set: undefined,
        configurable: true,
        enumerable: desc ? desc.enumerable : true
      });
    } catch {}
  }

  pin(Navigator.prototype, "hardwareConcurrency", 4);
  pin(Navigator.prototype, "deviceMemory", 8);
  pin(Navigator.prototype, "language", "en-US");
  pin(Navigator.prototype, "languages", Object.freeze(["en-US", "en"]));

  const S = Screen.prototype;
  pin(S, "width", 1920);
  pin(S, "height", 1080);
  pin(S, "availWidth", 1920);
  pin(S, "availHeight", 1040);
  pin(S, "colorDepth", 24);
  pin(S, "pixelDepth", 24);
  pin(window, "devicePixelRatio", 1);

  const blank = c => {
    const b = document.createElement("canvas");
    b.width = c.width;
    b.height = c.height;
    return b;
  };
  swap(HTMLCanvasElement.prototype, "toDataURL", o =>
    function toDataURL(...a) { return o.apply(blank(this), a); });
  swap(HTMLCanvasElement.prototype, "toBlob", o =>
    function toBlob(...a) { return o.apply(blank(this), a); });
  swap(CanvasRenderingContext2D.prototype, "getImageData", o =>
    function getImageData(...a) {
      const d = o.apply(this, a);
      d.data.fill(0);
      return d;
    });
  if (typeof OffscreenCanvas !== "undefined") {
    swap(OffscreenCanvas.prototype, "convertToBlob", o =>
      function convertToBlob(...a) {
        return o.apply(new OffscreenCanvas(this.width, this.height), a);
      });
  }

  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    swap(C.prototype, "getExtension", o =>
      function getExtension(n) {
        if (String(n).toLowerCase() === "webgl_debug_renderer_info") return null;
        return o.call(this, n);
      });
    swap(C.prototype, "getSupportedExtensions", o =>
      function getSupportedExtensions() {
        const l = o.call(this);
        return l ? l.filter(n => n.toLowerCase() !== "webgl_debug_renderer_info") : l;
      });
  }

  swap(Performance.prototype, "now", o =>
    function now() { return Math.floor(o.call(this) / 100) * 100; });

})();
