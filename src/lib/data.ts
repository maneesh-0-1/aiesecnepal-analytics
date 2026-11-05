// ─── Operational Constants ──────────────

export const programmes = ["iGV", "iGTa", "iGTe", "oGV", "oGTa", "oGTe"] as const;
export type Programme = typeof programmes[number];

export const programmeColors: Record<Programme, string> = {
    iGV: "#F85A40",   // Sunset Orange
    iGTa: "#037EF3",  // Azure Radiance
    iGTe: "#00C16E",  // Jade
    oGV: "#F48924",   // Carrot Orange
    oGTa: "#0CB9C1",  // Cerulean
    oGTe: "#7552CC",  // Fuchsia Blue
};

// ── Member Committees (MCs) - Legacy Fallback ────────────────────────────────
export const mcList = [
    { id: "1585", name: "India", region: "AP" },
    { id: "1600", name: "Indonesia", region: "AP" },
    { id: "1586", name: "Malaysia", region: "AP" },
    { id: "1549", name: "Thailand", region: "AP" },
    { id: "1606", name: "Vietnam", region: "AP" },
    { id: "1551", name: "Philippines", region: "AP" },
    { id: "1598", name: "Sri Lanka", region: "AP" },
    { id: "1556", name: "Australia", region: "AP" },
    { id: "1576", name: "Mainland China", region: "AP" },
    { id: "1567", name: "Hong Kong", region: "AP" },
    { id: "1593", name: "Taiwan", region: "AP" },
    { id: "1573", name: "Japan", region: "AP" },
    { id: "1584", name: "Korea", region: "AP" },
    { id: "1557", name: "Singapore", region: "AP" },
    { id: "1591", name: "Brazil", region: "Americas" },
    { id: "1589", name: "Mexico", region: "Americas" },
    { id: "1554", name: "Colombia", region: "Americas" },
    { id: "1578", name: "Peru", region: "Americas" },
    { id: "1545", name: "Argentina", region: "Americas" },
    { id: "1553", name: "Chile", region: "Americas" },
    { id: "1552", name: "Canada", region: "Americas" },
    { id: "1592", name: "USA", region: "Americas" },
    { id: "1558", name: "Ecuador", region: "Americas" },
    { id: "1571", name: "Panama", region: "Americas" },
    { id: "1555", name: "Costa Rica", region: "Americas" },
    { id: "1546", name: "Bolivia", region: "Americas" },
    { id: "1561", name: "Germany", region: "Europe" },
    { id: "1572", name: "Italy", region: "Europe" },
    { id: "1559", name: "France", region: "Europe" },
    { id: "1580", name: "Spain", region: "Europe" },
    { id: "1603", name: "UK", region: "Europe" },
    { id: "1577", name: "Poland", region: "Europe" },
    { id: "1550", name: "Turkey", region: "Europe" },
    { id: "1565", name: "Greece", region: "Europe" },
    { id: "1575", name: "Netherlands", region: "Europe" },
    { id: "1548", name: "Belgium", region: "Europe" },
    { id: "1563", name: "Austria", region: "Europe" },
    { id: "1594", name: "Switzerland", region: "Europe" },
    { id: "1568", name: "Hungary", region: "Europe" },
    { id: "1579", name: "Romania", region: "Europe" },
    { id: "1581", name: "Portugal", region: "Europe" },
    { id: "1547", name: "Egypt", region: "MEA" },
    { id: "1574", name: "Morocco", region: "MEA" },
    { id: "1596", name: "Tunisia", region: "MEA" },
    { id: "1590", name: "Nigeria", region: "MEA" },
    { id: "1564", name: "Ghana", region: "MEA" },
    { id: "1583", name: "Kenya", region: "MEA" },
    { id: "1588", name: "South Africa", region: "MEA" },
    { id: "1599", name: "UAE", region: "MEA" },
    { id: "1569", name: "Lebanon", region: "MEA" },
    { id: "1560", name: "Jordan", region: "MEA" },
    { id: "1622", name: "Bahrain", region: "MEA" },
    { id: "1623", name: "Kuwait", region: "MEA" },
];

export const LC_NAME_MAP: Record<string, string> = {
    "Delhi": "Delhi",
    "Mumbai": "Mumbai",
    "Bangalore": "Bangalore",
    "Hyderabad": "Hyderabad",
    "Chennai": "Chennai",
    "Pune": "Pune",
    "Kolkata": "Kolkata",
    "Ahmedabad": "Ahmedabad",
    "Jaipur": "Jaipur",
    "Lucknow": "Lucknow",
    "Chandigarh": "Chandigarh",
    "Bhopal": "Bhopal",
    "Surat": "Surat",
    "Visakhapatnam": "Visakhapatnam",
    "Indore": "Indore",
};

export const REGION_MAP: Record<string, string> = {
    "Delhi": "North",
    "Mumbai": "West",
    "Bangalore": "South",
    "Hyderabad": "South",
    "Chennai": "South",
    "Pune": "West",
    "Kolkata": "East",
    "Ahmedabad": "West",
    "Jaipur": "North",
    "Lucknow": "North",
    "Chandigarh": "North",
    "Bhopal": "Central",
    "Surat": "West",
    "Visakhapatnam": "South",
    "Indore": "Central",
};

export const funnelStages = [
    { id: "applied", label: "Applied", color: "#6366F1" },
    { id: "accepted", label: "Accepted", color: "#8B5CF6" },
    { id: "approved", label: "Approved", color: "#EC4899" },
    { id: "realized", label: "Realized", color: "#10B981" },
    { id: "finished", label: "Finished", color: "#F59E0B" },
    { id: "completed", label: "Completed", color: "#3B82F6" },
];
