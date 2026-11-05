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

// ── Nepal Entity Data ────────────────────────────────────────────────────────
export const NEPAL_MC_ID = "112";
export const NEPAL_MC_NAME = "Nepal";

export const mcList = [
    { id: "112", name: "Nepal", full_name: "AIESEC in Nepal", region: "AP" }
];

export const NEPAL_LCS = [
    { id: "53", name: "Kathmandu", full_name: "AIESEC in Kathmandu", region: "Bagmati" },
    { id: "2332", name: "Kathmandu University", full_name: "AIESEC in Kathmandu University", region: "Bagmati" },
    { id: "2345", name: "Patan", full_name: "AIESEC in Patan", region: "Bagmati" },
    { id: "6696", name: "Pokhara", full_name: "AIESEC in Pokhara", region: "Gandaki" },
    { id: "1876", name: "Lumbini", full_name: "AIESEC in Lumbini", region: "Lumbini" },
    { id: "2346", name: "Nepal - National Office", full_name: "AIESEC in Nepal - National Office", region: "National" }
];

export const LC_NAME_MAP: Record<string, string> = {
    "Kathmandu": "Kathmandu",
    "Kathmandu University": "Kathmandu University",
    "Patan": "Patan",
    "Pokhara": "Pokhara",
    "Lumbini": "Lumbini",
    "Nepal - National Office": "National Office",
};

export const REGION_MAP: Record<string, string> = {
    "Kathmandu": "Bagmati",
    "Kathmandu University": "Bagmati",
    "Patan": "Bagmati",
    "Pokhara": "Gandaki",
    "Lumbini": "Lumbini",
    "Nepal - National Office": "National",
};

export const funnelStages = [
    { id: "applied", label: "Applied", color: "#6366F1" },
    { id: "accepted", label: "Accepted", color: "#8B5CF6" },
    { id: "approved", label: "Approved", color: "#EC4899" },
    { id: "realized", label: "Realized", color: "#10B981" },
    { id: "finished", label: "Finished", color: "#F59E0B" },
    { id: "completed", label: "Completed", color: "#3B82F6" },
];
