(function () {
  "use strict";

  const { findByProps } = vendetta.metro;
  const { instead } = vendetta.patcher;

  // Set to true to log every alert/popup in the debug console
  const DEBUG = false;

  const unpatches = [];

  function flatten(v, depth) {
    depth = depth || 0;
    if (v == null || depth > 5) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (Array.isArray(v)) return v.map(function (x) { return flatten(x, depth + 1); }).join(" ");
    if (typeof v === "object" && v.props) return flatten(v.props.children, depth + 1);
    return "";
  }

  function isDeleteMessagePrompt(props) {
    if (!props) return false;
    const text = [
      flatten(props.title),
      flatten(props.body),
      flatten(props.content),
      flatten(props.confirmText),
    ].join(" ").toLowerCase();
    return text.includes("delete") && text.includes("message");
  }

  function tryConfirm(props) {
    if (isDeleteMessagePrompt(props) && typeof props.onConfirm === "function") {
      try {
        props.onConfirm();
        return true;
      } catch (e) {
        console.error("[FastDelete] confirm failed", e);
      }
    }
    return false;
  }

  function applyPatches() {
    // Old-style alerts: Alerts.show({ title, body, onConfirm })
    try {
      const Alerts = findByProps("show", "close");
      if (Alerts && Alerts.show) {
        unpatches.push(
          instead("show", Alerts, function (args, orig) {
            const props = args && args[0];
            if (DEBUG) console.log("[FastDelete] show:", flatten(props && props.title), "|", flatten(props && props.body));
            if (tryConfirm(props)) return;
            return orig.apply(this, args);
          })
        );
      }
    } catch (e) {
      console.error("[FastDelete] show patch failed", e);
    }

    // New-style alerts: openAlert(key, <AlertModal .../>)
    try {
      const AlertActions = findByProps("openAlert", "dismissAlert");
      if (AlertActions && AlertActions.openAlert) {
        unpatches.push(
          instead("openAlert", AlertActions, function (args, orig) {
            const props = args && args[1] && args[1].props;
            if (DEBUG) console.log("[FastDelete] openAlert:", args && args[0], "|", flatten(props && props.title), "|", flatten(props && props.body));
            if (tryConfirm(props)) return;
            return orig.apply(this, args);
          })
        );
      }
    } catch (e) {
      console.error("[FastDelete] openAlert patch failed", e);
    }
  }

  return {
    default: {
      onLoad: function () {
        applyPatches();
      },
      onUnload: function () {
        unpatches.forEach(function (u) {
          try { u(); } catch (e) {}
        });
        unpatches.length = 0;
      },
    },
    __esModule: true,
  };
})();
