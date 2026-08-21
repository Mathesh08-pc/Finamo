import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";
import {
  LayoutDashboard, Receipt, Target, Sparkles, MessageSquare, Shield, Plus,
  TrendingUp, TrendingDown, AlertTriangle, Check, X, Send, RotateCcw, Wallet, Repeat,
  Umbrella, Landmark, RefreshCw, Lock, Zap, HeartPulse, Bike, Smartphone, Briefcase, Loader, Search
} from "lucide-react";

/* ============================================================
   FINAMO — Personal Finance Coach
   Palette sourced from Indian banknote denominations.
   ============================================================ */

const C = {
  bg: "#F3F2F7",
  card: "#FFFFFF",
  ink: "#191830",
  muted: "#6E6C8A",
  faint: "#9C9AB4",
  line: "#E3E1EC",
  accent: "#5B41C9",
  accentSoft: "#EEEAFB",
  good: "#128C6E",
  goodSoft: "#E2F3EE",
  bad: "#D64545",
  badSoft: "#FBEAEA",
  gold: "#F0A02A",
};

const CAT_COLOR = {
  "Rent": "#6B7280",
  "Food & Dining": "#F0A02A",
  "Groceries": "#A8C43A",
  "Transport": "#2E9BD6",
  "Subscriptions": "#7C5CD6",
  "Shopping": "#D6467A",
  "Utilities": "#8B5E3C",
  "Health & Fitness": "#128C6E",
  "Entertainment": "#E0654A",
  "Education": "#C2703D",
  "Family": "#5D7CA6",
  "Loans & EMIs": "#4A4A6A",
  "Insurance": "#1F6F8B",
  "Investments": "#3D3B8E",
  "Income": "#128C6E",
};

const inr = (n) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
const inrShort = (n) => {
  if (Math.abs(n) >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
  if (Math.abs(n) >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (Math.abs(n) >= 1000) return "₹" + (n / 1000).toFixed(1) + "k";
  return "₹" + Math.round(n);
};

/* ---------- deterministic seed data ---------- */
function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const FIXED = [
  { merchant: "Salary — LMES Academy", category: "Income", amount: 92000, day: 1, type: "in" },
  { merchant: "Rent — Anna Nagar", category: "Rent", amount: 18000, day: 2, type: "out" },
  { merchant: "SIP — Nifty 50 Index", category: "Investments", amount: 10000, day: 5, type: "out" },
  { merchant: "Star Health Insurance", category: "Insurance", amount: 1180, day: 4, type: "out" },
  { merchant: "ACKO Bike Insurance", category: "Insurance", amount: 340, day: 11, type: "out" },
  { merchant: "TNEB Electricity", category: "Utilities", amount: 1420, day: 6, type: "out", jitter: 260 },
  { merchant: "Airtel Fiber", category: "Utilities", amount: 799, day: 7, type: "out" },
  { merchant: "Spotify Premium", category: "Subscriptions", amount: 119, day: 3, type: "out" },
  { merchant: "ChatGPT Plus", category: "Subscriptions", amount: 1950, day: 9, type: "out" },
  { merchant: "Netflix", category: "Subscriptions", amount: 649, day: 12, type: "out" },
  { merchant: "Cult.fit Membership", category: "Health & Fitness", amount: 1499, day: 15, type: "out" },
  { merchant: "Adobe Creative Cloud", category: "Subscriptions", amount: 1675, day: 18, type: "out" },
  { merchant: "Amazon Prime", category: "Subscriptions", amount: 179, day: 20, type: "out" },
];

const VARIABLE = [
  { merchant: "Swiggy", category: "Food & Dining", min: 240, max: 760, n: 9, weekend: true },
  { merchant: "Zomato", category: "Food & Dining", min: 200, max: 640, n: 5, weekend: true },
  { merchant: "Starbucks — Phoenix Mall", category: "Food & Dining", min: 320, max: 580, n: 3, weekend: true },
  { merchant: "Blinkit", category: "Groceries", min: 180, max: 940, n: 6 },
  { merchant: "Ola Cabs", category: "Transport", min: 95, max: 390, n: 7, weekend: true },
  { merchant: "Indian Oil Petrol", category: "Transport", min: 300, max: 620, n: 3 },
  { merchant: "Amazon.in", category: "Shopping", min: 350, max: 4200, n: 4 },
  { merchant: "PVR Cinemas", category: "Entertainment", min: 420, max: 980, n: 1, weekend: true },
  { merchant: "Decathlon", category: "Shopping", min: 900, max: 2400, n: 1 },
  { merchant: "Apollo Pharmacy", category: "Health & Fitness", min: 210, max: 780, n: 1 },
];

const MONTHS = [
  { key: "2026-06", label: "Jun", days: 30 },
  { key: "2026-07", label: "Jul", days: 31 },
  { key: "2026-08", label: "Aug", days: 21 }, // current month, partial
];

function buildSeed() {
  const rand = lcg(20260821);
  const txns = [];
  let id = 1;
  MONTHS.forEach((m, mi) => {
    FIXED.forEach((f) => {
      if (f.day > m.days) return;
      const jitter = f.jitter ? Math.round((rand() - 0.5) * f.jitter) : 0;
      txns.push({
        id: id++,
        date: `${m.key}-${String(f.day).padStart(2, "0")}`,
        merchant: f.merchant,
        category: f.category,
        amount: f.amount + jitter,
        type: f.type,
        source: "fixed",
      });
    });
    VARIABLE.forEach((v) => {
      const count = Math.max(1, Math.round(v.n * (m.days / 31)) + (mi === 1 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        let day = 1 + Math.floor(rand() * m.days);
        if (v.weekend) {
          const dow = new Date(`${m.key}-${String(day).padStart(2, "0")}T00:00:00`).getDay();
          if (dow !== 0 && dow !== 6 && rand() < 0.65) {
            day = Math.min(m.days, day + ((6 - dow + 7) % 7));
          }
        }
        txns.push({
          id: id++,
          date: `${m.key}-${String(day).padStart(2, "0")}`,
          merchant: v.merchant,
          category: v.category,
          amount: Math.round(v.min + rand() * (v.max - v.min)),
          type: "out",
          source: "variable",
        });
      }
    });
  });
  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}

const SEED_TXNS = buildSeed();

const ASSETS = [
  { name: "Savings account", value: 145000 },
  { name: "Mutual funds", value: 88400 },
  { name: "EPF", value: 62000 },
];
const LIABILITIES = [
  { name: "Credit card", value: 18500, apr: 42, minimum: 1500 },
  { name: "Bike loan", value: 42000, apr: 11, minimum: 3500 },
];

const ACCOUNTS = [
  { name: "Savings account", bank: "Finamo Demo Bank", mask: "4821", value: 145000, kind: "asset", icon: Landmark },
  { name: "Credit card", bank: "Finamo Demo Bank", mask: "9012", value: -18500, kind: "debt", icon: Receipt },
  { name: "Mutual funds", bank: "Groww", mask: "SIP", value: 88400, kind: "asset", icon: TrendingUp },
  { name: "Provident fund", bank: "EPFO", mask: "PF", value: 62000, kind: "asset", icon: Lock },
  { name: "Bike loan", bank: "Finamo Demo Bank", mask: "3374", value: -42000, kind: "debt", icon: Bike },
];

const BANKS = ["Finamo Demo Bank", "HDFC Bank", "ICICI Bank", "State Bank of India", "Kotak Mahindra", "Axis Bank"];

const POLICIES = [
  {
    id: "health", name: "Star Health — Family Optima", type: "Health cover", icon: HeartPulse,
    cover: 500000, premium: 1180, renews: "14 Mar 2027", held: true,
    note: "Covers hospitalisation after a 24-hour admission. ₹5L is thin for Chennai — one ICU week at a private hospital runs ₹4–6L.",
  },
  {
    id: "bike", name: "ACKO — Two-wheeler", type: "Vehicle cover", icon: Bike,
    cover: 85000, premium: 340, renews: "22 Nov 2026", held: true,
    note: "Own damage plus third-party. ₹1,500 deductible on every claim.",
  },
  {
    id: "term", name: "Term life cover", type: "Life cover", icon: Umbrella,
    cover: 0, recommend: 11000000, premium: 0, estPremium: 950, held: false,
    note: "Nobody depends on your income today — but the moment someone does, this is the cheapest it will ever be. At 27, ₹1.1Cr costs roughly ₹950 a month, locked for 30 years.",
  },
  {
    id: "pa", name: "Personal accident cover", type: "Income protection", icon: Zap,
    cover: 0, recommend: 1500000, premium: 0, estPremium: 110, held: false,
    note: "Pays out if an accident stops you working. You ride daily — this is the gap that actually matches your life.",
  },
];

const SHOCKS = [
  { id: "job", label: "You lose your job", icon: Briefcase, cost: 0, covered: 0, kind: "income",
    detail: "No salary lands. Rent, EMIs, groceries and premiums keep going out." },
  { id: "hosp", label: "Hospitalised for a week", icon: HeartPulse, cost: 250000, covered: 225000,
    detail: "Star Health settles ₹2.25L. You pay the co-pay, room-rent gap and the pharmacy bills." },
  { id: "phone", label: "Phone stolen", icon: Smartphone, cost: 79000, covered: 0,
    detail: "No device cover. This one lands entirely on your savings." },
  { id: "bike", label: "Bike accident repair", icon: Bike, cost: 18000, covered: 16500,
    detail: "ACKO covers the damage minus the ₹1,500 deductible." },
];

/* ---------- expense catalogue for onboarding ---------- */
const GROUPS = {
  "Home & bills": { rate: 7.0, cat: "Utilities" },
  "Food": { rate: 6.5, cat: "Food & Dining" },
  "Transport": { rate: 5.5, cat: "Transport" },
  "Subscriptions & OTT": { rate: 9.0, cat: "Subscriptions" },
  "Health": { rate: 12.0, cat: "Health & Fitness" },
  "Family & education": { rate: 10.0, cat: "Education" },
  "Personal care": { rate: 6.0, cat: "Shopping" },
  "Lifestyle": { rate: 7.0, cat: "Entertainment" },
  "Money & EMIs": { rate: 0, cat: "Loans & EMIs" },
  "Work & learning": { rate: 6.0, cat: "Shopping" },
};

const CATALOG = [
  ["Rent", "Home & bills", 18000, 1], ["Home loan EMI", "Home & bills", 22000, 1],
  ["Flat maintenance", "Home & bills", 2500, 1], ["Electricity", "Home & bills", 1400, 1],
  ["Water", "Home & bills", 400, 1], ["Cooking gas", "Home & bills", 950, 1],
  ["Broadband / wifi", "Home & bills", 799, 1], ["Mobile recharge", "Home & bills", 349, 1],
  ["DTH / cable", "Home & bills", 400, 0], ["House help", "Home & bills", 2500, 0],
  ["Property tax", "Home & bills", 700, 1],

  ["Groceries", "Food", 6000, 1], ["Milk & dairy", "Food", 1200, 1],
  ["Food delivery", "Food", 4000, 0], ["Eating out", "Food", 3000, 0],
  ["Office lunch / mess", "Food", 2500, 0], ["Tea & coffee runs", "Food", 900, 0],

  ["Petrol / diesel", "Transport", 3000, 1], ["Bus pass", "Transport", 700, 1],
  ["Metro pass", "Transport", 1200, 1], ["Cab & auto rides", "Transport", 2200, 0],
  ["Vehicle EMI", "Transport", 3500, 1], ["Vehicle servicing", "Transport", 800, 1],
  ["Parking", "Transport", 500, 0], ["FASTag / tolls", "Transport", 600, 0],
  ["Train / bus travel home", "Transport", 1200, 0],

  ["Netflix", "Subscriptions & OTT", 649, 0], ["Amazon Prime", "Subscriptions & OTT", 179, 0],
  ["JioHotstar", "Subscriptions & OTT", 299, 0], ["Spotify", "Subscriptions & OTT", 119, 0],
  ["YouTube Premium", "Subscriptions & OTT", 149, 0], ["Sun NXT / regional OTT", "Subscriptions & OTT", 130, 0],
  ["AI tools (ChatGPT, Claude)", "Subscriptions & OTT", 1950, 0],
  ["Design / software tools", "Subscriptions & OTT", 1675, 0],
  ["Cloud storage", "Subscriptions & OTT", 130, 0], ["Gaming", "Subscriptions & OTT", 500, 0],

  ["Health insurance", "Health", 1180, 1], ["Gym / fitness", "Health", 1499, 0],
  ["Medicines", "Health", 600, 1], ["Doctor visits", "Health", 500, 1],
  ["Supplements", "Health", 900, 0], ["Therapy / counselling", "Health", 2000, 0],

  ["School fees", "Family & education", 6000, 1], ["College fees", "Family & education", 12000, 1],
  ["Tuition / coaching", "Family & education", 3000, 1], ["Kids activities", "Family & education", 1500, 0],
  ["Childcare / creche", "Family & education", 5000, 1], ["Money sent to parents", "Family & education", 8000, 1],

  ["Clothing", "Personal care", 1500, 0], ["Salon / grooming", "Personal care", 800, 0],
  ["Skincare & cosmetics", "Personal care", 700, 0], ["Laundry / ironing", "Personal care", 400, 0],

  ["Movies", "Lifestyle", 600, 0], ["Events & concerts", "Lifestyle", 1000, 0],
  ["Weekend outings", "Lifestyle", 2000, 0], ["Travel & trips", "Lifestyle", 3000, 0],
  ["Hobbies", "Lifestyle", 1200, 0], ["Gifts & functions", "Lifestyle", 1500, 0],
  ["Pet care", "Lifestyle", 1800, 0], ["Temple / donations", "Lifestyle", 500, 0],

  ["SIP / mutual funds", "Money & EMIs", 10000, 1], ["Term insurance", "Money & EMIs", 950, 1],
  ["Credit card bill", "Money & EMIs", 4000, 1], ["Personal loan EMI", "Money & EMIs", 5000, 1],
  ["Chit fund / RD", "Money & EMIs", 3000, 1], ["Education loan EMI", "Money & EMIs", 7000, 1],

  ["Coworking desk", "Work & learning", 4000, 0], ["Online courses", "Work & learning", 1000, 0],
  ["Books", "Work & learning", 500, 0], ["Domain & hosting", "Work & learning", 600, 0],
].map(([name, group, amount, essential]) => ({ name, group, amount, essential: !!essential }));

const SHOCK_LINES = [
  ["Surge fares when it rains or you're late", 800],
  ["Annual price hikes landing mid-year", 700],
  ["Medical co-pay, dental, spectacles", 900],
  ["Phone screen, laptop, vehicle repairs", 1100],
  ["Weddings, gifts, family functions", 1400],
];

const INFLATION_MOVES = [
  { t: "Move the emergency fund out of savings", d: "A savings account pays about 3%. Inflation runs near 6%. Parking ₹1.45L there loses roughly ₹4,400 of buying power a year. A liquid fund or sweep-in FD pays 6–7% and still reaches you in a day.", n: "≈ ₹5,000/yr recovered" },
  { t: "Step your SIP up 10% every year", d: "A flat ₹10,000 SIP is worth about ₹7,400 in today's money after five years. Increasing it each year alongside your appraisal keeps the real contribution level.", n: "Set it once, it's automatic" },
  { t: "Pay the costs that hike annually, annually", d: "OTT and insurance premiums rise about 9% a year. Annual plans lock this year's price and usually shave 15–20% off the monthly rate.", n: "≈ ₹3,800/yr saved" },
  { t: "Keep equity for anything past five years", d: "Debt instruments barely clear inflation after tax. Goals more than five years out — the Japan trip, a flat deposit — need equity exposure to grow in real terms, with the volatility that comes with it.", n: "Real growth, not nominal" },
  { t: "Diarise the rent conversation", d: "Chennai landlords default to a 10% annual hike. Raising it yourself two months before renewal, with comparable listings in hand, typically lands at 5–6%.", n: "≈ ₹8,600/yr on ₹18k rent" },
  { t: "Audit subscriptions twice a year", d: "Subscription prices climb faster than general inflation and nobody notices, because the charge already has permission to repeat.", n: "Diary reminder, Jan and Jul" },
];

/* ---------- turning picked expenses into a real transaction history ---------- */
const MODEL = {
  "Rent": { cat: "Rent", m: ["Rent — landlord"], fixed: 1, day: 2 },
  "Home loan EMI": { cat: "Rent", m: ["Home loan EMI"], fixed: 1, day: 5 },
  "Flat maintenance": { cat: "Utilities", m: ["Flat maintenance"], fixed: 1, day: 5 },
  "Electricity": { cat: "Utilities", m: ["TNEB Electricity"], fixed: 1, day: 6, jitter: 280 },
  "Water": { cat: "Utilities", m: ["Metro Water"], fixed: 1, day: 6 },
  "Cooking gas": { cat: "Utilities", m: ["Indane Gas"], fixed: 1, day: 8 },
  "Broadband / wifi": { cat: "Utilities", m: ["Airtel Fiber"], fixed: 1, day: 7 },
  "Mobile recharge": { cat: "Utilities", m: ["Jio Recharge"], fixed: 1, day: 14 },
  "DTH / cable": { cat: "Utilities", m: ["Tata Play"], fixed: 1, day: 10 },
  "House help": { cat: "Utilities", m: ["House help"], fixed: 1, day: 1 },
  "Property tax": { cat: "Utilities", m: ["Property tax"], fixed: 1, day: 12 },

  "Groceries": { cat: "Groceries", m: ["Blinkit", "Zepto", "Nilgiris"], n: 6 },
  "Milk & dairy": { cat: "Groceries", m: ["Aavin Milk"], n: 4 },
  "Food delivery": { cat: "Food & Dining", m: ["Swiggy", "Zomato"], n: 9, weekend: 1 },
  "Eating out": { cat: "Food & Dining", m: ["Saravana Bhavan", "Buhari Hotel", "Absolute Barbecue"], n: 4, weekend: 1 },
  "Office lunch / mess": { cat: "Food & Dining", m: ["Office canteen"], n: 12 },
  "Tea & coffee runs": { cat: "Food & Dining", m: ["Chai Kings", "Starbucks — Phoenix Mall"], n: 6, weekend: 1 },

  "Petrol / diesel": { cat: "Transport", m: ["Indian Oil", "HP Petrol"], n: 3 },
  "Bus pass": { cat: "Transport", m: ["MTC Bus Pass"], fixed: 1, day: 1 },
  "Metro pass": { cat: "Transport", m: ["Chennai Metro Pass"], fixed: 1, day: 1 },
  "Cab & auto rides": { cat: "Transport", m: ["Ola Cabs", "Uber", "Rapido"], n: 8, weekend: 1 },
  "Vehicle EMI": { cat: "Loans & EMIs", m: ["Vehicle loan EMI"], fixed: 1, day: 5 },
  "Vehicle servicing": { cat: "Transport", m: ["Service centre"], n: 1 },
  "Parking": { cat: "Transport", m: ["Parking"], n: 4 },
  "FASTag / tolls": { cat: "Transport", m: ["FASTag recharge"], n: 2 },
  "Train / bus travel home": { cat: "Transport", m: ["IRCTC"], n: 1 },

  "Netflix": { cat: "Subscriptions", m: ["Netflix"], fixed: 1, day: 12 },
  "Amazon Prime": { cat: "Subscriptions", m: ["Amazon Prime"], fixed: 1, day: 20 },
  "JioHotstar": { cat: "Subscriptions", m: ["JioHotstar"], fixed: 1, day: 16 },
  "Spotify": { cat: "Subscriptions", m: ["Spotify Premium"], fixed: 1, day: 3 },
  "YouTube Premium": { cat: "Subscriptions", m: ["YouTube Premium"], fixed: 1, day: 22 },
  "Sun NXT / regional OTT": { cat: "Subscriptions", m: ["Sun NXT"], fixed: 1, day: 8 },
  "AI tools (ChatGPT, Claude)": { cat: "Subscriptions", m: ["ChatGPT Plus"], fixed: 1, day: 9 },
  "Design / software tools": { cat: "Subscriptions", m: ["Adobe Creative Cloud"], fixed: 1, day: 18 },
  "Cloud storage": { cat: "Subscriptions", m: ["Google One"], fixed: 1, day: 25 },
  "Gaming": { cat: "Entertainment", m: ["Steam"], n: 2 },

  "Health insurance": { cat: "Insurance", m: ["Star Health Insurance"], fixed: 1, day: 4 },
  "Gym / fitness": { cat: "Health & Fitness", m: ["Cult.fit Membership"], fixed: 1, day: 15 },
  "Medicines": { cat: "Health & Fitness", m: ["Apollo Pharmacy"], n: 2 },
  "Doctor visits": { cat: "Health & Fitness", m: ["Clinic consultation"], n: 1 },
  "Supplements": { cat: "Health & Fitness", m: ["HealthKart"], n: 1 },
  "Therapy / counselling": { cat: "Health & Fitness", m: ["Therapy session"], n: 2 },

  "Money sent to parents": { cat: "Family", m: ["Sent to Amma"], fixed: 1, day: 3 },

  "Clothing": { cat: "Shopping", m: ["Myntra", "Zudio"], n: 2 },
  "Salon / grooming": { cat: "Shopping", m: ["Salon"], n: 2 },
  "Skincare & cosmetics": { cat: "Shopping", m: ["Nykaa"], n: 1 },
  "Laundry / ironing": { cat: "Shopping", m: ["Laundry"], n: 4 },

  "Movies": { cat: "Entertainment", m: ["PVR Cinemas", "BookMyShow"], n: 1, weekend: 1 },
  "Events & concerts": { cat: "Entertainment", m: ["BookMyShow"], n: 1, weekend: 1 },
  "Weekend outings": { cat: "Entertainment", m: ["Phoenix Mall", "Marina outing"], n: 3, weekend: 1 },
  "Travel & trips": { cat: "Entertainment", m: ["MakeMyTrip", "IRCTC"], n: 1 },
  "Hobbies": { cat: "Shopping", m: ["Hobby spend"], n: 2 },
  "Gifts & functions": { cat: "Shopping", m: ["Gift / function"], n: 1, weekend: 1 },
  "Pet care": { cat: "Shopping", m: ["Heads Up For Tails"], n: 2 },
  "Temple / donations": { cat: "Shopping", m: ["Temple hundi"], n: 2 },

  "SIP / mutual funds": { cat: "Investments", m: ["SIP — Nifty 50 Index"], fixed: 1, day: 5 },
  "Term insurance": { cat: "Insurance", m: ["Term life premium"], fixed: 1, day: 4 },
  "Credit card bill": { cat: "Loans & EMIs", m: ["Credit card payment"], fixed: 1, day: 17 },
  "Personal loan EMI": { cat: "Loans & EMIs", m: ["Personal loan EMI"], fixed: 1, day: 5 },
  "Chit fund / RD": { cat: "Investments", m: ["Recurring deposit"], fixed: 1, day: 10 },
  "Education loan EMI": { cat: "Loans & EMIs", m: ["Education loan EMI"], fixed: 1, day: 5 },

  "Coworking desk": { cat: "Shopping", m: ["Coworking desk"], fixed: 1, day: 1 },
  "Online courses": { cat: "Shopping", m: ["Udemy"], n: 1 },
  "Books": { cat: "Shopping", m: ["Bookstore"], n: 1 },
  "Domain & hosting": { cat: "Subscriptions", m: ["Hostinger"], fixed: 1, day: 21 },
};

const FIXED_GROUPS = ["Home & bills", "Subscriptions & OTT", "Money & EMIs", "Family & education"];

function modelFor(item) {
  if (MODEL[item.name]) return MODEL[item.name];
  return {
    cat: GROUPS[item.group]?.cat || "Shopping",
    m: [item.name],
    fixed: FIXED_GROUPS.includes(item.group) ? 1 : 0,
    day: 10,
    n: 3,
  };
}

const pad = (d) => String(d).padStart(2, "0");

function buildFromPlan(plan) {
  const rand = lcg(20260821);
  const txns = [];
  let id = 1;
  MONTHS.forEach((m) => {
    txns.push({ id: id++, date: `${m.key}-01`, merchant: "Salary credited", category: "Income", amount: plan.income, type: "in", source: "fixed" });

    plan.items.forEach((item) => {
      const mo = modelFor(item);
      if (mo.fixed) {
        const day = Math.min(mo.day || 10, m.days);
        const jit = mo.jitter ? Math.round((rand() - 0.5) * mo.jitter) : 0;
        txns.push({ id: id++, date: `${m.key}-${pad(day)}`, merchant: mo.m[0], category: mo.cat, amount: Math.max(1, item.amount + jit), type: "out", source: "fixed" });
        return;
      }
      const n = Math.max(1, Math.round((mo.n || 3) * (m.days / 31)));
      const total = item.amount * (m.days / 31);
      const w = [];
      let sum = 0;
      for (let i = 0; i < n; i++) { const v = 0.55 + rand(); w.push(v); sum += v; }
      for (let i = 0; i < n; i++) {
        let day = 1 + Math.floor(rand() * m.days);
        if (mo.weekend) {
          const dow = new Date(`${m.key}-${pad(day)}T00:00:00`).getDay();
          if (dow !== 0 && dow !== 6 && rand() < 0.62) day = Math.min(m.days, day + ((6 - dow + 7) % 7));
        }
        const amt = Math.max(10, Math.round((total * w[i]) / sum / 10) * 10);
        txns.push({ id: id++, date: `${m.key}-${pad(day)}`, merchant: mo.m[i % mo.m.length], category: mo.cat, amount: amt, type: "out", source: "variable" });
      }
    });
  });
  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* accounts, debts and policies inferred from what the person picked */
function deriveFromPlan(plan) {
  const find = (n) => plan.items.find((i) => i.name === n);
  const income = plan.income;
  const savings = Math.round((income * 1.6) / 1000) * 1000;

  const accounts = [{ name: "Savings account", bank: "Finamo Demo Bank", mask: "4821", value: savings, kind: "asset", icon: Landmark }];

  const sip = find("SIP / mutual funds") || find("Chit fund / RD");
  if (sip) accounts.push({ name: sip.name.includes("SIP") ? "Mutual funds" : "Recurring deposit", bank: sip.name.includes("SIP") ? "Groww" : "Finamo Demo Bank", mask: "INV", value: Math.round((sip.amount * 8.8) / 1000) * 1000, kind: "asset", icon: TrendingUp });

  accounts.push({ name: "Provident fund", bank: "EPFO", mask: "PF", value: Math.round((income * 0.68) / 1000) * 1000, kind: "asset", icon: Lock });

  const debts = [];
  const cc = find("Credit card bill");
  if (cc) debts.push({ name: "Credit card", bank: "Finamo Demo Bank", mask: "9012", value: -Math.round((cc.amount * 4.6) / 100) * 100, apr: 42, minimum: Math.round(cc.amount * 0.38), icon: Receipt });
  const veh = find("Vehicle EMI");
  if (veh) debts.push({ name: "Vehicle loan", bank: "Finamo Demo Bank", mask: "3374", value: -Math.round((veh.amount * 12) / 100) * 100, apr: 11, minimum: veh.amount, icon: Bike });
  const pl = find("Personal loan EMI");
  if (pl) debts.push({ name: "Personal loan", bank: "Finamo Demo Bank", mask: "5510", value: -Math.round((pl.amount * 14) / 100) * 100, apr: 15, minimum: pl.amount, icon: Briefcase });
  const el = find("Education loan EMI");
  if (el) debts.push({ name: "Education loan", bank: "Finamo Demo Bank", mask: "7729", value: -Math.round((el.amount * 30) / 100) * 100, apr: 9, minimum: el.amount, icon: Lock });

  debts.forEach((d) => accounts.push({ ...d, kind: "debt" }));

  const policies = POLICIES.map((p) => {
    if (p.id === "health") { const h = find("Health insurance"); return h ? { ...p, held: true, premium: h.amount } : { ...p, held: false, recommend: 1000000, estPremium: Math.max(900, Math.round(income * 0.014)) }; }
    if (p.id === "term") { const t = find("Term insurance"); return t ? { ...p, held: true, cover: 11000000, premium: t.amount, renews: "09 Jan 2027" } : p; }
    if (p.id === "bike") return veh || find("Vehicle servicing") || find("Petrol / diesel") ? { ...p, held: true } : { ...p, held: false, recommend: 85000, estPremium: 340, note: "You don't have a vehicle on file, so this may not apply to you." };
    return p;
  });

  return { accounts, debts, policies, savings };
}

const USAGE = {
  "Adobe Creative Cloud": "barely used",
  "Netflix": "used twice last month",
  "Cult.fit Membership": "3 check-ins in 60 days",
  "ChatGPT Plus": "used daily",
  "Spotify Premium": "used daily",
  "Amazon Prime": "used weekly",
  "JioHotstar": "barely used since the season ended",
  "YouTube Premium": "used daily",
  "Sun NXT": "used twice last month",
  "Google One": "storage is 40% full",
  "Star Health Insurance": "essential cover",
  "Term life premium": "essential cover",
  "ACKO Bike Insurance": "essential cover",
  "Rent — landlord": "essential",
  "Airtel Fiber": "used daily",
  "Hostinger": "hosting your site",
};

const KEYWORD_RULES = [
  [/swiggy|zomato|starbucks|dominos|cafe|restaurant|hotel|biryani/i, "Food & Dining"],
  [/blinkit|zepto|bigbasket|grocer|dmart|supermarket|instamart/i, "Groceries"],
  [/rent|landlord/i, "Rent"],
  [/ola|uber|petrol|diesel|metro|bus|rapido|fuel|irctc/i, "Transport"],
  [/netflix|spotify|prime|adobe|chatgpt|hotstar|subscription|figma|canva/i, "Subscriptions"],
  [/amazon|flipkart|myntra|decathlon|ajio|nykaa|store/i, "Shopping"],
  [/electricity|tneb|airtel|jio|water|gas|broadband|recharge/i, "Utilities"],
  [/insurance|premium|policy|\blic\b|acko|policybazaar|term plan/i, "Insurance"],
  [/pharmacy|apollo|hospital|cult|gym|doctor|clinic|medic/i, "Health & Fitness"],
  [/pvr|inox|bookmyshow|cinema|game|concert/i, "Entertainment"],
  [/sip|mutual fund|stocks|zerodha|groww|invest|nps|ppf/i, "Investments"],
  [/salary|stipend|freelance|payout|refund|credited/i, "Income"],
];
function ruleCategory(desc) {
  for (const [re, cat] of KEYWORD_RULES) if (re.test(desc)) return cat;
  return null;
}

/* ---------- tiny UI atoms ---------- */
const Card = ({ children, className = "", style = {} }) => (
  <div
    className={"rounded-2xl " + className}
    style={{ background: C.card, border: `1px solid ${C.line}`, ...style }}
  >
    {children}
  </div>
);

const Eyebrow = ({ children }) => (
  <div
    className="uppercase mb-1"
    style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.12em", color: C.faint }}
  >
    {children}
  </div>
);

const Money = ({ value, size = 26, color = C.ink, weight = 500 }) => (
  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color, fontWeight: weight, letterSpacing: "-0.02em" }}>
    {inr(value)}
  </div>
);

const Pill = ({ children, tone = "neutral" }) => {
  const map = {
    neutral: { bg: "#F1F0F6", fg: C.muted },
    good: { bg: C.goodSoft, fg: C.good },
    bad: { bg: C.badSoft, fg: C.bad },
    accent: { bg: C.accentSoft, fg: C.accent },
    warn: { bg: "#FCF2E0", fg: "#A66A0B" },
  };
  const s = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1"
      style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 600 }}
    >
      {children}
    </span>
  );
};

/* ============================================================ */

export default function Finamo() {
  const [tab, setTab] = useState("overview");
  const [txns, setTxns] = useState(SEED_TXNS);
  const [derived, setDerived] = useState(null);
  const accounts = derived?.accounts || ACCOUNTS;
  const debtAccounts = derived?.debts || LIABILITIES.map((l) => ({ ...l, value: -l.value }));
  const [profile, setProfile] = useState({ income: 92000, name: "", goal: "Emergency fund", onboarded: false });
  const [cancelled, setCancelled] = useState({});
  const [trustOpen, setTrustOpen] = useState(false);
  const [roundUp, setRoundUp] = useState(false);
  const [lastSync, setLastSync] = useState("just now");
  const [auth, setAuth] = useState(null);
  const [plan, setPlan] = useState(null);

  /* ---------- derived data ---------- */
  const monthly = useMemo(() => {
    return MONTHS.map((m) => {
      const rows = txns.filter((t) => t.date.startsWith(m.key));
      const income = rows.filter((t) => t.type === "in").reduce((a, b) => a + b.amount, 0);
      const invested = rows.filter((t) => t.category === "Investments").reduce((a, b) => a + b.amount, 0);
      const spend = rows
        .filter((t) => t.type === "out" && t.category !== "Investments")
        .reduce((a, b) => a + b.amount, 0);
      return { ...m, income, spend, invested, saved: income - spend - invested, rows };
    });
  }, [txns]);

  const cur = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];

  // pace-adjusted projection for the partial current month
  const projectedSpend = Math.round((cur.spend / 21) * 31);

  const byCategory = useMemo(() => {
    const map = {};
    cur.rows
      .filter((t) => t.type === "out" && t.category !== "Investments")
      .forEach((t) => (map[t.category] = (map[t.category] || 0) + t.amount));
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cur]);

  const prevByCategory = useMemo(() => {
    const map = {};
    prev.rows.filter((t) => t.type === "out").forEach((t) => (map[t.category] = (map[t.category] || 0) + t.amount));
    return map;
  }, [prev]);

  /* recurring detection: same merchant, ≥2 months, amount variance < 8% */
  const recurring = useMemo(() => {
    const groups = {};
    txns.filter((t) => t.type === "out").forEach((t) => {
      (groups[t.merchant] = groups[t.merchant] || []).push(t);
    });
    const out = [];
    Object.entries(groups).forEach(([merchant, rows]) => {
      const months = new Set(rows.map((r) => r.date.slice(0, 7)));
      if (months.size < 2) return;
      const perMonth = {};
      rows.forEach((r) => (perMonth[r.date.slice(0, 7)] = (perMonth[r.date.slice(0, 7)] || 0) + r.amount));
      const vals = Object.values(perMonth);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const spread = (Math.max(...vals) - Math.min(...vals)) / avg;
      if (spread > 0.08) return;
      out.push({
        merchant,
        amount: Math.round(avg),
        yearly: Math.round(avg * 12),
        category: rows[0].category,
        usage: USAGE[merchant] || "regular",
        candidate: /barely|twice|check-ins/.test(USAGE[merchant] || ""),
      });
    });
    return out.sort((a, b) => b.amount - a.amount);
  }, [txns]);

  const activeRecurring = recurring.filter((r) => !cancelled[r.merchant]);
  const cancelledSavings = recurring.filter((r) => cancelled[r.merchant]).reduce((a, b) => a + b.amount, 0);

  /* net worth */
  const assets = accounts.filter((a) => a.value > 0).reduce((a, b) => a + b.value, 0);
  const liabilities = Math.abs(accounts.filter((a) => a.value < 0).reduce((a, b) => a + b.value, 0));
  const netWorth = assets - liabilities;
  const netWorthTrend = useMemo(() => {
    let nw = netWorth;
    const arr = [];
    for (let i = monthly.length - 1; i >= 0; i--) {
      arr.unshift({ label: monthly[i].label, value: Math.round(nw) });
      nw = nw - (monthly[i].saved + monthly[i].invested);
    }
    arr.unshift({ label: "May", value: Math.round(nw - 6200) });
    return arr;
  }, [monthly, netWorth]);

  /* health score */
  const health = useMemo(() => {
    const income = cur.income || profile.income;
    const savingsRate = (income - projectedSpend) / income;
    const s1 = Math.max(0, Math.min(40, (savingsRate / 0.3) * 40));

    const subsLoad = activeRecurring.reduce((a, b) => a + b.amount, 0) / income;
    const s2 = Math.max(0, Math.min(15, (1 - subsLoad / 0.12) * 15));

    const weekly = {};
    cur.rows.filter((t) => t.type === "out").forEach((t) => {
      const w = Math.ceil(Number(t.date.slice(8)) / 7);
      weekly[w] = (weekly[w] || 0) + t.amount;
    });
    const wv = Object.values(weekly);
    const mean = wv.reduce((a, b) => a + b, 0) / wv.length;
    const sd = Math.sqrt(wv.reduce((a, b) => a + (b - mean) ** 2, 0) / wv.length);
    const cv = sd / mean;
    const s3 = Math.max(0, Math.min(20, (1 - cv / 0.6) * 20));

    const s4 = Math.min(15, (145000 / 300000) * 15 + 3);
    const s5 = Math.max(0, Math.min(10, (1 - liabilities / (income * 12) / 0.15) * 10));

    const total = Math.round(s1 + s2 + s3 + s4 + s5);
    return {
      total,
      savingsRate,
      parts: [
        { label: "Savings rate", score: s1, max: 40, note: `You keep ${(savingsRate * 100).toFixed(0)}% of what you earn` },
        { label: "Steady spending", score: s3, max: 20, note: "How even your weeks look" },
        { label: "Subscription load", score: s2, max: 15, note: `${inr(activeRecurring.reduce((a, b) => a + b.amount, 0))} locked in monthly` },
        { label: "Goal progress", score: s4, max: 15, note: "Emergency fund is 48% funded" },
        { label: "Debt weight", score: s5, max: 10, note: `${inr(liabilities)} outstanding` },
      ],
    };
  }, [cur, activeRecurring, projectedSpend, liabilities, profile.income]);

  const persona = useMemo(() => {
    const weekend = cur.rows.filter((t) => {
      const d = new Date(t.date + "T00:00:00").getDay();
      return t.type === "out" && (d === 0 || d === 6);
    }).reduce((a, b) => a + b.amount, 0);
    const share = weekend / cur.spend;
    const subsShare = activeRecurring.reduce((a, b) => a + b.amount, 0) / cur.spend;
    if (share > 0.32) return { name: "Weekend Splurger", why: `${(share * 100).toFixed(0)}% of your spending happens Sat–Sun. Weekdays you're disciplined; the weekend undoes it.` };
    if (subsShare > 0.15) return { name: "Silent Subscriber", why: "Small recurring charges are quietly eating your month." };
    return { name: "Steady Saver", why: "Your spending is even and predictable across the month." };
  }, [cur, activeRecurring]);

  /* safety net maths — all derived from real transactions */
  const safety = useMemo(() => {
    const ESSENTIAL = ["Rent", "Utilities", "Groceries", "Insurance", "Education", "Family", "Loans & EMIs"];
    const rows = cur.rows.filter((t) => t.type === "out");
    let essentials = rows.filter((t) => ESSENTIAL.includes(t.category)).reduce((a, b) => a + b.amount, 0);
    const transport = rows.filter((t) => t.category === "Transport").reduce((a, b) => a + b.amount, 0);
    essentials += transport * 0.6; // you'd still need to get around
    essentials = Math.max(1, Math.round((essentials / 21) * 31));

    const fund = derived?.savings ?? ASSETS[0].value;
    const runway = fund / essentials;
    const target = essentials * 6;

    // round-ups: nearest ₹50 on every outgoing transaction this month
    const roundUps = Math.round(
      rows.reduce((a, t) => a + (Math.ceil(t.amount / 50) * 50 - t.amount), 0) * (31 / 21)
    );

    const premiums = activeRecurring.filter((r) => r.category === "Insurance").reduce((a, b) => a + b.amount, 0);
    const policies = derived?.policies || POLICIES;
    const gaps = policies.filter((p) => !p.held);
    return { essentials, fund, runway, target, roundUps, premiums, gaps, policies };
  }, [cur, activeRecurring, derived]);

  const goals = useMemo(() => {
    const fund = derived?.savings ?? ASSETS[0].value;
    const monthlyFree = Math.max(2000, Math.round((cur.income - cur.spend - cur.invested) * 0.6));
    return [
      { id: 1, kind: "save", name: "Emergency fund", target: Math.round((safety.target / 1000)) * 1000, current: fund, monthly: monthlyFree },
      { id: 2, kind: "save", name: "Japan trip", target: 180000, current: Math.round(fund * 0.22), monthly: Math.round(monthlyFree * 0.6) },
      ...debtAccounts.map((d, i) => ({
        id: 10 + i, kind: "debt", name: d.name, target: Math.abs(d.value), apr: d.apr, monthly: d.minimum,
      })),
    ];
  }, [derived, safety, cur, debtAccounts]);

  const dataSummary = useMemo(() => {
    const catLines = byCategory.map((c) => `${c.name}: ${inr(c.value)} (last month ${inr(prevByCategory[c.name] || 0)})`).join("; ");
    return `Currency INR. Month so far: 1–21 Aug 2026.
Income: ${inr(cur.income)}/month. Spent so far: ${inr(cur.spend)}. Projected full month: ${inr(projectedSpend)}. Invested via SIP: ${inr(cur.invested)}.
Last month total spend: ${inr(prev.spend)}.
Category breakdown this month — ${catLines}.
Recurring charges: ${activeRecurring.map((r) => `${r.merchant} ${inr(r.amount)}/mo (${r.usage})`).join("; ")}.
Net worth ${inr(netWorth)} = assets ${inr(assets)} − debts ${inr(liabilities)}.${debtAccounts.length ? " Debts: " + debtAccounts.map((d) => `${d.name} ${inr(Math.abs(d.value))} at ${d.apr}% APR`).join("; ") + "." : " No outstanding debt."}
Goals: emergency fund ${inr(safety.fund)} of ${inr(safety.target)}.
Safety net: essential monthly costs (rent, utilities, groceries, premiums, EMIs, basic transport) are ${inr(safety.essentials)}, so the fund covers ${safety.runway.toFixed(1)} months. A 6-month cushion would be ${inr(safety.target)}.
Insurance held: ${safety.policies.filter((p) => p.held).map((p) => `${p.name} covering ${inr(p.cover)} at ${inr(p.premium)}/mo`).join("; ") || "none"}. Gaps: ${safety.gaps.map((p) => `${p.name} (recommended ${inr(p.recommend)}, about ${inr(p.estPremium)}/mo)`).join("; ") || "none"}.
Financial health score: ${health.total}/100. Spending personality: ${persona.name}.`;
  }, [byCategory, prevByCategory, cur, prev, activeRecurring, netWorth, health, persona, projectedSpend, assets, liabilities, safety]);

  /* ---------- shell ---------- */
  const NAV = [
    { id: "overview", label: "Home", icon: LayoutDashboard },
    { id: "spending", label: "Spends", icon: Receipt },
    { id: "plan", label: "Plan", icon: Wallet },
    { id: "safety", label: "Safety", icon: Umbrella },
    { id: "goals", label: "Goals", icon: Target },
    { id: "future", label: "Future", icon: Sparkles },
    { id: "coach", label: "Coach", icon: MessageSquare },
  ];

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100%", fontFamily: "'Public Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Public+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:${C.card};border:3px solid ${C.accent};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.18);}
        input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:${C.card};border:3px solid ${C.accent};cursor:pointer;}
        *:focus-visible{outline:2px solid ${C.accent};outline-offset:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important;}}
      `}</style>

      {!auth && <AuthScreen onAuth={setAuth} />}
      {auth && !profile.onboarded && (
        <OnboardingFull
          name={auth.name}
          onDone={(p, builtPlan) => {
            setProfile({ ...profile, ...p, onboarded: true });
            setPlan(builtPlan);
            setTxns(buildFromPlan(builtPlan));
            setDerived(deriveFromPlan(builtPlan));
          }}
        />
      )}
      {auth && profile.onboarded && (
      <>
      <div className="flex">
        {/* desktop rail */}
        <aside className="hidden md:flex flex-col justify-between p-4 sticky top-0" style={{ width: 220, height: "100vh", borderRight: `1px solid ${C.line}`, background: C.card }}>
          <div>
            <Logo />
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
                  style={{
                    background: tab === n.id ? C.accentSoft : "transparent",
                    color: tab === n.id ? C.accent : C.muted,
                    fontWeight: tab === n.id ? 600 : 500, fontSize: 14,
                  }}>
                  <n.icon size={17} />{n.label}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 rounded-xl px-2 py-2" style={{ background: "#FAF9FD" }}>
              <span className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {(auth?.name || "U").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{auth?.name}</div>
                <div className="truncate" style={{ fontSize: 10, color: C.faint }}>{auth?.email}</div>
              </div>
            </div>
            <button onClick={() => setTrustOpen(true)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-left w-full" style={{ color: C.muted, fontSize: 12.5 }}>
              <Shield size={15} /> Your data & safety
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-24 md:pb-10">
          <header className="md:hidden px-4 pt-4"><Logo /></header>
          <div className="px-4 md:px-8 pt-5 md:pt-8">
            {tab === "overview" && (
              <Overview {...{ cur, prev, projectedSpend, byCategory, prevByCategory, monthly, health, persona, netWorth, netWorthTrend, assets, liabilities, dataSummary, activeRecurring, setTab, setTrustOpen, safety, lastSync, setLastSync, accounts }} />
            )}
            {tab === "spending" && (
              <Spending {...{ txns, setTxns, recurring, cancelled, setCancelled, cancelledSavings, byCategory, prevByCategory }} />
            )}
            {tab === "plan" && <PlanScreen plan={plan} />}
            {tab === "safety" && (
              <SafetyNet {...{ safety, roundUp, setRoundUp, income: cur.income }} />
            )}
            {tab === "goals" && <Goals goals={goals} monthlyFree={cur.income - projectedSpend} />}
            {tab === "future" && (
              <Future {...{ byCategory, projectedSpend, income: cur.income, cancelledSavings, currentSaving: cur.income - projectedSpend }} />
            )}
            {tab === "coach" && <Coach dataSummary={dataSummary} rows={cur.rows} byCategory={byCategory} />}
          </div>
        </main>
      </div>

      {/* mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex" style={{ background: C.card, borderTop: `1px solid ${C.line}` }}>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5"
            style={{ color: tab === n.id ? C.accent : C.faint }}>
            <n.icon size={19} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span>
          </button>
        ))}
      </nav>
      </>
      )}

      {trustOpen && <TrustPanel onClose={() => setTrustOpen(false)} />}
    </div>
  );
}

/* ============================================================ */

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: C.accent }}>
        <Wallet size={16} color="#fff" />
      </div>
      <div>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: "-0.03em", lineHeight: 1 }}>Finamo</div>
        <div style={{ fontSize: 9.5, color: C.faint, letterSpacing: "0.06em", textTransform: "uppercase" }}>Personal finance coach</div>
      </div>
    </div>
  );
}

function SectionTitle({ kicker, title, sub }) {
  return (
    <div className="mb-4">
      {kicker && <Eyebrow>{kicker}</Eyebrow>}
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{title}</h2>
      {sub && <p className="mt-1" style={{ color: C.muted, fontSize: 13.5, maxWidth: 620 }}>{sub}</p>}
    </div>
  );
}

/* ---------------- Auth ---------------- */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signup");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [err, setErr] = useState("");

  const submit = () => {
    if (mode === "signup" && !f.name.trim()) return setErr("Tell us what to call you.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("That email doesn't look complete.");
    if (f.pw.length < 6) return setErr("Passwords need at least 6 characters.");
    onAuth({ name: mode === "signup" ? f.name.trim() : f.email.split("@")[0], email: f.email.trim() });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* left: pitch */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-between" style={{ background: C.ink, minHeight: 260 }}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: C.accent }}>
            <Wallet size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, color: "#fff", letterSpacing: "-0.03em" }}>Finamo</span>
        </div>
        <div className="py-10 lg:py-0">
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 38, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 460 }}>
            Most money advice is written for someone else.
          </h1>
          <p className="mt-4" style={{ color: "#A8A5C8", fontSize: 15, maxWidth: 400, lineHeight: 1.55 }}>
            Finamo reads your actual spending, sets aside what the month is going to throw at you, and tells you whether your salary is keeping up with prices. In rupees, not percentages.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Read-only bank access", "Every figure auditable", "No ads, no data selling"].map((t) => (
              <span key={t} className="rounded-full px-3 py-1.5" style={{ background: "rgba(255,255,255,.08)", color: "#CFC8F0", fontSize: 11.5, fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#6E6C8A" }}>Educational guidance, not licensed financial advice.</div>
      </div>

      {/* right: form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-14">
        <div className="w-full" style={{ maxWidth: 380 }}>
          <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: "#F1F0F6" }}>
            {["signup", "login"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} className="flex-1 rounded-lg py-2"
                style={{ background: mode === m ? "#fff" : "transparent", color: mode === m ? C.ink : C.muted, fontSize: 13, fontWeight: 600, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>
                {m === "signup" ? "Create account" : "Log in"}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 25, letterSpacing: "-0.03em" }}>
            {mode === "signup" ? "Set up your profile" : "Welcome back"}
          </h2>
          <p className="mt-1 mb-5" style={{ color: C.muted, fontSize: 13 }}>
            {mode === "signup" ? "Takes about two minutes. Nothing leaves your browser in this demo." : "Pick up where you left off."}
          </p>

          <div className="flex flex-col gap-2.5">
            {mode === "signup" && (
              <Field label="Your name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Yugendiran" />
            )}
            <Field label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="you@email.com" />
            <Field label="Password" type="password" value={f.pw} onChange={(v) => setF({ ...f, pw: v })} placeholder="At least 6 characters" onEnter={submit} />
          </div>

          {err && <div className="mt-3 rounded-lg px-3 py-2" style={{ background: C.badSoft, color: C.bad, fontSize: 12 }}>{err}</div>}

          <button onClick={submit} className="mt-5 w-full rounded-xl py-3" style={{ background: C.accent, color: "#fff", fontWeight: 600, fontSize: 14 }}>
            {mode === "signup" ? "Create my account" : "Log in"}
          </button>

          <button onClick={() => onAuth({ name: "Demo User", email: "demo@finamo.app" })} className="mt-2.5 w-full py-2" style={{ color: C.faint, fontSize: 12.5 }}>
            Skip — walk through as a demo user
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", onEnter }) {
  return (
    <label className="block">
      <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 500 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full rounded-xl px-3.5 py-2.5 mt-1 outline-none"
        style={{ border: `1px solid ${C.line}`, fontSize: 14 }} />
    </label>
  );
}

/* ---------------- Full-page onboarding ---------------- */
const STEP_LABELS = ["Income", "Your expenses", "Amounts", "The unexpected", "Connect"];

function OnboardingFull({ name, onDone }) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState(92000);
  const [picked, setPicked] = useState(() => {
    const d = {};
    ["Rent", "Electricity", "Broadband / wifi", "Mobile recharge", "Groceries", "Food delivery",
      "Petrol / diesel", "Cab & auto rides", "Netflix", "Spotify", "Health insurance", "SIP / mutual funds"]
      .forEach((n) => { const it = CATALOG.find((c) => c.name === n); if (it) d[n] = it.amount; });
    return d;
  });
  const [custom, setCustom] = useState([]);
  const [bufferPct, setBufferPct] = useState(8);
  const [growth, setGrowth] = useState(8);

  const items = useMemo(() => ([
    ...Object.entries(picked).map(([n, amount]) => {
      const c = CATALOG.find((x) => x.name === n);
      return { name: n, group: c.group, amount, essential: c.essential };
    }),
    ...custom,
  ]), [picked, custom]);

  const committed = items.reduce((a, b) => a + b.amount, 0);

  const finish = () => onDone(
    { income, goal: "Balanced plan" },
    { income, items, bufferPct, growth, name }
  );

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* header + progress */}
      <div className="sticky top-0 z-20 px-5 md:px-10 py-4" style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between gap-4" style={{ maxWidth: 940, margin: "0 auto" }}>
          <Logo />
          <div className="hidden md:flex items-center gap-1">
            {STEP_LABELS.map((l, i) => (
              <React.Fragment key={l}>
                <span className="rounded-full px-3 py-1.5" style={{
                  fontSize: 11.5, fontWeight: 600,
                  background: i === step ? C.accentSoft : "transparent",
                  color: i === step ? C.accent : i < step ? C.good : C.faint,
                }}>
                  {i < step ? "✓ " : ""}{l}
                </span>
                {i < STEP_LABELS.length - 1 && <span style={{ width: 12, height: 1, background: C.line }} />}
              </React.Fragment>
            ))}
          </div>
          <span className="md:hidden" style={{ fontSize: 12, color: C.muted }}>Step {step + 1} of 5</span>
        </div>
        <div className="mt-3 rounded-full" style={{ height: 3, background: "#F1F0F6", maxWidth: 940, margin: "12px auto 0" }}>
          <div className="rounded-full" style={{ height: 3, width: `${((step + 1) / 5) * 100}%`, background: C.accent, transition: "width .3s" }} />
        </div>
      </div>

      <div className="px-5 md:px-10 py-8 pb-28" style={{ maxWidth: 940, margin: "0 auto" }}>
        {step === 0 && <StepIncome name={name} income={income} setIncome={setIncome} />}
        {step === 1 && <StepPick picked={picked} setPicked={setPicked} custom={custom} setCustom={setCustom} />}
        {step === 2 && <StepAmounts items={items} picked={picked} setPicked={setPicked} custom={custom} setCustom={setCustom} income={income} />}
        {step === 3 && <StepBuffer {...{ income, committed, bufferPct, setBufferPct, growth, setGrowth, items }} />}
        {step === 4 && (
          <div style={{ maxWidth: 480 }}>
            <Card className="p-6"><ConnectBank onDone={finish} /></Card>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 px-5 md:px-10 py-3 flex items-center justify-between gap-3"
          style={{ background: C.card, borderTop: `1px solid ${C.line}` }}>
          <div style={{ maxWidth: 940, margin: "0 auto", width: "100%" }} className="flex items-center justify-between gap-3">
            <button onClick={() => setStep(Math.max(0, step - 1))} style={{ color: step === 0 ? "transparent" : C.muted, fontSize: 13 }}>Back</button>
            <div className="flex items-center gap-4">
              {step > 0 && (
                <span style={{ fontSize: 12, color: C.muted }}>
                  {items.length} expenses · <strong style={{ fontFamily: "'DM Mono', monospace", color: C.ink }}>{inr(committed)}</strong>/mo
                </span>
              )}
              <button onClick={() => setStep(step + 1)} disabled={step === 1 && items.length === 0}
                className="rounded-xl px-6 py-2.5"
                style={{ background: step === 1 && items.length === 0 ? "#E3E1EC" : C.accent, color: "#fff", fontWeight: 600, fontSize: 14 }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIncome({ name, income, setIncome }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <Eyebrow>Welcome, {name.split(" ")[0]}</Eyebrow>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 34, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
        What lands in your account each month?
      </h2>
      <p className="mt-2" style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.55 }}>
        Take-home, after tax and deductions. A rough figure is fine — you can change it later, and everything Finamo says is a ratio of this number.
      </p>
      <div className="mt-6 flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, color: C.faint }}>₹</span>
        <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value) || 0)}
          className="flex-1 outline-none" style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, letterSpacing: "-0.02em" }} />
        <span style={{ fontSize: 13, color: C.faint }}>/ month</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[35000, 55000, 75000, 92000, 130000].map((v) => (
          <button key={v} onClick={() => setIncome(v)} className="rounded-full px-3.5 py-1.5"
            style={{ border: `1px solid ${income === v ? C.accent : C.line}`, background: income === v ? C.accentSoft : C.card, color: income === v ? C.accent : C.muted, fontSize: 12.5, fontWeight: 600 }}>
            {inr(v)}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-xl p-4 flex gap-2.5" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
        <Lock size={14} style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
          Freelance or variable income? Enter your worst recent month. A plan built on your best month falls over in the months that matter.
        </p>
      </div>
    </div>
  );
}

function StepPick({ picked, setPicked, custom, setCustom }) {
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmt, setNewAmt] = useState("");
  const [newGroup, setNewGroup] = useState("Lifestyle");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CATALOG;
    return CATALOG.filter((c) => c.name.toLowerCase().includes(s) || c.group.toLowerCase().includes(s));
  }, [q]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((c) => (g[c.group] = g[c.group] || []).push(c));
    return g;
  }, [filtered]);

  const toggle = (c) => {
    const n = { ...picked };
    if (n[c.name] !== undefined) delete n[c.name]; else n[c.name] = c.amount;
    setPicked(n);
  };

  const addCustom = () => {
    if (!newName.trim() || !Number(newAmt)) return;
    setCustom([...custom, { name: newName.trim(), group: newGroup, amount: Number(newAmt), essential: false, custom: true }]);
    setNewName(""); setNewAmt("");
  };

  const count = Object.keys(picked).length + custom.length;

  return (
    <div>
      <Eyebrow>Step 2</Eyebrow>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
        What do you actually spend on?
      </h2>
      <p className="mt-2 mb-5" style={{ color: C.muted, fontSize: 14, maxWidth: 620, lineHeight: 1.55 }}>
        Tap everything that applies — a few are pre-selected to get you moving. Amounts come next, so don't overthink it. If something's missing, add it at the bottom.
      </p>

      {/* search */}
      <div className="sticky z-10 flex items-center gap-2 rounded-xl px-4 py-3 mb-4" style={{ top: 92, background: C.card, border: `1px solid ${C.line}` }}>
        <Search size={16} style={{ color: C.faint, flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — fuel, pass, OTT, gym, school fees…"
          className="flex-1 outline-none" style={{ fontSize: 14 }} />
        {q && <button onClick={() => setQ("")} style={{ color: C.faint }}><X size={15} /></button>}
        <span className="rounded-full px-2.5 py-1 flex-shrink-0" style={{ background: count ? C.accentSoft : "#F1F0F6", color: count ? C.accent : C.faint, fontSize: 11.5, fontWeight: 700 }}>
          {count} picked
        </span>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="rounded-xl p-6 text-center" style={{ background: C.card, border: `1px dashed ${C.line}` }}>
          <p style={{ fontSize: 13.5, color: C.muted }}>Nothing matches “{q}”. Add it as a custom expense below — that's what the field is for.</p>
        </div>
      )}

      {Object.entries(grouped).map(([g, list]) => (
        <div key={g} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-sm" style={{ width: 8, height: 8, background: CAT_COLOR[GROUPS[g].cat] }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g}</span>
            {GROUPS[g].rate > 0 && <span style={{ fontSize: 10.5, color: C.faint }}>prices here rise about {GROUPS[g].rate}% a year</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {list.map((c) => {
              const on = picked[c.name] !== undefined;
              return (
                <button key={c.name} onClick={() => toggle(c)} className="rounded-full px-3.5 py-2 flex items-center gap-1.5"
                  style={{ border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.card, color: on ? C.accent : C.ink, fontSize: 12.5, fontWeight: on ? 600 : 400 }}>
                  {on && <Check size={12} />}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* custom */}
      <Card className="p-4 mt-6">
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Something else? Add it here</div>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2, marginBottom: 10 }}>
          Chit fund, bike modification, a loan to a friend — anything that leaves your account every month.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="What is it?"
            className="flex-1 rounded-lg px-3 py-2 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13 }} />
          <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
            className="rounded-lg px-3 py-2 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13 }}>
            {Object.keys(GROUPS).map((g) => <option key={g}>{g}</option>)}
          </select>
          <input value={newAmt} onChange={(e) => setNewAmt(e.target.value)} type="number" placeholder="₹ / month"
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            className="rounded-lg px-3 py-2 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13, width: 120, fontFamily: "'DM Mono', monospace" }} />
          <button onClick={addCustom} className="rounded-lg px-4 py-2 flex items-center justify-center gap-1"
            style={{ background: C.ink, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
            <Plus size={13} /> Add
          </button>
        </div>
        {custom.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {custom.map((c, i) => (
              <span key={i} className="rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ background: C.goodSoft, color: C.good, fontSize: 12, fontWeight: 600 }}>
                {c.name} · {inr(c.amount)}
                <button onClick={() => setCustom(custom.filter((_, j) => j !== i))}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StepAmounts({ items, picked, setPicked, custom, setCustom, income }) {
  const committed = items.reduce((a, b) => a + b.amount, 0);
  const pctOfIncome = (committed / income) * 100;
  const byGroup = useMemo(() => {
    const g = {};
    items.forEach((i) => (g[i.group] = (g[i.group] || 0) + i.amount));
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const set = (item, v) => {
    if (item.custom) setCustom(custom.map((c) => (c.name === item.name ? { ...c, amount: v } : c)));
    else setPicked({ ...picked, [item.name]: v });
  };

  return (
    <div>
      <Eyebrow>Step 3</Eyebrow>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
        Roughly how much, each month?
      </h2>
      <p className="mt-2 mb-5" style={{ color: C.muted, fontSize: 14, maxWidth: 620 }}>
        We've filled in typical Chennai figures. Correct the ones that are obviously off — the rest can stay approximate.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 flex flex-col gap-2">
          {Object.entries(
            items.reduce((g, i) => { (g[i.group] = g[i.group] || []).push(i); return g; }, {})
          ).map(([g, list]) => (
            <Card key={g} className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="rounded-sm" style={{ width: 8, height: 8, background: CAT_COLOR[GROUPS[g].cat] }} />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g}</span>
              </div>
              {list.map((i, k) => {
                const base = CATALOG.find((c) => c.name === i.name)?.amount || i.amount || 1000;
                const max = Math.max(1000, Math.ceil((Math.max(base, i.amount) * 2.5) / 500) * 500);
                const pct = Math.min(100, (i.amount / max) * 100);
                return (
                  <div key={i.name} className="py-2.5" style={{ borderTop: k ? `1px solid ${C.line}` : "none" }}>
                    <div className="flex items-center gap-3">
                      <span className="flex-1" style={{ fontSize: 13 }}>
                        {i.name}
                        {i.essential && <span style={{ fontSize: 10, color: C.faint, marginLeft: 6 }}>can't cancel</span>}
                      </span>
                      <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${C.line}` }}>
                        <span style={{ color: C.faint, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>₹</span>
                        <input type="number" value={i.amount} onChange={(e) => set(i, Number(e.target.value) || 0)}
                          className="outline-none" style={{ width: 68, fontFamily: "'DM Mono', monospace", fontSize: 13, textAlign: "right" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input type="range" min="0" max={max} step="50" value={Math.min(i.amount, max)}
                        onChange={(e) => set(i, Number(e.target.value))}
                        className="flex-1"
                        style={{ background: `linear-gradient(90deg, ${C.accent} ${pct}%, #E3E1EC ${pct}%)` }} />
                      <span style={{ fontSize: 10, color: C.faint, fontFamily: "'DM Mono', monospace", width: 46, textAlign: "right" }}>{inrShort(max)}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          ))}
        </div>

        <div>
          <Card className="p-5 sticky" style={{ top: 108 }}>
            <Eyebrow>Committed each month</Eyebrow>
            <Money value={committed} size={30} color={pctOfIncome > 85 ? C.bad : C.ink} />
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
              {pctOfIncome.toFixed(0)}% of your {inr(income)} income
            </div>
            <div className="mt-3 rounded-full" style={{ height: 8, background: "#F1F0F6" }}>
              <div className="rounded-full" style={{ height: 8, width: `${Math.min(100, pctOfIncome)}%`, background: pctOfIncome > 85 ? C.bad : pctOfIncome > 70 ? C.gold : C.accent }} />
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              {byGroup.map(([g, v]) => (
                <div key={g} className="flex items-center gap-2">
                  <span className="rounded-sm" style={{ width: 7, height: 7, background: CAT_COLOR[GROUPS[g].cat] }} />
                  <span className="flex-1 truncate" style={{ fontSize: 12 }}>{g}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{inr(v)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="flex justify-between" style={{ fontSize: 13 }}>
                <span style={{ color: C.muted }}>Left over</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: income - committed > 0 ? C.good : C.bad }}>{inr(income - committed)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepBuffer({ income, committed, bufferPct, setBufferPct, growth, setGrowth, items }) {
  const buffer = Math.round((income * bufferPct) / 100);
  const shockTotal = SHOCK_LINES.reduce((a, b) => a + b[1], 0);
  const free = income - committed - buffer;

  const blended = useMemo(() => {
    const total = items.reduce((a, b) => a + b.amount, 0) || 1;
    return items.reduce((a, i) => a + (GROUPS[i.group].rate * i.amount) / total, 0);
  }, [items]);

  return (
    <div style={{ maxWidth: 720 }}>
      <Eyebrow>Step 4</Eyebrow>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
        Set aside money for the month going wrong
      </h2>
      <p className="mt-2 mb-5" style={{ color: C.muted, fontSize: 14, lineHeight: 1.55 }}>
        Budgets don't fail on rent. They fail on the ₹340 surge fare, the ₹1,200 wedding gift, the subscription that quietly went up. Give those a line of their own and they stop being emergencies.
      </p>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Buffer for the unexpected</Eyebrow>
            <Money value={buffer} size={32} color={C.accent} />
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{bufferPct}% of your income</div>
          </div>
          <div className="flex-1" style={{ minWidth: 220 }}>
            <input type="range" min="3" max="15" value={bufferPct} onChange={(e) => setBufferPct(Number(e.target.value))}
              className="w-full" style={{ background: `linear-gradient(90deg, ${C.accent} ${((bufferPct - 3) / 12) * 100}%, #E3E1EC ${((bufferPct - 3) / 12) * 100}%)` }} />
            <div className="flex justify-between mt-1" style={{ fontSize: 10.5, color: C.faint }}>
              <span>3% — tight</span><span>8% — realistic</span><span>15% — cautious</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>What this line actually absorbs</div>
          {SHOCK_LINES.map(([t, v]) => (
            <div key={t} className="flex items-center gap-2 py-1.5">
              <Zap size={12} style={{ color: C.faint, flexShrink: 0 }} />
              <span className="flex-1" style={{ fontSize: 12.5, color: C.muted }}>{t}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5 }}>{inr(v)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 600 }}>
            <span>Typical month, averaged out</span>
            <span style={{ fontFamily: "'DM Mono', monospace" }}>{inr(shockTotal)}</span>
          </div>
          <p className="mt-2" style={{ fontSize: 11.5, color: buffer < shockTotal ? "#A66A0B" : C.good, lineHeight: 1.5 }}>
            {buffer < shockTotal
              ? `At ${bufferPct}% you're ${inr(shockTotal - buffer)} short of a typical month's surprises. Some months you'll be fine; the bad ones come out of savings.`
              : `${inr(buffer)} covers a typical month's surprises with ${inr(buffer - shockTotal)} spare. Whatever's unused rolls into your emergency fund.`}
          </p>
        </div>
      </Card>

      <Card className="p-5 mt-3">
        <Eyebrow>Realistic check</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div style={{ fontSize: 14, fontWeight: 600 }}>How fast do you expect your income to grow?</div>
          <div className="flex gap-1">
            {[0, 5, 8, 12].map((g) => (
              <button key={g} onClick={() => setGrowth(g)} className="rounded-full px-3 py-1.5"
                style={{ fontSize: 11.5, fontWeight: 600, background: growth === g ? C.ink : "#F1F0F6", color: growth === g ? "#fff" : C.muted }}>
                {g === 0 ? "No raise" : `${g}%/yr`}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: growth >= blended ? C.goodSoft : "#FEF7EC" }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: C.ink }}>
            Your basket of expenses rises about <strong style={{ fontFamily: "'DM Mono', monospace" }}>{blended.toFixed(1)}%</strong> a year —
            weighted by what you actually buy, not the headline CPI. {growth >= blended
              ? `At ${growth}% raises you stay ahead, and the gap compounds in your favour.`
              : growth === 0
                ? `With no raise, this basket costs ${inr(Math.round(committed * Math.pow(1 + blended / 100, 5)))} in five years while your income stays at ${inr(income)}. That's the squeeze, in rupees.`
                : `At ${growth}% raises you're falling behind by ${(blended - growth).toFixed(1)}% a year. Small, but it compounds — and it's why a flat SIP shrinks in real terms.`}
          </p>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Committed", committed, C.ink], ["Buffer", buffer, C.accent], ["Free to allocate", free, free > 0 ? C.good : C.bad]].map(([l, v, col]) => (
          <Card key={l} className="p-3.5">
            <div style={{ fontSize: 11, color: C.faint }}>{l}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, color: col, marginTop: 2 }}>{inr(v)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Demo bank connection ---------------- */
const SYNC_STEPS = [
  "Opening a read-only connection",
  "Finding your accounts",
  "Pulling 3 months of transactions",
  "Sorting your transactions into categories",
  "Spotting charges that repeat every month",
  "Working out your safety net",
];

function ConnectBank({ onDone }) {
  const [phase, setPhase] = useState("pick");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== "syncing") return;
    if (progress >= SYNC_STEPS.length) {
      const t = setTimeout(onDone, 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => p + 1), 420);
    return () => clearTimeout(t);
  }, [phase, progress, onDone]);

  if (phase === "syncing") {
    return (
      <>
        <Eyebrow>Connecting</Eyebrow>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>
          Finamo Demo Bank
        </h3>
        <div className="mt-4 flex flex-col gap-2.5">
          {SYNC_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5" style={{ opacity: i <= progress ? 1 : 0.3, transition: "opacity .3s" }}>
              {i < progress ? (
                <span className="rounded-full flex items-center justify-center" style={{ width: 18, height: 18, background: C.goodSoft }}>
                  <Check size={11} style={{ color: C.good }} />
                </span>
              ) : (
                <span className="rounded-full" style={{ width: 18, height: 18, border: `2px solid ${i === progress ? C.accent : C.line}` }} />
              )}
              <span style={{ fontSize: 13, color: i < progress ? C.ink : C.muted }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-full" style={{ height: 5, background: "#F1F0F6" }}>
          <div className="rounded-full" style={{ height: 5, width: `${(progress / SYNC_STEPS.length) * 100}%`, background: C.accent, transition: "width .35s" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Eyebrow>Last step</Eyebrow>
      <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
        Connect an account so there's something to read
      </h3>
      <p className="mt-1.5" style={{ color: C.muted, fontSize: 13 }}>
        Finamo can look, never touch. The connection has no permission to move money.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {BANKS.map((b, i) => {
          const demo = i === 0;
          return (
            <button key={b} disabled={!demo} onClick={() => setPhase("syncing")}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
              style={{
                border: `1px solid ${demo ? C.accent : C.line}`,
                background: demo ? C.accentSoft : "#fff",
                opacity: demo ? 1 : 0.45, cursor: demo ? "pointer" : "not-allowed",
              }}>
              <span className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: demo ? C.accent : "#F1F0F6" }}>
                <Landmark size={15} color={demo ? "#fff" : C.faint} />
              </span>
              <span className="flex-1" style={{ fontSize: 13.5, fontWeight: demo ? 600 : 400 }}>{b}</span>
              {demo ? <Pill tone="accent">Ready</Pill> : <span style={{ fontSize: 11, color: C.faint }}>after the hackathon</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl p-3" style={{ background: "#FAF9FD", fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
        <Lock size={13} style={{ color: C.accent, marginTop: 1, flexShrink: 0 }} />
        Real banks connect through India's Account Aggregator framework. For this demo, Finamo Demo Bank carries three months of realistic Chennai spending so every screen has something honest to say.
      </div>
    </>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ cur, prev, projectedSpend, byCategory, prevByCategory, monthly, health, persona, netWorth, netWorthTrend, assets, liabilities, dataSummary, activeRecurring, setTab, setTrustOpen, safety, lastSync, setLastSync, accounts }) {
  const change = ((projectedSpend - prev.spend) / prev.spend) * 100;
  const top = [...cur.rows].filter((t) => t.type === "out").sort((a, b) => b.amount - a.amount).slice(0, 5);
  const [syncing, setSyncing] = useState(false);

  const resync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setLastSync("just now"); }, 1100);
  };

  return (
    <div>
      <SectionTitle kicker="1–21 August 2026" title="Here's where you actually are" sub="Every number below comes from your transactions. Nothing is a template." />

      {/* connected accounts */}
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full" style={{ width: 7, height: 7, background: C.good }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Finamo Demo Bank connected</span>
            <span style={{ fontSize: 11.5, color: C.faint }}>· read-only · synced {lastSync}</span>
          </div>
          <button onClick={resync} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "#F1F0F6", color: C.muted, fontSize: 11, fontWeight: 600 }}>
            <RefreshCw size={11} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "Syncing" : "Sync"}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {accounts.map((a) => (
            <div key={a.name} className="rounded-xl p-3 flex-shrink-0" style={{ border: `1px solid ${C.line}`, minWidth: 152, background: "#FAF9FD" }}>
              <div className="flex items-center gap-1.5" style={{ color: C.faint }}>
                {a.icon && <a.icon size={12} />}
                <span style={{ fontSize: 10.5 }}>{a.bank} ••{a.mask}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>{a.name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: a.value < 0 ? C.bad : C.ink, marginTop: 1 }}>
                {a.value < 0 ? "−" : ""}{inr(Math.abs(a.value))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* safety net teaser */}
      <button onClick={() => setTab("safety")} className="w-full mb-3 rounded-2xl p-4 flex items-center gap-3 text-left"
        style={{ background: safety.runway < 6 ? "#FEF7EC" : C.goodSoft, border: `1px solid ${safety.runway < 6 ? "#F3D9A8" : "#BFE5D9"}` }}>
        <span className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, background: "#fff" }}>
          <Umbrella size={18} style={{ color: safety.runway < 6 ? "#A66A0B" : C.good }} />
        </span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            If your salary stopped today, you'd last {safety.runway.toFixed(1)} months
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {inr(safety.fund)} in the fund against {inr(safety.essentials)} of costs you can't cancel — and {safety.gaps.length} insurance gaps.
          </div>
        </div>
        <span style={{ fontSize: 11.5, color: C.accent, fontWeight: 600, flexShrink: 0 }}>Open</span>
      </button>

      {/* hero strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Eyebrow>Spent this month</Eyebrow>
              <Money value={cur.spend} size={34} />
              <div className="mt-2 flex items-center gap-2">
                <Pill tone={change > 0 ? "bad" : "good"}>
                  {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(change).toFixed(0)}% vs last month
                </Pill>
                <span style={{ fontSize: 11.5, color: C.faint }}>on pace for {inr(projectedSpend)}</span>
              </div>
            </div>
            <div className="text-right">
              <Eyebrow>Kept</Eyebrow>
              <Money value={cur.income - cur.spend - cur.invested} size={22} color={C.good} />
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>plus {inr(cur.invested)} into SIP</div>
            </div>
          </div>
          <div className="mt-4" style={{ height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.map((m) => ({ label: m.label, Spent: m.spend, Kept: Math.max(0, m.income - m.spend) }))} barGap={4}>
                <CartesianGrid vertical={false} stroke={C.line} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.faint }} />
                <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
                <Bar dataKey="Spent" fill={C.accent} radius={[5, 5, 0, 0]} />
                <Bar dataKey="Kept" fill="#CFC8F0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <Eyebrow>Financial health</Eyebrow>
          <HealthDial score={health.total} />
          <div className="mt-3 flex flex-col gap-2">
            {health.parts.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between" style={{ fontSize: 11.5 }}>
                  <span style={{ color: C.ink, fontWeight: 500 }}>{p.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: C.faint }}>{Math.round(p.score)}/{p.max}</span>
                </div>
                <div className="mt-1 rounded-full" style={{ height: 4, background: "#F1F0F6" }}>
                  <div className="rounded-full" style={{ height: 4, width: `${(p.score / p.max) * 100}%`, background: C.accent }} />
                </div>
                <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3 }}>{p.note}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI insights */}
      <Insights dataSummary={dataSummary} byCategory={byCategory} prevByCategory={prevByCategory} activeRecurring={activeRecurring} />

      {/* category + net worth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <Card className="p-5 lg:col-span-2">
          <Eyebrow>Where it went</Eyebrow>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                    {byCategory.map((c) => <Cell key={c.name} fill={CAT_COLOR[c.name] || C.faint} />)}
                  </Pie>
                  <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full flex flex-col gap-1.5">
              {byCategory.slice(0, 6).map((c) => {
                const p = prevByCategory[c.name];
                const d = p ? ((c.value - p) / p) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="rounded-sm" style={{ width: 9, height: 9, background: CAT_COLOR[c.name] || C.faint, flexShrink: 0 }} />
                    <span className="flex-1 truncate" style={{ fontSize: 12.5 }}>{c.name}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5 }}>{inr(c.value)}</span>
                    {p ? (
                      <span style={{ fontSize: 10.5, width: 44, textAlign: "right", color: d > 8 ? C.bad : d < -8 ? C.good : C.faint }}>
                        {d > 0 ? "+" : ""}{d.toFixed(0)}%
                      </span>
                    ) : <span style={{ width: 44 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <Eyebrow>Net worth</Eyebrow>
          <Money value={netWorth} size={26} />
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>
            {inr(assets)} owned − {inr(liabilities)} owed
          </div>
          <div className="mt-3" style={{ height: 88 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthTrend}>
                <defs>
                  <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2} fill="url(#nw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <Eyebrow>Your money personality</Eyebrow>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>{persona.name}</div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{persona.why}</p>
          </div>
        </Card>
      </div>

      {/* top expenses */}
      <Card className="p-5 mt-3">
        <Eyebrow>Five biggest hits this month</Eyebrow>
        <div className="mt-2 flex flex-col">
          {top.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: (CAT_COLOR[t.category] || C.faint) + "22", color: CAT_COLOR[t.category], fontSize: 11, fontWeight: 700 }}>
                {t.merchant.slice(0, 1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>{t.merchant}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{t.category} · {new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13.5 }}>{inr(t.amount)}</span>
            </div>
          ))}
        </div>
      </Card>

      <button onClick={() => setTrustOpen(true)} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-3" style={{ border: `1px dashed ${C.line}`, color: C.muted, fontSize: 12.5 }}>
        <Shield size={14} /> Read-only, encrypted, never sold, delete anytime — see exactly what we do with your data
      </button>
    </div>
  );
}

function HealthDial({ score }) {
  const r = 54, cx = 70, cy = 64;
  const start = Math.PI, end = 0;
  const angle = start + (end - start) * (score / 100);
  const arc = (a0, a1) => {
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0) * -1;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1) * -1;
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const tone = score >= 70 ? C.good : score >= 45 ? C.gold : C.bad;
  const word = score >= 70 ? "Solid" : score >= 45 ? "Wobbly" : "At risk";
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="78" viewBox="0 0 140 78">
        <path d={arc(start, end)} stroke="#F1F0F6" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d={arc(start, angle)} stroke={tone} strokeWidth="11" fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -22, textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 500, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: tone, fontWeight: 600, marginTop: 2 }}>{word}</div>
      </div>
    </div>
  );
}

/* ---------------- AI insights ---------------- */
function Insights({ dataSummary, byCategory, prevByCategory, activeRecurring }) {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState("loading");
  const ran = useRef(false);

  const fallback = useMemo(() => {
    const out = [];
    const food = byCategory.find((c) => c.name === "Food & Dining");
    if (food) {
      const p = prevByCategory["Food & Dining"] || food.value;
      const d = ((food.value - p) / p) * 100;
      out.push({
        title: `Food & dining is your loudest line`,
        why: `${inr(food.value)} in 21 days — ${d > 0 ? `${d.toFixed(0)}% above` : `${Math.abs(d).toFixed(0)}% below`} last month, and most of it lands Friday to Sunday.`,
        action: "Pre-decide two weekend meals you'll cook. That alone claws back roughly ₹1,600 a month.",
        save: 1600,
      });
    }
    const dead = activeRecurring.filter((r) => r.candidate);
    if (dead.length) {
      const amt = dead.reduce((a, b) => a + b.amount, 0);
      out.push({
        title: `${dead.length} subscriptions you're paying for but not using`,
        why: `${dead.map((d) => d.merchant).join(", ")} cost ${inr(amt)}/month — ${inr(amt * 12)} a year — and your usage says you've mostly stopped.`,
        action: "Cancel the worst one today. You can always resubscribe; you almost never do.",
        save: amt,
      });
    }
    out.push({
      title: "Your credit card is the most expensive thing you own",
      why: "₹18,500 sitting at 42% APR costs about ₹648 every month in interest alone — more than your Netflix and Prime combined.",
      action: "Redirect one month of SIP to clear it, then restart the SIP. You come out ahead by roughly ₹5,400 over a year.",
      save: 648,
    });
    return out;
  }, [byCategory, prevByCategory, activeRecurring]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: `You are Finamo, a blunt but warm personal finance coach for an Indian user. Below is their real data.

${dataSummary}

Write exactly 3 insights. Each must: name a specific number from the data, explain WHY it happened or why it matters, and give ONE concrete next action they could do this week. Never say "save more" or anything generic. Tone: a smart friend, not a bank. Keep "why" under 30 words and "action" under 25 words.

Return ONLY raw JSON, no markdown fences, no preamble:
{"insights":[{"title":"...","why":"...","action":"...","save":<estimated monthly rupees saved as a number>}]}`
            }],
          }),
        });
        const data = await res.json();
        const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setItems(parsed.insights.slice(0, 3));
        setStatus("live");
      } catch (e) {
        setItems(fallback);
        setStatus("fallback");
      }
    })();
  }, [dataSummary, fallback]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Eyebrow>Coach notes</Eyebrow>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
            Three things worth your attention
          </div>
        </div>
        {status === "fallback" && <Pill tone="warn">offline rules</Pill>}
        {status === "live" && <Pill tone="accent"><Sparkles size={11} /> generated live</Pill>}
      </div>

      {status === "loading" && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl" style={{ height: 74, background: "#F5F4F9" }} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items?.map((it, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{it.title}</div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{it.why}</p>
            <div className="mt-3 flex items-start gap-2 rounded-lg p-2.5" style={{ background: C.accentSoft }}>
              <Check size={13} style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: C.accent, lineHeight: 1.4, fontWeight: 500 }}>{it.action}</span>
            </div>
            {it.save > 0 && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.good, marginTop: 8 }}>
                ≈ {inr(it.save)}/month back
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Spending ---------------- */
function Spending({ txns, setTxns, recurring, cancelled, setCancelled, cancelledSavings, byCategory }) {
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ merchant: "", amount: "", date: "2026-08-21" });
  const [aiTag, setAiTag] = useState(null);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);

  const ceiling = useMemo(() => {
    const m = Math.max(...txns.map((t) => t.amount), 1000);
    return Math.ceil(m / 1000) * 1000;
  }, [txns]);
  useEffect(() => { if (hi === 0) setHi(ceiling); }, [ceiling, hi]);
  const top = hi || ceiling;
  const ranged = lo > 0 || top < ceiling;

  const cats = ["All", ...byCategory.map((c) => c.name)];
  const matching = txns.filter(
    (t) => (filter === "All" || t.category === filter) && t.amount >= lo && t.amount <= top
  );
  const list = matching.slice(0, 40);

  const add = async () => {
    if (!form.merchant || !form.amount) return;
    let cat = ruleCategory(form.merchant);
    let tagged = "rules";
    if (!cat) {
      setAiTag("thinking");
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 1000,
            messages: [{ role: "user", content: `Classify this Indian bank transaction description into exactly one category from: Food & Dining, Groceries, Rent, Transport, Subscriptions, Shopping, Utilities, Health & Fitness, Entertainment, Investments, Income. Description: "${form.merchant}". Reply with the category name only, nothing else.` }],
          }),
        });
        const d = await res.json();
        const guess = d.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
        cat = CAT_COLOR[guess] ? guess : "Shopping";
        tagged = "ai";
      } catch {
        cat = "Shopping";
        tagged = "fallback";
      }
      setAiTag(null);
    }
    setTxns([{ id: Date.now(), date: form.date, merchant: form.merchant, category: cat, amount: Number(form.amount), type: cat === "Income" ? "in" : "out", tagged }, ...txns]);
    setForm({ merchant: "", amount: "", date: "2026-08-21" });
    setAdding(false);
  };

  return (
    <div>
      <SectionTitle kicker="Money in, money out" title="Every rupee, sorted" sub="Categories are guessed automatically. Tap any one to correct it — Finamo remembers the correction." />

      {/* recurring */}
      <Card className="p-5 mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Repeat size={16} style={{ color: C.accent }} />
            <span style={{ fontWeight: 600, fontSize: 14.5 }}>Charges that repeat every month</span>
          </div>
          {cancelledSavings > 0 && <Pill tone="good">{inr(cancelledSavings * 12)}/yr freed</Pill>}
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Found by spotting the same merchant charging roughly the same amount, month after month.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {recurring.map((r) => {
            const off = cancelled[r.merchant];
            return (
              <div key={r.merchant} className="flex items-center gap-3 rounded-xl p-3"
                style={{ border: `1px solid ${r.candidate && !off ? "#F3D9A8" : C.line}`, background: off ? "#F7F6FA" : r.candidate ? "#FEFBF4" : "#fff", opacity: off ? 0.55 : 1 }}>
                <span className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, background: (CAT_COLOR[r.category] || C.faint) + "22", color: CAT_COLOR[r.category], fontWeight: 700, fontSize: 12 }}>
                  {r.merchant.slice(0, 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13.5, fontWeight: 500, textDecoration: off ? "line-through" : "none" }}>{r.merchant}</div>
                  <div style={{ fontSize: 11, color: r.candidate ? "#A66A0B" : C.faint }}>
                    {r.candidate && <AlertTriangle size={10} style={{ display: "inline", marginRight: 3, marginBottom: 1 }} />}
                    {r.usage} · {inr(r.yearly)}/year
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{inr(r.amount)}</div>
                  <button onClick={() => setCancelled({ ...cancelled, [r.merchant]: !off })}
                    style={{ fontSize: 10.5, color: off ? C.accent : C.bad, fontWeight: 600 }}>
                    {off ? "undo" : "cancel"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* transactions */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {cats.slice(0, 8).map((c) => (
              <button key={c} onClick={() => setFilter(c)} className="rounded-full px-3 py-1.5"
                style={{ fontSize: 11.5, fontWeight: 600, background: filter === c ? C.ink : "#F1F0F6", color: filter === c ? "#fff" : C.muted }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600 }}>
            <Plus size={13} /> Add expense
          </button>
        </div>

        {adding && (
          <div className="rounded-xl p-3 mb-3 flex flex-col sm:flex-row gap-2" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
            <input placeholder="What was it? e.g. Swiggy dinner" value={form.merchant}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              className="flex-1 rounded-lg px-3 py-2 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13 }} />
            <input placeholder="Amount" type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="rounded-lg px-3 py-2 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13, width: 110, fontFamily: "'DM Mono', monospace" }} />
            <button onClick={add} className="rounded-lg px-4 py-2" style={{ background: C.ink, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
              {aiTag === "thinking" ? "Sorting…" : "Save"}
            </button>
          </div>
        )}

        {/* price range */}
        <div className="rounded-xl p-3.5 mb-3" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
              Price range
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, color: C.accent, marginLeft: 8 }}>
                {inr(lo)} – {inr(top)}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11.5, color: C.faint }}>
                {matching.length} of {txns.length} transactions
              </span>
              {ranged && (
                <button onClick={() => { setLo(0); setHi(ceiling); }} className="flex items-center gap-1" style={{ color: C.accent, fontSize: 11.5, fontWeight: 600 }}>
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1">
              <span style={{ fontSize: 10.5, color: C.faint }}>At least</span>
              <input type="range" min="0" max={ceiling} step="100" value={lo}
                onChange={(e) => setLo(Math.min(Number(e.target.value), top - 100))}
                className="w-full" style={{ background: `linear-gradient(90deg, #E3E1EC ${(lo / ceiling) * 100}%, ${C.accent} ${(lo / ceiling) * 100}%)` }} />
            </label>
            <label className="flex-1">
              <span style={{ fontSize: 10.5, color: C.faint }}>Up to</span>
              <input type="range" min="0" max={ceiling} step="100" value={top}
                onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 100))}
                className="w-full" style={{ background: `linear-gradient(90deg, ${C.accent} ${(top / ceiling) * 100}%, #E3E1EC ${(top / ceiling) * 100}%)` }} />
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {[["Small change", 0, 500], ["Everyday", 500, 2000], ["Chunky", 2000, 10000], ["Big hits", 10000, ceiling]].map(([l, a, b]) => {
              const on = lo === a && top === b;
              return (
                <button key={l} onClick={() => { setLo(a); setHi(b); }} className="rounded-full px-2.5 py-1"
                  style={{ fontSize: 11, fontWeight: 600, background: on ? C.accent : "#fff", color: on ? "#fff" : C.muted, border: `1px solid ${on ? C.accent : C.line}` }}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {list.length === 0 && (
          <div className="rounded-xl p-6 text-center" style={{ border: `1px dashed ${C.line}` }}>
            <p style={{ fontSize: 13, color: C.muted }}>
              Nothing between {inr(lo)} and {inr(top)}{filter !== "All" ? ` in ${filter}` : ""}. Widen the range or clear the category.
            </p>
          </div>
        )}

        <div className="flex flex-col">
          {list.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: (CAT_COLOR[t.category] || C.faint) + "22", color: CAT_COLOR[t.category], fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {t.merchant.slice(0, 1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>{t.merchant}</div>
                <div style={{ fontSize: 11, color: C.faint }}>
                  {new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {t.tagged === "ai" && " · sorted by AI"}
                </div>
              </div>
              <select value={t.category}
                onChange={(e) => setTxns(txns.map((x) => (x.id === t.id ? { ...x, category: e.target.value } : x)))}
                className="rounded-full px-2 py-1 outline-none"
                style={{ fontSize: 10.5, fontWeight: 600, color: CAT_COLOR[t.category], background: (CAT_COLOR[t.category] || C.faint) + "18", border: "none", maxWidth: 118 }}>
                {Object.keys(CAT_COLOR).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13.5, color: t.type === "in" ? C.good : C.ink, width: 78, textAlign: "right" }}>
                {t.type === "in" ? "+" : ""}{inr(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Plan: allocation, buffer, inflation ---------------- */
function PlanScreen({ plan }) {
  const [growth, setGrowth] = useState(plan?.growth ?? 8);
  const [bufferPct, setBufferPct] = useState(plan?.bufferPct ?? 8);

  if (!plan) return (
    <div>
      <SectionTitle kicker="Plan" title="No plan built yet"
        sub="Your plan comes from the expenses you picked during setup. Log out and sign up again to build one." />
    </div>
  );

  const { income, items } = plan;
  const committed = items.reduce((a, b) => a + b.amount, 0);
  const buffer = Math.round((income * bufferPct) / 100);
  const essentials = items.filter((i) => i.essential).reduce((a, b) => a + b.amount, 0);
  const flexible = committed - essentials;
  const free = income - committed - buffer;

  const byGroup = useMemo(() => {
    const g = {};
    items.forEach((i) => (g[i.group] = (g[i.group] || 0) + i.amount));
    return Object.entries(g).map(([name, value]) => ({ name, value, rate: GROUPS[name].rate })).sort((a, b) => b.value - a.value);
  }, [items]);

  const blended = useMemo(() => {
    const t = committed || 1;
    return items.reduce((a, i) => a + (GROUPS[i.group].rate * i.amount) / t, 0);
  }, [items, committed]);

  const proj = useMemo(() => {
    const out = [];
    for (let y = 0; y <= 5; y++) {
      let cost = 0;
      items.forEach((i) => (cost += i.amount * Math.pow(1 + GROUPS[i.group].rate / 100, y)));
      out.push({
        year: y === 0 ? "Now" : `+${y}y`,
        Expenses: Math.round(cost),
        Income: Math.round(income * Math.pow(1 + growth / 100, y)),
      });
    }
    return out;
  }, [items, income, growth]);

  const last = proj[proj.length - 1];
  const headroomNow = income - committed;
  const headroom5 = last.Income - last.Expenses;
  const shrinking = headroom5 < headroomNow;
  const crossover = proj.find((p) => p.Expenses > p.Income);

  // biggest inflation contributors
  const drivers = [...byGroup].map((g) => ({ ...g, drag: (g.value * g.rate) / 100 })).sort((a, b) => b.drag - a.drag).slice(0, 3);

  return (
    <div>
      <SectionTitle kicker="Your plan" title={`${inr(income)} in, and here's where it's committed`}
        sub="Built from the expenses you picked at signup. The buffer line is money you allocate before the month gets a chance to surprise you." />

      {/* allocation waterfall */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {[
          ["Can't cancel", essentials, C.ink, "Rent, bills, EMIs, premiums"],
          ["Flexible", flexible, C.gold, "Food out, lifestyle, extras"],
          ["Buffer", buffer, C.accent, "For the month going wrong"],
          ["Free to allocate", free, free > 0 ? C.good : C.bad, free > 0 ? "Goals and investing" : "You're over budget"],
        ].map(([l, v, col, sub]) => (
          <Card key={l} className="p-4">
            <Eyebrow>{l}</Eyebrow>
            <Money value={v} size={22} color={col} />
            <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{sub}</div>
            <div className="mt-2 rounded-full" style={{ height: 4, background: "#F1F0F6" }}>
              <div className="rounded-full" style={{ height: 4, width: `${Math.min(100, (Math.abs(v) / income) * 100)}%`, background: col }} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* buffer control */}
        <Card className="p-5 lg:col-span-2">
          <Eyebrow>Buffer for the unexpected</Eyebrow>
          <Money value={buffer} size={30} color={C.accent} />
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{bufferPct}% of income, set aside before anything else</div>
          <input type="range" min="3" max="15" value={bufferPct} onChange={(e) => setBufferPct(Number(e.target.value))}
            className="w-full mt-4" style={{ background: `linear-gradient(90deg, ${C.accent} ${((bufferPct - 3) / 12) * 100}%, #E3E1EC ${((bufferPct - 3) / 12) * 100}%)` }} />
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            {SHOCK_LINES.map(([t, v]) => (
              <div key={t} className="flex items-center gap-2 py-1.5">
                <Zap size={11} style={{ color: C.faint, flexShrink: 0 }} />
                <span className="flex-1" style={{ fontSize: 12, color: C.muted, lineHeight: 1.35 }}>{t}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{inr(v)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl p-3" style={{ background: "#FAF9FD", fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
            Unspent buffer isn't a windfall — it rolls into the emergency fund at month end. That's the difference between a buffer and just under-budgeting.
          </div>
        </Card>

        {/* inflation projection */}
        <Card className="p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>Your basket vs your salary</Eyebrow>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>
                Prices rise {blended.toFixed(1)}% a year for you
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Weighted by what you actually buy, not headline CPI</div>
            </div>
            <div className="flex gap-1">
              {[0, 5, 8, 12].map((g) => (
                <button key={g} onClick={() => setGrowth(g)} className="rounded-full px-2.5 py-1"
                  style={{ fontSize: 11, fontWeight: 600, background: growth === g ? C.ink : "#F1F0F6", color: growth === g ? "#fff" : C.muted }}>
                  {g === 0 ? "No raise" : `${g}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4" style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={proj}>
                <CartesianGrid vertical={false} stroke={C.line} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.faint }} />
                <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="Income" stroke={C.good} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Expenses" stroke={C.bad} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 rounded-xl p-4" style={{ background: shrinking ? "#FEF7EC" : C.goodSoft }}>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Today you have <strong style={{ fontFamily: "'DM Mono', monospace" }}>{inr(headroomNow)}</strong> of headroom each month.
              {" "}In five years, at {growth}% raises, that becomes <strong style={{ fontFamily: "'DM Mono', monospace", color: headroom5 > headroomNow ? C.good : C.bad }}>{inr(headroom5)}</strong>.
              {crossover
                ? ` Your expenses overtake your income around ${crossover.year} — that's the point where saving stops and borrowing starts.`
                : shrinking
                  ? " You stay solvent, but the gap narrows every year. That squeeze is what people mistake for lifestyle creep."
                  : " Raises outpace your basket, so the gap widens in your favour — invest the difference or it quietly becomes spending."}
            </p>
          </div>

          <div className="mt-3">
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>What's dragging hardest on you</div>
            <div className="flex flex-wrap gap-2">
              {drivers.map((d) => (
                <div key={d.name} className="rounded-xl px-3 py-2" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>
                    +{inr(Math.round(d.drag))}/mo next year at {d.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* group breakdown */}
      <Card className="p-5 mt-3">
        <Eyebrow>Where the commitment sits</Eyebrow>
        <div style={{ height: 180 }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byGroup} layout="vertical" margin={{ left: 4 }}>
              <CartesianGrid horizontal={false} stroke={C.line} />
              <XAxis type="number" tickFormatter={inrShort} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C.faint }} />
              <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                {byGroup.map((g) => <Cell key={g.name} fill={CAT_COLOR[GROUPS[g.name].cat] || C.accent} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* inflation countermeasures */}
      <Card className="p-5 mt-3">
        <Eyebrow>Beating the drag</Eyebrow>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
          Six moves that actually hold their value
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 14, maxWidth: 640 }}>
          None of these need a raise or a windfall. They're structural — you do them once and they keep working while prices climb.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {INFLATION_MOVES.map((m, i) => (
            <div key={m.t} className="rounded-xl p-4 flex gap-3" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
              <span className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 26, height: 26, background: C.accentSoft, color: C.accent, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 }}>
                {i + 1}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{m.t}</div>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{m.d}</p>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.good, marginTop: 6 }}>{m.n}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3" style={{ fontSize: 11, color: C.faint, lineHeight: 1.5 }}>
          Inflation rates here are category-specific estimates for India (healthcare and education run well above headline CPI; fuel and transport below). Returns are illustrative, not promised — equity can and does fall.
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Safety Net: emergency fund + insurance ---------------- */
function SafetyNet({ safety, roundUp, setRoundUp, income }) {
  const [shock, setShock] = useState(null);
  const [addOn, setAddOn] = useState({});
  const policies = safety.policies || POLICIES;

  const health = policies.find((p) => p.id === "health");
  const bike = policies.find((p) => p.id === "bike");
  const shocks = SHOCKS.map((x) => {
    if (x.id === "hosp") return health?.held
      ? { ...x, covered: Math.min(x.cost, health.cover) * 0.9, detail: `Your ${inr(health.cover)} health cover settles most of it. You pay the co-pay, room-rent gap and pharmacy bills.` }
      : { ...x, covered: 0, detail: "You have no health cover on file. The whole bill lands on your savings." };
    if (x.id === "bike") return bike?.held ? x : { ...x, covered: 0, detail: "No vehicle cover on file, so the repair comes out of pocket." };
    return x;
  });

  const monthlyToFund = Math.max(2000, Math.round(income * 0.09)) + (roundUp ? safety.roundUps : 0);
  const gap = Math.max(0, safety.target - safety.fund);
  const monthsToFull = monthlyToFund > 0 ? Math.ceil(gap / monthlyToFund) : 0;
  const pct = Math.min(100, (safety.fund / safety.target) * 100);

  const s = shocks.find((x) => x.id === shock);
  const outOfPocket = s ? Math.max(0, s.cost - s.covered) : 0;
  const after = safety.fund - outOfPocket;
  const runwayAfter = after / safety.essentials;

  const extraPremium = policies.filter((p) => !p.held && addOn[p.id]).reduce((a, b) => a + b.estPremium, 0);
  const coveredNow = policies.filter((p) => p.held || addOn[p.id]).length;

  return (
    <div>
      <SectionTitle kicker="Safety net" title="What happens on your worst month"
        sub="An emergency fund buys you time. Insurance buys you a ceiling on the damage. You need both, and Finamo tracks them together." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* emergency fund */}
        <Card className="p-5 lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Emergency fund</Eyebrow>
              <Money value={safety.fund} size={32} />
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                of a {inr(safety.target)} six-month cushion
              </div>
            </div>
            <div className="text-right">
              <Eyebrow>Months of runway</Eyebrow>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, color: safety.runway >= 6 ? C.good : safety.runway >= 3 ? C.gold : C.bad, lineHeight: 1 }}>
                {safety.runway.toFixed(1)}
              </div>
            </div>
          </div>

          {/* runway bar with month markers */}
          <div className="mt-5">
            <div className="rounded-full relative" style={{ height: 12, background: "#F1F0F6" }}>
              <div className="rounded-full" style={{ height: 12, width: `${pct}%`, background: `linear-gradient(90deg, ${C.accent}, #8B72E8)` }} />
              {[1, 2, 3, 4, 5].map((m) => (
                <span key={m} className="absolute" style={{ left: `${(m / 6) * 100}%`, top: 0, height: 12, width: 1, background: "#fff", opacity: 0.85 }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5" style={{ fontSize: 10, color: C.faint, fontFamily: "'DM Mono', monospace" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((m) => <span key={m}>{m}mo</span>)}
            </div>
          </div>

          <div className="mt-4 rounded-xl p-3.5" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.muted }}>
              Costs you genuinely can't cancel come to <strong style={{ color: C.ink, fontFamily: "'DM Mono', monospace" }}>{inr(safety.essentials)}</strong> a month —
              rent, electricity, groceries, insurance premiums, both EMIs and enough transport to get to interviews.
              Swiggy and shopping aren't in that number, because in a bad month they wouldn't be.
            </div>
          </div>

          {/* round-up */}
          <div className="mt-3 flex items-center gap-3 rounded-xl p-3.5" style={{ border: `1px solid ${roundUp ? C.accent : C.line}`, background: roundUp ? C.accentSoft : "#fff" }}>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Round up every spend to the nearest ₹50</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                Based on your actual transactions, that's <strong style={{ color: C.accent }}>{inr(safety.roundUps)}</strong> a month you'd never notice leaving.
              </div>
            </div>
            <button onClick={() => setRoundUp(!roundUp)} className="rounded-full flex-shrink-0" style={{ width: 44, height: 25, background: roundUp ? C.accent : "#E3E1EC", padding: 3 }}>
              <span className="rounded-full block" style={{ width: 19, height: 19, background: "#fff", transform: roundUp ? "translateX(19px)" : "none", transition: "transform .18s" }} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl p-3.5" style={{ background: C.ink }}>
            <div>
              <div style={{ fontSize: 11, color: "#A8A5C8" }}>Putting away {inr(monthlyToFund)}/month</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.02em", marginTop: 2 }}>
                Fully funded in {monthsToFull} months
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: 11, color: "#A8A5C8" }}>Still to go</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, color: "#fff" }}>{inr(gap)}</div>
            </div>
          </div>
        </Card>

        {/* shock test */}
        <Card className="p-5 lg:col-span-2">
          <Eyebrow>Stress test</Eyebrow>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Pick something going wrong
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {shocks.map((x) => (
              <button key={x.id} onClick={() => setShock(shock === x.id ? null : x.id)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
                style={{ border: `1px solid ${shock === x.id ? C.accent : C.line}`, background: shock === x.id ? C.accentSoft : "#fff" }}>
                <x.icon size={15} style={{ color: shock === x.id ? C.accent : C.faint, flexShrink: 0 }} />
                <span className="flex-1" style={{ fontSize: 13, fontWeight: shock === x.id ? 600 : 400, color: shock === x.id ? C.accent : C.ink }}>{x.label}</span>
                {x.cost > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, color: C.faint }}>{inrShort(x.cost)}</span>}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl p-4" style={{ background: s ? (runwayAfter < 3 ? C.badSoft : "#FAF9FD") : "#F5F4F9", minHeight: 168 }}>
            {!s ? (
              <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                Nothing selected. Tap a scenario to see what it does to your fund, what insurance absorbs, and how long you'd still hold out.
              </p>
            ) : s.kind === "income" ? (
              <>
                <div style={{ fontSize: 11, color: C.faint, letterSpacing: "0.08em", textTransform: "uppercase" }}>You'd hold out for</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 34, color: safety.runway >= 6 ? C.good : C.bad, lineHeight: 1.1 }}>
                  {safety.runway.toFixed(1)} months
                </div>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{s.detail}</p>
                <p style={{ fontSize: 12, color: C.ink, marginTop: 8, lineHeight: 1.5, fontWeight: 500 }}>
                  Tech hiring in Chennai averages 2–4 months to a new offer. You're inside that window, but only just — six months is the number that lets you refuse a bad offer.
                </p>
              </>
            ) : (
              <>
                <div className="flex gap-5">
                  <div>
                    <div style={{ fontSize: 10.5, color: C.faint }}>Insurance pays</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 19, color: s.covered > 0 ? C.good : C.bad }}>{inr(s.covered)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: C.faint }}>You pay</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 19 }}>{inr(outOfPocket)}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{s.detail}</p>
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12, color: C.muted }}>Fund drops to <strong style={{ color: C.ink, fontFamily: "'DM Mono', monospace" }}>{inr(after)}</strong></div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    Runway left: <strong style={{ color: runwayAfter < 3 ? C.bad : C.ink, fontFamily: "'DM Mono', monospace" }}>{runwayAfter.toFixed(1)} months</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* insurance vault */}
      <Card className="p-5 mt-3">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-1">
          <div>
            <Eyebrow>Insurance</Eyebrow>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
              What's actually covering you
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={coveredNow >= policies.length ? "good" : "warn"}>{coveredNow} of {policies.length} covers in place</Pill>
            <Pill tone="neutral">{inr(safety.premiums + extraPremium)}/mo in premiums</Pill>
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Premiums were picked up automatically from your transactions — Finamo noticed them repeating and worked backwards to the policy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {policies.map((p) => {
            const on = p.held || addOn[p.id];
            return (
              <div key={p.id} className="rounded-xl p-4" style={{
                border: `1px solid ${p.held ? C.line : addOn[p.id] ? "#BFE5D9" : "#F3D9A8"}`,
                background: p.held ? "#fff" : addOn[p.id] ? C.goodSoft : "#FEFBF4",
              }}>
                <div className="flex items-start gap-3">
                  <span className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, background: on ? C.accentSoft : "#FCF2E0" }}>
                    <p.icon size={16} style={{ color: on ? C.accent : "#A66A0B" }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                      {!p.held && !addOn[p.id] && <Pill tone="warn"><AlertTriangle size={10} /> gap</Pill>}
                      {addOn[p.id] && <Pill tone="good"><Check size={10} /> added</Pill>}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{p.type}</div>

                    <div className="mt-2.5 flex gap-5">
                      <div>
                        <div style={{ fontSize: 10.5, color: C.faint }}>{p.held ? "Cover" : "You'd want"}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15 }}>{inrShort(p.held ? p.cover : p.recommend)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10.5, color: C.faint }}>{p.held ? "Premium" : "Roughly"}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15 }}>{inr(p.held ? p.premium : p.estPremium)}<span style={{ fontSize: 10, color: C.faint }}>/mo</span></div>
                      </div>
                      {p.held && (
                        <div>
                          <div style={{ fontSize: 10.5, color: C.faint }}>Renews</div>
                          <div style={{ fontSize: 12.5, marginTop: 2 }}>{p.renews}</div>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>{p.note}</p>

                    {!p.held && (
                      <button onClick={() => setAddOn({ ...addOn, [p.id]: !addOn[p.id] })}
                        className="mt-2.5 rounded-full px-3 py-1.5"
                        style={{ background: addOn[p.id] ? "#F1F0F6" : C.accent, color: addOn[p.id] ? C.muted : "#fff", fontSize: 11.5, fontWeight: 600 }}>
                        {addOn[p.id] ? "Remove from plan" : "Add to my plan"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {extraPremium > 0 && (
          <div className="mt-3 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: C.ink }}>
            <div>
              <div style={{ fontSize: 11, color: "#A8A5C8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Closing those gaps costs</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.02em", marginTop: 2 }}>
                {inr(extraPremium)} a month — {((extraPremium / income) * 100).toFixed(1)}% of your salary
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#A8A5C8", maxWidth: 300, lineHeight: 1.5 }}>
              Less than what you spend on food delivery in a single weekend, and it's the difference between a bad month and a ruined decade.
            </div>
          </div>
        )}
      </Card>

      <p className="mt-3" style={{ fontSize: 11, color: C.faint }}>
        Cover amounts and premiums are indicative. Finamo is educational guidance, not insurance advice — read the policy wording before you buy anything.
      </p>
    </div>
  );
}

/* ---------------- Goals ---------------- */
function Goals({ goals, monthlyFree }) {
  const [extra, setExtra] = useState(0);
  const saves = goals.filter((g) => g.kind === "save");
  const debts = goals.filter((g) => g.kind === "debt");

  const payoff = (bal, apr, monthly) => {
    let b = bal, months = 0, interest = 0;
    const r = apr / 100 / 12;
    while (b > 0 && months < 600) {
      const i = b * r;
      interest += i;
      b = b + i - monthly;
      months++;
    }
    return { months, interest };
  };

  return (
    <div>
      <SectionTitle kicker="Planning" title="Saving up and paying down are different jobs" sub="So Finamo keeps them apart. One shows a finish line getting closer; the other shows interest you stop bleeding." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {saves.map((g) => {
          const pct = (g.current / g.target) * 100;
          const monthsLeft = Math.ceil((g.target - g.current) / g.monthly);
          const eta = new Date(2026, 7 + monthsLeft, 1);
          return (
            <Card key={g.id} className="p-5">
              <div className="flex items-center justify-between">
                <Eyebrow>Saving goal</Eyebrow>
                <Pill tone="accent">{pct.toFixed(0)}% there</Pill>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>{g.name}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <Money value={g.current} size={22} />
                <span style={{ fontSize: 13, color: C.faint }}>of {inr(g.target)}</span>
              </div>
              <div className="mt-3 rounded-full" style={{ height: 8, background: "#F1F0F6" }}>
                <div className="rounded-full" style={{ height: 8, width: `${pct}%`, background: C.accent }} />
              </div>
              <div className="mt-3 flex items-center justify-between" style={{ fontSize: 12, color: C.muted }}>
                <span>{inr(g.monthly)}/month</span>
                <span>Full by <strong style={{ color: C.ink }}>{eta.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</strong></span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-3">
        <Card className="p-5">
          <Eyebrow>Debt payoff</Eyebrow>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
              What one extra payment does
            </div>
            <div className="flex items-center gap-3 flex-1" style={{ minWidth: 220, maxWidth: 340 }}>
              <input type="range" min="0" max="8000" step="500" value={extra}
                onChange={(e) => setExtra(Number(e.target.value))}
                className="flex-1" style={{ background: `linear-gradient(90deg, ${C.accent} ${(extra / 8000) * 100}%, #E3E1EC ${(extra / 8000) * 100}%)` }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, width: 66, textAlign: "right" }}>+{inr(extra)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {debts.map((g) => {
              const base = payoff(g.target, g.apr, g.minimum);
              const boosted = payoff(g.target, g.apr, g.minimum + extra);
              const saved = base.interest - boosted.interest;
              return (
                <div key={g.id} className="rounded-xl p-4" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</span>
                    <Pill tone={g.apr > 20 ? "bad" : "neutral"}>{g.apr}% APR</Pill>
                  </div>
                  <Money value={g.target} size={22} />
                  <div className="mt-3 flex items-end gap-4">
                    <div>
                      <div style={{ fontSize: 10.5, color: C.faint }}>Clear in</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18 }}>
                        {boosted.months} mo
                        {extra > 0 && <span style={{ fontSize: 11, color: C.good, marginLeft: 5 }}>−{base.months - boosted.months}</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: C.faint }}>Interest you'd pay</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: extra > 0 ? C.good : C.ink }}>
                        {inr(boosted.interest)}
                      </div>
                    </div>
                  </div>
                  {extra > 0 && (
                    <div className="mt-3 rounded-lg px-3 py-2" style={{ background: C.goodSoft, color: C.good, fontSize: 11.5, fontWeight: 600 }}>
                      {inr(saved)} of interest never leaves your account
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3" style={{ fontSize: 11.5, color: C.faint }}>
            You have roughly {inr(Math.max(0, monthlyFree))} unspent each month. The credit card at 42% is the most expensive rupee you owe — it goes first.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Future (flagship) ---------------- */
const BUYS = [
  { at: 15000, thing: "a weekend in Pondicherry, paid in full" },
  { at: 35000, thing: "a proper mechanical keyboard and a 4K monitor" },
  { at: 65000, thing: "eight days in Bali, flights included" },
  { at: 99000, thing: "a MacBook Air, bought outright" },
  { at: 180000, thing: "the Japan trip — the whole thing" },
  { at: 300000, thing: "your full emergency fund, done" },
  { at: 600000, thing: "a year of living expenses banked" },
  { at: 1200000, thing: "the deposit on a Chennai flat" },
];

function Future({ byCategory, projectedSpend, income, cancelledSavings, currentSaving }) {
  const trimmable = byCategory.filter((c) => ["Food & Dining", "Shopping", "Transport", "Entertainment", "Groceries"].includes(c.name)).slice(0, 4);
  const [cuts, setCuts] = useState({});
  const [ret, setRet] = useState(12);

  const monthlyOf = (c) => (c.value / 21) * 31;
  const freed = trimmable.reduce((a, c) => a + monthlyOf(c) * ((cuts[c.name] || 0) / 100), 0) + cancelledSavings;
  const baseMonthly = Math.max(0, currentSaving);

  const series = useMemo(() => {
    const r = ret / 100 / 12;
    let a = 0, b = 0;
    const out = [{ m: 0, label: "now", Current: 0, Finamo: 0 }];
    for (let m = 1; m <= 60; m++) {
      a = a * (1 + r) + baseMonthly;
      b = b * (1 + r) + baseMonthly + freed;
      if (m % 3 === 0 || m === 1) out.push({ m, label: m < 12 ? `${m}m` : `${(m / 12).toFixed(0)}y`, Current: Math.round(a), Finamo: Math.round(b) });
    }
    return out;
  }, [freed, baseMonthly, ret]);

  const at = (m) => series.find((s) => s.m === m) || series[series.length - 1];
  const gap5 = at(60).Finamo - at(60).Current;
  const buy = [...BUYS].reverse().find((b) => gap5 >= b.at);

  return (
    <div>
      <SectionTitle kicker="The what-if room" title="Meet the version of you that cut back a little"
        sub="Drag a slider. The line on the right is the same person, five years later, having changed one habit." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="p-5 lg:col-span-2">
          <Eyebrow>Turn something down</Eyebrow>
          <div className="flex flex-col gap-4 mt-3">
            {trimmable.map((c) => {
              const pct = cuts[c.name] || 0;
              const m = monthlyOf(c);
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 500 }}>
                      <span className="rounded-sm" style={{ width: 9, height: 9, background: CAT_COLOR[c.name] }} />
                      {c.name}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: pct ? C.good : C.faint }}>
                      {pct ? `−${inr((m * pct) / 100)}/mo` : inr(m) + "/mo"}
                    </span>
                  </div>
                  <input type="range" min="0" max="60" value={pct}
                    onChange={(e) => setCuts({ ...cuts, [c.name]: Number(e.target.value) })}
                    className="w-full" style={{ background: `linear-gradient(90deg, ${C.accent} ${(pct / 60) * 100}%, #E3E1EC ${(pct / 60) * 100}%)` }} />
                  <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>cut {pct}%</div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 12.5, color: C.muted }}>If it's invested and returns</span>
              <div className="flex gap-1">
                {[7, 12].map((r) => (
                  <button key={r} onClick={() => setRet(r)} className="rounded-full px-2.5 py-1"
                    style={{ fontSize: 11, fontWeight: 600, background: ret === r ? C.ink : "#F1F0F6", color: ret === r ? "#fff" : C.muted }}>
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            {cancelledSavings > 0 && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: C.goodSoft, color: C.good, fontSize: 11.5, fontWeight: 600 }}>
                + {inr(cancelledSavings)}/mo from subscriptions you cancelled
              </div>
            )}
            <button onClick={() => setCuts({})} className="flex items-center gap-1.5" style={{ color: C.faint, fontSize: 11.5 }}>
              <RotateCcw size={12} /> Reset sliders
            </button>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>Freed up every month</Eyebrow>
              <Money value={freed} size={30} color={freed > 0 ? C.good : C.faint} />
            </div>
            <div className="text-right">
              <Eyebrow>In five years that's</Eyebrow>
              <Money value={gap5} size={30} color={C.accent} />
            </div>
          </div>

          <div className="mt-4" style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="fut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={C.line} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C.faint }} interval={2} />
                <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="Finamo" stroke={C.accent} strokeWidth={2.5} fill="url(#fut)" name="If you cut back" />
                <Area type="monotone" dataKey="Current" stroke={C.faint} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Current path" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[6, 12, 36].map((m) => (
              <div key={m} className="rounded-xl p-3" style={{ background: "#FAF9FD", border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10.5, color: C.faint }}>{m < 12 ? `${m} months` : `${m / 12} years`}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: C.accent }}>
                  +{inrShort(at(m).Finamo - at(m).Current)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl p-4" style={{ background: freed > 0 ? C.ink : "#F5F4F9" }}>
            {freed > 0 ? (
              <>
                <div style={{ fontSize: 11, color: "#A8A5C8", letterSpacing: "0.08em", textTransform: "uppercase" }}>That difference buys</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.02em", marginTop: 3, lineHeight: 1.2 }}>
                  {buy ? buy.thing : "a real cushion under your life"}
                </div>
                <p style={{ fontSize: 12, color: "#A8A5C8", marginTop: 5 }}>
                  Not by earning more. Just by keeping {inr(freed)} a month that was already yours.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: C.muted }}>Move a slider to see what changes. Even 10% off one category adds up faster than it feels like it should.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Coach ---------------- */
const CHIPS = [
  "Where did my money actually go this month?",
  "Can I afford a ₹79,000 phone right now?",
  "How long would I survive without a salary?",
  "Is ₹5L of health cover enough for Chennai?",
  "Which subscription should I kill first?",
];

function Coach({ dataSummary, rows, byCategory }) {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "I've read your last three months. Ask me anything about your money — I'll answer with your actual numbers, not general advice." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [corrections, setCorrections] = useState(0);
  const [numbersOnly, setNumbersOnly] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [flagging, setFlagging] = useState(null);
  const [flagText, setFlagText] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, flagging]);

  const catA = byCategory.filter((c) => c.name !== "Rent" && c.name !== "Loans & EMIs")[0] || byCategory[0] || { name: "Food & Dining", value: 0 };
  const catB = byCategory.filter((c) => c.name !== catA.name && c.name !== "Rent" && c.name !== "Loans & EMIs")[0] || { name: "Groceries", value: 0 };
  const food = catA.value;
  const grocery = catB.value;
  const wrongTotal = Math.round(food + grocery);
  const wrongSave = Math.round(wrongTotal * 0.18);
  const rightSave = Math.round(food * 0.18);

  /* every figure the app itself computed, mapped to the transactions behind it */
  const verified = useMemo(() => {
    const m = {};
    byCategory.forEach((c) => {
      m[Math.round(c.value)] = {
        label: `${c.name} · 1–21 Aug 2026`,
        items: rows.filter((t) => t.category === c.name && t.type === "out"),
        sound: true,
      };
    });
    // the figure the coach invents in the seeded mistake — auditable, and wrong
    m[wrongTotal] = {
      label: `${catA.name} · as the coach counted it`,
      items: rows.filter((t) => [catA.name, catB.name].includes(t.category) && t.type === "out"),
      sound: false, strayCat: catB.name,
    };
    return m;
  }, [byCategory, rows, wrongTotal, catA, catB]);

  const openReceipt = (r) => setReceipt(r);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");

    if (numbersOnly) {
      setMsgs([...next, { role: "assistant", type: "figures" }]);
      return;
    }

    if (armed) {
      setArmed(false);
      setBusy(true);
      setTimeout(() => {
        setMsgs([...next, {
          role: "assistant", flawed: true,
          content: `Most of it went to food. You spent ₹${new Intl.NumberFormat("en-IN").format(wrongTotal)} on ${catA.name} between 1 and 21 August — comfortably your biggest discretionary line. Trim weekend orders by about a fifth and you'd keep roughly ₹${new Intl.NumberFormat("en-IN").format(wrongSave)} a month.`,
        }]);
        setBusy(false);
      }, 900);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are Finamo, a personal finance coach for an Indian user. Here is their real financial data:

${dataSummary}

Rules: answer using their actual numbers. Explain why, then give one concrete next step. Be warm and direct, never preachy, never generic. Keep it under 130 words. Use ₹ and Indian number formatting. If the answer rests on an assumption (income holding steady, no one-off costs), say the assumption out loud in one short sentence. If they ask something the data can't answer, say so plainly. You are educational guidance, not a licensed advisor.

Conversation so far:
${next.map((m) => `${m.role === "user" ? "User" : "Finamo"}: ${m.content || "[figures]"}`).join("\n")}

Reply as Finamo to the last user message.`,
          }],
        }),
      });
      const data = await res.json();
      const t = data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      setMsgs([...next, { role: "assistant", content: t }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: `From your saved figures: you're on pace to spend more than last month, ${catA.name} is ₹${new Intl.NumberFormat("en-IN").format(food)} so far, and your highest-interest debt is quietly the costliest thing on your books.` }]);
    }
    setBusy(false);
  };

  const submitFlag = async (idx) => {
    const flagged = msgs[idx];
    setFlagging(null);
    setFlagText("");
    setCorrections((c) => c + 1);

    if (flagged.flawed) {
      setMsgs((m) => [...m, {
        role: "assistant", type: "recovery",
        wrong: wrongTotal, right: Math.round(food), delta: Math.round(grocery),
        wrongSave, rightSave,
        catA: catA.name, catB: catB.name,
        cause: `I counted your ${catB.name} charges as ${catA.name}. They're a different habit with a different fix.`,
        receipt: { label: `${catA.name} · 1–21 Aug 2026`, items: rows.filter((t) => t.category === catA.name && t.type === "out"), sound: true },
      }]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are Finamo, a finance coach. You said this to a user: "${flagged.content}"

They replied that it was wrong: "${flagText || "that's not right"}"

Their real data:
${dataSummary}

Write a correction in exactly four short beats, no headings, no apology filler, never say "I apologize for any confusion":
1. Name precisely what you got wrong and what the right figure or claim is.
2. Say what caused the error in one sentence.
3. Say what it changes about the advice you gave.
4. Re-answer their original question correctly, unprompted.
Under 110 words. If you can't tell what was wrong from their data, say so plainly and ask one specific question.`,
          }],
        }),
      });
      const data = await res.json();
      const t = data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      setMsgs((m) => [...m, { role: "assistant", content: t, corrected: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", corrected: true, content: "You're right, and I can't verify what I said from your data — which means I shouldn't have said it with that much confidence. Tell me which figure was off and I'll rebuild the answer from your transactions." }]);
    }
    setBusy(false);
  };

  return (
    <div>
      <SectionTitle kicker="Ask anything" title="Your coach has read your statements" sub="Answers are grounded in the transactions above — ask in plain English, or Thanglish." />

      {corrections > 0 && (
        <Card className="p-3 mb-3 flex flex-wrap items-center gap-3" style={{ background: C.accentSoft, border: `1px solid #CFC4F5` }}>
          <span className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: "#fff" }}>
            <Shield size={15} style={{ color: C.accent }} />
          </span>
          <div className="flex-1" style={{ minWidth: 190 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.accent }}>
              Corrected {corrections} {corrections === 1 ? "time" : "times"} this session
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
              Every figure below is underlined — tap it to see the transactions behind it. Don't take my word for anything.
            </div>
          </div>
          <button onClick={() => setNumbersOnly(!numbersOnly)} className="rounded-full px-3 py-1.5 flex-shrink-0"
            style={{ background: numbersOnly ? C.ink : "#fff", color: numbersOnly ? "#fff" : C.muted, fontSize: 11.5, fontWeight: 600, border: `1px solid ${C.line}` }}>
            {numbersOnly ? "Advice off" : "Numbers only"}
          </button>
        </Card>
      )}

      <Card className="flex flex-col" style={{ height: 520 }}>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {msgs.map((m, i) => {
            if (m.role === "user") return (
              <div key={i} className="flex justify-end">
                <div className="rounded-2xl px-4 py-2.5" style={{ maxWidth: "82%", background: C.accent, color: "#fff", fontSize: 13.5, lineHeight: 1.55 }}>{m.content}</div>
              </div>
            );
            if (m.type === "figures") return <FiguresReply key={i} byCategory={byCategory} onOpen={openReceipt} verified={verified} />;
            if (m.type === "recovery") return <RecoveryReply key={i} m={m} onOpen={openReceipt} />;
            return (
              <div key={i} className="flex flex-col items-start" style={{ maxWidth: "88%" }}>
                <div className="rounded-2xl px-4 py-2.5" style={{
                  background: m.corrected ? C.goodSoft : "#F5F4F9", color: C.ink,
                  fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  border: m.corrected ? `1px solid #BFE5D9` : "none",
                }}>
                  {withReceipts(m.content, verified, openReceipt, corrections > 0 || m.flawed)}
                </div>
                {i > 0 && (
                  flagging === i ? (
                    <div className="mt-1.5 flex gap-1.5 w-full">
                      <input autoFocus value={flagText} onChange={(e) => setFlagText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitFlag(i)}
                        placeholder="What did I get wrong?"
                        className="flex-1 rounded-lg px-3 py-1.5 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 12 }} />
                      <button onClick={() => submitFlag(i)} className="rounded-lg px-3" style={{ background: C.ink, color: "#fff", fontSize: 11.5, fontWeight: 600 }}>Send</button>
                      <button onClick={() => setFlagging(null)} style={{ color: C.faint, fontSize: 11.5 }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setFlagging(i)} className="mt-1 px-1" style={{ color: C.faint, fontSize: 11 }}>
                      That's wrong
                    </button>
                  )
                )}
              </div>
            );
          })}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3" style={{ background: "#F5F4F9", color: C.faint, fontSize: 13 }}>reading your numbers…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => send(c)} className="rounded-full px-3 py-1.5 whitespace-nowrap"
              style={{ background: "#F1F0F6", color: C.muted, fontSize: 11.5, fontWeight: 500, flexShrink: 0 }}>
              {c}
            </button>
          ))}
        </div>

        <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={numbersOnly ? "Advice is off — ask for a figure…" : "Ask about your spending…"}
            className="flex-1 rounded-xl px-4 py-2.5 outline-none" style={{ border: `1px solid ${C.line}`, fontSize: 13.5 }} />
          <button onClick={() => send()} className="rounded-xl px-4" style={{ background: C.accent, color: "#fff" }}>
            <Send size={16} />
          </button>
        </div>
      </Card>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p style={{ fontSize: 11, color: C.faint }}>Finamo gives educational guidance, not licensed financial advice.</p>
        <button onClick={() => setArmed(!armed)} className="rounded-full px-2.5 py-1"
          style={{ border: `1px dashed ${armed ? C.bad : C.line}`, color: armed ? C.bad : C.faint, fontSize: 10.5, fontWeight: 600 }}>
          {armed ? "● mistake armed — ask anything" : "demo: stage a mistake"}
        </button>
      </div>

      {receipt && <ReceiptDrawer r={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/* underline any figure the app can prove, and make it tappable */
function withReceipts(text, verified, onOpen, active) {
  if (!text) return null;
  return text.split(/(₹[\d,]+)/g).map((p, i) => {
    const mm = /^₹([\d,]+)$/.exec(p);
    if (mm) {
      const v = Number(mm[1].replace(/,/g, ""));
      const r = verified[v];
      if (r) return (
        <button key={i} onClick={() => onOpen(r)}
          style={{ color: C.accent, fontWeight: 600, borderBottom: `1.5px dotted ${active ? C.accent : "transparent"}` }}>
          {p}
        </button>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function RecoveryReply({ m, onOpen }) {
  const Beat = ({ n, children }) => (
    <div className="flex gap-2.5 py-2" style={{ borderTop: n > 1 ? `1px solid #D9EDE6` : "none" }}>
      <span className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: 17, height: 17, background: C.good, color: "#fff", fontSize: 9.5, fontWeight: 700, marginTop: 1 }}>{n}</span>
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
  return (
    <div className="rounded-2xl p-4" style={{ maxWidth: "92%", background: C.goodSoft, border: `1px solid #BFE5D9` }}>
      <div className="flex items-center gap-2 mb-1">
        <RotateCcw size={13} style={{ color: C.good }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.good, letterSpacing: "0.08em", textTransform: "uppercase" }}>Correction</span>
      </div>
      <Beat n={1}>
        I said <strong style={{ fontFamily: "'DM Mono', monospace", textDecoration: "line-through", color: C.bad }}>{inr(m.wrong)}</strong>.
        Your {m.catA} is <strong style={{ fontFamily: "'DM Mono', monospace", color: C.good }}>{inr(m.right)}</strong>. I was over by {inr(m.delta)}.
      </Beat>
      <Beat n={2}>{m.cause}</Beat>
      <Beat n={3}>
        That changes my advice too — the saving I quoted as {inr(m.wrongSave)} a month is really {inr(m.rightSave)}. I've regenerated the note on your dashboard.
      </Beat>
      <Beat n={4}>
        To answer you properly: {m.catA} is still your largest discretionary line at {inr(m.right)}, and it clusters on weekends. {m.catB} at {inr(m.delta)} sits in its own bucket, where it belongs.
      </Beat>
      <button onClick={() => onOpen(m.receipt)} className="mt-2 w-full rounded-lg py-2 flex items-center justify-center gap-1.5"
        style={{ background: "#fff", color: C.good, fontSize: 11.5, fontWeight: 600, border: `1px solid #BFE5D9` }}>
        <Receipt size={12} /> Check the {m.receipt.items.length} transactions yourself
      </button>
    </div>
  );
}

function FiguresReply({ byCategory, onOpen, verified }) {
  const total = byCategory.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded-2xl p-4" style={{ maxWidth: "88%", background: "#F5F4F9" }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Figures only, no advice. 1–21 Aug 2026. Tap any line for the transactions.</div>
      {byCategory.slice(0, 7).map((c) => (
        <button key={c.name} onClick={() => onOpen(verified[Math.round(c.value)])}
          className="flex items-center gap-2 w-full py-1">
          <span className="rounded-sm" style={{ width: 8, height: 8, background: CAT_COLOR[c.name] }} />
          <span className="flex-1 text-left" style={{ fontSize: 12.5 }}>{c.name}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5 }}>{inr(c.value)}</span>
        </button>
      ))}
      <div className="flex justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 600 }}>
        <span>Total</span><span style={{ fontFamily: "'DM Mono', monospace" }}>{inr(total)}</span>
      </div>
    </div>
  );
}

function ReceiptDrawer({ r, onClose }) {
  const total = r.items.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3" style={{ background: "rgba(25,24,48,0.42)" }} onClick={onClose}>
      <Card className="w-full flex flex-col" style={{ maxWidth: 440, maxHeight: "78vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div>
            <Eyebrow>The receipt</Eyebrow>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.label}</div>
            <div className="mt-1">
              {r.sound
                ? <Pill tone="good"><Check size={10} /> {r.items.length} transactions, tallied</Pill>
                : <Pill tone="bad"><AlertTriangle size={10} /> includes charges from another category</Pill>}
            </div>
          </div>
          <button onClick={onClose} style={{ color: C.faint }}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {r.items.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2.5 py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span className="rounded-md flex-shrink-0" style={{ width: 8, height: 8, background: CAT_COLOR[t.category] }} />
              <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: !r.sound && t.category === r.strayCat ? 700 : 400, color: !r.sound && t.category === r.strayCat ? C.bad : C.ink }}>
                {t.merchant}
                {!r.sound && t.category === r.strayCat && <span style={{ fontSize: 10, marginLeft: 5 }}>← {r.strayCat}, counted wrong</span>}
              </span>
              <span style={{ fontSize: 10.5, color: C.faint }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, width: 66, textAlign: "right" }}>{inr(t.amount)}</span>
            </div>
          ))}
        </div>
        <div className="p-4 flex justify-between" style={{ borderTop: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500 }}>{inr(total)}</span>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Trust ---------------- */
function TrustPanel({ onClose }) {
  const rows = [
    ["Read-only", "Finamo can see transactions. It can't move a single rupee — there is no payment permission in the connection at all."],
    ["Encrypted", "Data is encrypted in transit and at rest with AES-256. Bank login details are never stored on our side."],
    ["Never sold", "No ads, no data brokers, no 'partner offers'. You're not the product; there's nothing to sell."],
    ["Yours to delete", "One button wipes every transaction, insight and chat. No retention period, no email to support."],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3" style={{ background: "rgba(25,24,48,0.42)" }} onClick={onClose}>
      <Card className="w-full p-6" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>Your data</Eyebrow>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>Four promises, in plain words</h3>
          </div>
          <button onClick={onClose} style={{ color: C.faint }}><X size={18} /></button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {rows.map(([t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="rounded-lg flex items-center justify-center" style={{ width: 28, height: 28, background: C.accentSoft, flexShrink: 0 }}>
                <Check size={14} style={{ color: C.accent }} />
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
                <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl p-3" style={{ background: "#FAF9FD", fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          This prototype runs entirely in your browser on sample data. No bank is connected, nothing is stored anywhere.
        </div>
      </Card>
    </div>
  );
}
