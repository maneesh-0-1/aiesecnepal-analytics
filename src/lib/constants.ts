export const PRODUCTS = ["iGV", "iGTa", "iGTe", "oGV", "oGTa", "oGTe"] as const;
export type Product = typeof PRODUCTS[number];

export const PRODUCT_COLORS: Record<string, string> = {
    iGV: "#037EF3",  // AIESEC Blue
    iGTa: "#0CB9C1", // Teal
    iGTe: "#7B52CC", // Purple
    oGV: "#F85A40",  // Orange
    oGTa: "#F48924", // Carrot
    oGTe: "#00C16E", // Jade
};

export const STAGE_KEYS = ["APL", "Accepted", "APD", "RE", "FN", "CO"] as const;
export const STAGE_COLORS = ["#037EF3", "#0CB9C1", "#F48924", "#00C16E", "#7B52CC", "#F85A40"];

export const REGION_COLORS: Record<string, string> = {
    North: "#037EF3",
    South: "#00C16E",
    East: "#F48924",
    West: "#F85A40",
    Central: "#7B52CC",
    Other: "#94a3b8"
};

export const STAGE_CONFIG = {
    signups: { r: 3, g: 126, b: 243, label: 'SU', color: "#037EF3" },
    applicants: { r: 82, g: 86, b: 94, label: 'APL', color: "#52565E" },
    accepted: { r: 12, g: 185, b: 193, label: 'ACC', color: "#0CB9C1" },
    approved: { r: 248, g: 90, b: 64, label: 'APD', color: "#F85A40" },
    realized: { r: 0, g: 193, b: 110, label: 'RE', color: "#00C16E" },
    finished: { r: 117, g: 82, b: 204, label: 'FN', color: "#7B52CC" },
    completed: { r: 244, g: 137, b: 36, label: 'CO', color: "#F48924" }
};

export const fmt = (n: number | undefined) => (n ?? 0).toLocaleString();
export const pct = (a: number | undefined, b: number | undefined) => (b && b > 0 ? (((a ?? 0) / b) * 100).toFixed(1) : "0.0");
