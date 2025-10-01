// =========================
// CONFIG — EDIT THESE URLs
// =========================
// Pull API endpoints from the global CONFIG object if present.  When the
// Settings page stores a custom Apps Script URL, it defines window.CONFIG.
// Fallback to reasonable defaults when the object or keys are missing.  This
// prevents confusion between multiple config definitions and allows the
// calculator to work both locally and when served from a backend.
const CONFIG = (window.CONFIG && typeof window.CONFIG === 'object')
  ? {
      METRICS_URL: window.CONFIG.METRICS_URL || '/metrics',
      SAVE_URL: window.CONFIG.SAVE_URL || '/save'
    }
  : { METRICS_URL: '/metrics', SAVE_URL: '/save' };

// =========================
// PRODUCT OPTIONS
// =========================
const productOptions = {
  maMapd: null,
  heartlandHIP: null,
  uhoneHIP: null,
  heartlandCHAS: null,
  heartlandSTHHC: null,
  medSupp: null,
  annuity: null,
  uhoneCritical: [
    { value: "criticalGuardU25", label: "CriticalGuard Under 25k" },
    { value: "criticalGuard25Plus", label: "CriticalGuard 25k+" },
    { value: "criticalIllness", label: "Critical Illness" },
    { value: "criticalLifeSafeGuard", label: "Critical Life SafeGuard (10yr/20yr)" }
  ],
  uhoneDental: [
    { value: "dentalWiseBasic", label: "DentalWise Basic" },
    { value: "dentalWise1000", label: "DentalWise 1000/2000" },
    { value: "dentalWiseMax", label: "DentalWise Max" },
    { value: "dentalGen", label: "Dental Gen" },
    { value: "dentalPrimary", label: "Dental Primary" },
    { value: "dentalPremier", label: "Dental Premier" },
    { value: "advantageGuard", label: "AdvantageGuard" }
  ],
  uhoneVision: [
    { value: "visionStandalone", label: "Vision Standalone" },
    { value: "visionWisePremier", label: "VisionWise Premier" }
  ],
  amAmicable: [
    { value: "expressUL", label: "Express UL (43%)" },
    { value: "platinumSolutions", label: "Platinum Solutions (52%)" },
    { value: "goldenSolutions", label: "Golden Solutions (50%)" },
    { value: "easyTerm", label: "Easy Term (45%)" },
    { value: "homeProtector", label: "Home Protector (54%)" },
    { value: "secureLifePlus", label: "SecureLife Plus (57%)" },
    { value: "securityProtector", label: "Security Protector (45%)" },
    { value: "survivorProtector", label: "Survivor Protector (55%)" },
    { value: "termMadeSimple", label: "Term Made Simple (43%)" }
  ],
  libertyBankers: [
    { value: "t2SimplPref", label: "T2 SIMPL PREF Yr1 (49.99%)" },
    { value: "t2SimplStd", label: "T2 SIMPL STD Yr1 (48.21%)" },
    { value: "modWL", label: "MOD WL Yr1 (32.14%)" },
    { value: "flex4LifeBase", label: "Flex4Life Base Yr1 (42.85%)" },
    { value: "flex4Life10Yr", label: "Flex4Life 10Yr Yr1 (28.57%)" }
  ],
  citizens: [
    { value: "guaranteedIssue", label: "Guaranteed Issue (33.92%)" }
  ]
};

// =========================
// PREMIUM SYNC
// =========================
const monthlyInput = document.getElementById("premium");
const annualInput = document.getElementById("annualPremium");

if (monthlyInput && annualInput) {
  monthlyInput.addEventListener("input", () => {
    const val = parseFloat(monthlyInput.value);
    annualInput.value = !isNaN(val) ? (val * 12).toFixed(2) : "";
  });

  annualInput.addEventListener("input", () => {
    const val = parseFloat(annualInput.value);
    monthlyInput.value = !isNaN(val) ? (val / 12).toFixed(2) : "";
  });
}

// =========================
// COMMISSION ENGINE
// =========================
function getCommission({ plan, product, state, age, monthlyPremium, annualPremium, isAEP }) {
  const annual = annualPremium && annualPremium > 0
    ? annualPremium
    : (monthlyPremium > 0 ? monthlyPremium * 12 : 0);

  const monthly = monthlyPremium && monthlyPremium > 0
    ? monthlyPremium
    : (annual > 0 ? annual / 12 : 0);

  let rate = 0, notes = "", breakdown = "", breakdownHtml = "";
  let advance = 0, earned = 0, monthlyEarned = 0, commission = 0;
  let clawbackRisk = "None";

  // === MA/MAPD ===
  if (plan === "maMapd") {
    commission = isAEP ? 100 : 200;
    advance = commission;
    notes = isAEP
      ? "AEP: $100 on-submit; subject to $100 survival bonus (93-day)."
      : "Standard: $200 on-submit; subject to 93-day clawback.";
    clawbackRisk = "93-day survival clawback";

    breakdown = "Flat payout";
    breakdownHtml = `Flat payout: $${commission.toFixed(2)}`;
  }

  // === UHOne HIP ===
  else if (plan === "uhoneHIP") {
    rate = 0.7325;
    const grossCommission = annual * rate;

    commission = parseFloat((grossCommission * 0.54).toFixed(2));
    advance    = parseFloat((grossCommission * 0.75 * 0.54).toFixed(2));
    earned     = parseFloat((commission - advance).toFixed(2));
    monthlyEarned = parseFloat((earned / 3).toFixed(2));

    breakdown = `Rate: ${(rate * 100).toFixed(2)}%`;
    breakdownHtml = `
      Annual Premium: $${annual.toFixed(2)}<br>
      Rate: ${(rate * 100).toFixed(2)}%<br>
      Gross Commission: $${grossCommission.toFixed(2)}<br>
      Initial Advance (75% × 54%): $${advance.toFixed(2)}<br>
      Earned (Months 10–12): $${earned.toFixed(2)} total<br>
      → $${monthlyEarned.toFixed(2)} each month<br>
      Final Total Commission Paid: $${commission.toFixed(2)}
    `;

    notes = "UHOne HIP: Advance (~month 1), then earned months 10–12 (54% retention).";
    clawbackRisk = "Chargeback if cancelled in first 12 months";
  }

  // === Default (catch-all for other plans until defined) ===
  else {
    notes = "No commission rules defined for this plan yet.";
    breakdown = "N/A";
    breakdownHtml = "No commission calculation available for this plan.";
  }

  return {
    annual,
    monthly,
    commission,
    advance,
    earned,
    monthlyEarned,
    rate,
    breakdown,
    breakdownHtml,
    notes,
    clawbackRisk
  };
}


// =========================
// BONUS ENGINE
// =========================
function getBonusSummary({ isAEP, totalApps, ancillaryAttach, closingRate, placementRate, complianceRate }) {
  let bonusNotes = "";
  let bonusPerApp = 0;
  let survivalBonus = 0;

  if (placementRate < 75 || complianceRate < 85) {
    bonusNotes = "❌ Not eligible (placement < 75% or compliance < 85%).";
    return { bonusPerApp: 0, survivalBonus: 0, bonusNotes };
  }

  if (!isAEP) {
    if (totalApps >= 60 && ancillaryAttach >= 15 && closingRate >= 20) bonusPerApp = 150;
    else if (totalApps >= 40 && ancillaryAttach >= 12 && closingRate >= 18) bonusPerApp = 100;
    else if (totalApps >= 30 && ancillaryAttach >= 8 && closingRate >= 16) bonusPerApp = 50;
    else if (totalApps >= 20 && ancillaryAttach >= 5 && closingRate >= 10) bonusPerApp = 25;
    bonusNotes = `Monthly bonus tier: $${bonusPerApp}/MA-MAPD app.`;
  } else {
    if (totalApps >= 350 && ancillaryAttach >= 20 && closingRate >= 25) bonusPerApp = 200;
    else if (totalApps >= 275 && ancillaryAttach >= 15 && closingRate >= 22) bonusPerApp = 150;
    else if (totalApps >= 200 && ancillaryAttach >= 12 && closingRate >= 18) bonusPerApp = 100;
    else if (totalApps >= 150 && ancillaryAttach >= 8 && closingRate >= 15) bonusPerApp = 75;
    survivalBonus = 100;
    bonusNotes = `AEP bonus tier: $${bonusPerApp}/app + $${survivalBonus} survival bonus.`;
  }

  return { bonusPerApp, survivalBonus, bonusNotes };
}

// =========================
// METRICS LOADER
// =========================
async function loadMetrics() {
  try {
    const res = await fetch(CONFIG.METRICS_URL);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Bad metrics");
    const d = json.data || {};

    const metrics = {
      totalApps: Number(d.totalApps || 0),
      ancillaryAttach: Number(d.ancillaryAttach || 0),
      closingRate: Number(d.closingRate || 0),
      placementRate: Number(d.placementRate || 0),
      complianceRate: Number(d.complianceRate || 0),
    };

    document.getElementById("mTotalApps").textContent = metrics.totalApps;
    document.getElementById("mAttach").textContent = metrics.ancillaryAttach.toFixed(1);
    document.getElementById("mClosing").textContent = metrics.closingRate.toFixed(1);
    document.getElementById("mPlacement").textContent = metrics.placementRate.toFixed(1);
    document.getElementById("mCompliance").textContent = metrics.complianceRate.toFixed(1);

    return metrics;
  } catch (err) {
    console.error("Metrics load failed", err);
    return { totalApps: 0, ancillaryAttach: 0, closingRate: 0, placementRate: 0, complianceRate: 0 };
  }
}

// =========================
// UI HOOKUP
// =========================
const planSelect = document.getElementById("plan");
const productSelect = document.getElementById("product");
const resultBox = document.getElementById("result");
let lastData = null;

function updateProductOptions() {
  const plan = planSelect.value;
  productSelect.innerHTML = "";
  if (Array.isArray(productOptions[plan])) {
    productOptions[plan].forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.value;
      opt.textContent = p.label;
      productSelect.appendChild(opt);
    });
    productSelect.disabled = false;
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Not required";
    productSelect.appendChild(opt);
    productSelect.disabled = true;
  }
}
if (planSelect) planSelect.addEventListener("change", updateProductOptions);

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) btn.classList.add("loading");
  else btn.classList.remove("loading");
}

// =========================
// CALCULATE
// =========================
document.getElementById("calculate")?.addEventListener("click", async () => {
  const calcBtn = document.getElementById("calculate");
  setLoading(calcBtn, true);
  try {
    const plan = planSelect.value;
    const product = productSelect.disabled ? "" : productSelect.value;
    const state = document.getElementById("state").value.toUpperCase();
    const age = parseInt(document.getElementById("age").value, 10);
    const monthlyPremium = parseFloat(document.getElementById("premium").value);
    const annualPremium = parseFloat(document.getElementById("annualPremium").value);
    const effectiveDate = document.getElementById("effective").value;
    const dateSubmitted = document.getElementById("dateSubmitted").value;
    const isAEP = document.getElementById("isAEP").checked;

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const mbi = document.getElementById("mbi").value.trim();

    if (!plan) return resultBox.innerHTML = "<b>Please choose a plan type.</b>";
    if (!state) return resultBox.innerHTML = "<b>Please choose a state.</b>";
    if (isNaN(age) || age <= 0) return resultBox.innerHTML = "<b>Invalid age.</b>";
    if ((isNaN(monthlyPremium) || monthlyPremium <= 0) && (isNaN(annualPremium) || annualPremium <= 0)) {
      return resultBox.innerHTML = "<b>Enter a valid premium.</b>";
    }

    const res = getCommission({ plan, product, state, age, monthlyPremium, annualPremium, isAEP });
    const metrics = await loadMetrics();
    const bonusRes = getBonusSummary({ isAEP, ...metrics });

    // Populate the results box.  Wrap in a template literal for clarity.
    resultBox.innerHTML = `
  <h3>Commission Breakdown</h3>
  <b>Client:</b> ${fullName || 'N/A'}<br>
  <b>Phone:</b> ${phone || 'N/A'}<br>
  <b>Plan:</b> ${planSelect.options[planSelect.selectedIndex].text}<br>
  Annual Premium: $${res.annual.toFixed(2)}<br>
  <strong>Total Commission: $${res.commission.toFixed(2)}</strong><br>
  <em>Clawback Risk: ${res.clawbackRisk}</em><br>
  <br><u>Details</u><br>
  ${res.breakdownHtml}<br>
  <em>${res.notes}</em><br>
`;
    // Make the results visible if they were hidden by CSS.  The base
    // styles set opacity:0 on the .result element.  Setting the inline
    // opacity to 1 forces it to fade in immediately.
    resultBox.style.opacity = '1';

    lastData = {
      fullName, phone, mbi,
      dateSubmitted, effectiveDate,
      plan, product, state, age,
      premium: monthlyPremium,
      annualPremium: res.annual,
      commission: res.commission,
      advance: res.advance,
      earned: res.earned,
      monthlyEarned: res.monthlyEarned,
      breakdown: res.breakdown, // plain for sheets
      notes: res.notes,
      clawbackRisk: res.clawbackRisk,
      bonusPerApp: bonusRes.bonusPerApp,
      survivalBonus: bonusRes.survivalBonus,
      bonusNotes: bonusRes.bonusNotes
    };

    document.getElementById("send").style.display = "block";
  } finally {
    setLoading(calcBtn, false);
  }
});

// =========================
// SEND TO SHEET
// =========================
document.getElementById("send")?.addEventListener("click", async () => {
  const sendBtn = document.getElementById("send");
  setLoading(sendBtn, true);
  try {
    if (!lastData) return alert("Please calculate first.");
    const res = await fetch(CONFIG.SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastData)
    });
    await res.json();
    alert("✅ Saved to Google Sheet!");
    sendBtn.style.display = "none";
    document.getElementById("clear").style.display = "inline-block";
  } catch (err) {
    console.error("Save failed", err);
    alert("❌ Save failed.");
  } finally {
    setLoading(sendBtn, false);
  }
});

// =========================
// CLEAR CALCULATOR
// =========================
document.getElementById("clear")?.addEventListener("click", () => {
  ["fullName","phone","mbi","dateSubmitted","effective","age","premium","annualPremium"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value="";
  });
  document.getElementById("plan").selectedIndex=0;
  document.getElementById("product").innerHTML="<option>Not required</option>";
  document.getElementById("product").disabled=true;
  document.getElementById("state").selectedIndex=0;
  document.getElementById("isAEP").checked=false;
  resultBox.innerHTML="";
  // Hide the result when clearing the form
  resultBox.style.opacity = '0';
  document.getElementById("send").style.display="none";
  document.getElementById("clear").style.display="none";
});

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", async () => {
  updateProductOptions();
  await loadMetrics();
});
