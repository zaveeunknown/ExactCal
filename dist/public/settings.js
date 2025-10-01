// public/settings.js
document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("appsScriptUrl");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const okMsg = document.getElementById("okMsg");
  const errMsg = document.getElementById("errMsg");
  const loadingMsg = document.getElementById("loadingMsg");
  const backToCalc = document.getElementById("backToCalc");

  // Load existing config
  try {
    const res = await fetch("/config");
    const json = await res.json();
    if (json.ok && json.sheetUrl) {
      urlInput.value = json.sheetUrl;
    }
  } catch (e) {
    console.error("Config load error:", e);
  }

  // Save handler
  saveBtn.addEventListener("click", async () => {
    okMsg.style.display = "none";
    errMsg.innerText = "";
    try {
      const url = urlInput.value.trim();
      if (!url) return (errMsg.innerText = "❌ Please enter a Web App URL");

      const res = await fetch("/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: url }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      okMsg.style.display = "block";
    } catch (err) {
      errMsg.innerText = "❌ Save failed: " + err.message;
    }
  });

  // Test handler
  testBtn.addEventListener("click", async () => {
    okMsg.style.display = "none";
    errMsg.innerText = "";
    backToCalc.style.display = "none";
    loadingMsg.style.display = "block";

    try {
      const res = await fetch("/metrics");
      const json = await res.json();
      loadingMsg.style.display = "none";

      if (json.ok) {
        backToCalc.style.display = "block";
      } else {
        throw new Error(json.error || "Test failed");
      }
    } catch (err) {
      loadingMsg.style.display = "none";
      errMsg.innerText = "❌ Test failed: " + err.message;
    }
  });
});
