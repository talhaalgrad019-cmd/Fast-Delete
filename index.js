const { findByProps } = vendetta.metro;
const { instead } = vendetta.patcher;

// Flip to true to log every alert in the debug console
const DEBUG = false;

const Alerts = findByProps("show", "close");
const unpatches = [];

const toText = (v) => {
  try {
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
};

const isDeleteMessagePrompt = (props) => {
  const text = [
    toText(props?.title),
    toText(props?.body),
    toText(props?.content),
    toText(props?.confirmText),
  ]
    .join(" ")
    .toLowerCase();

  return text.includes("delete") && text.includes("message");
};

if (Alerts?.show) {
  unpatches.push(
    instead("show", Alerts, (args, orig) => {
      const props = args?.[0];

      if (DEBUG) console.log("[FastDelete] alert:", JSON.stringify(props, null, 2));

      if (props && isDeleteMessagePrompt(props) && typeof props.onConfirm === "function") {
        try {
          props.onConfirm();
          return; // skip the popup
        } catch (e) {
          console.error("[FastDelete] confirm failed", e);
        }
      }

      return orig.apply(Alerts, args);
    })
  );
} else {
  console.error("[FastDelete] Alerts module not found");
}

export const onUnload = () => unpatches.forEach((u) => u());
