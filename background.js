importScripts("defaults.js");

let cfg = { ...DEFAULTS };
const ready = chrome.storage.local.get("cfg").then(r => {
  cfg = { ...DEFAULTS, ...(r.cfg || {}) };
});

const JUNK = "utm_[a-z_]+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|mc_eid|mc_cid|_hsenc|_hsmi|igshid|twclid|ttclid|li_fat_id|ref_src|spm";

function build(c) {
  const out = [
    {
      id: 1,
      priority: 1,
      action: { type: "upgradeScheme" },
      condition: { urlFilter: "http://", resourceTypes: ["main_frame", "sub_frame"] }
    }
  ];

  if (c.trimReferrer) {
    out.push({
      id: 2,
      priority: 4,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "referer", operation: "remove" }]
      },
      condition: {
        domainType: "thirdParty",
        resourceTypes: [
          "main_frame", "sub_frame", "xmlhttprequest", "script",
          "stylesheet", "image", "font", "media", "object", "other"
        ]
      }
    });
  }

  if (c.stripParams) {
    out.push(
      {
        id: 10,
        priority: 6,
        action: { type: "redirect", redirect: { regexSubstitution: "\\1?\\2\\3" } },
        condition: {
          regexFilter: `^([^?#]*)\\?(?:${JUNK})=[^&#]*&([^#]*)(#.*)?$`,
          isUrlFilterCaseSensitive: false,
          resourceTypes: ["main_frame"]
        }
      },
      {
        id: 11,
        priority: 6,
        action: { type: "redirect", redirect: { regexSubstitution: "\\1\\2\\3" } },
        condition: {
          regexFilter: `^([^?#]*\\?[^#]*?)&(?:${JUNK})=[^&#]*([^#]*)(#.*)?$`,
          isUrlFilterCaseSensitive: false,
          resourceTypes: ["main_frame"]
        }
      },
      {
        id: 12,
        priority: 6,
        action: { type: "redirect", redirect: { regexSubstitution: "\\1\\2" } },
        condition: {
          regexFilter: `^([^?#]*)\\?(?:${JUNK})=[^&#]*(#.*)?$`,
          isUrlFilterCaseSensitive: false,
          resourceTypes: ["main_frame"]
        }
      }
    );
  }

  return out;
}

async function syncRules() {
  await ready;
  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: old.map(r => r.id),
      addRules: build(cfg)
    })
    .catch(e => console.warn("rules", e));
}

async function put(pref, value) {
  if (!pref) return;
  try { await pref.set({ value }); } catch {}
}

async function reset(pref) {
  if (!pref) return;
  try { await pref.clear({}); } catch {}
}

async function prefs() {
  const net = chrome.privacy && chrome.privacy.network;
  const web = chrome.privacy && chrome.privacy.websites;
  if (!net) return;

  if (cfg.hardenBrowser) {
    await put(net.webRTCIPHandlingPolicy, "default_public_interface_only");
    await put(net.networkPredictionEnabled, false);
    await put(web && web.hyperlinkAuditingEnabled, false);
    await put(web && web.thirdPartyCookiesAllowed, false);
  } else {
    await reset(net.webRTCIPHandlingPolicy);
    await reset(net.networkPredictionEnabled);
    await reset(web && web.hyperlinkAuditingEnabled);
    await reset(web && web.thirdPartyCookiesAllowed);
  }
}

const SCRIPT_ID = "umbra-fp";

async function injector() {
  await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});
  if (!cfg.spoof) return;
  await chrome.scripting
    .registerContentScripts([{
      id: SCRIPT_ID,
      matches: ["<all_urls>"],
      js: ["spoof.js"],
      runAt: "document_start",
      allFrames: true,
      world: "MAIN",
      persistAcrossSessions: true
    }])
    .catch(e => console.warn("spoof", e));
}

async function apply() {
  await ready;
  await prefs();
  await syncRules();
  await injector();
}

chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local" || !ch.cfg) return;
  cfg = { ...DEFAULTS, ...(ch.cfg.newValue || {}) };
  apply();
});

chrome.runtime.onStartup.addListener(apply);
chrome.runtime.onInstalled.addListener(apply);
apply();
