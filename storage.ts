
import { FusedReport } from "./types";

const STORAGE_KEY = 'fcc_runs_v2';

// Simulate database network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storage = {
  /**
   * Save a new report to history (Mocking Supabase INSERT).
   */
  async saveFusedReport(report: FusedReport): Promise<void> {
    await delay(300); // Sim latency
    try {
      const existingStr = localStorage.getItem(STORAGE_KEY);
      const existing: FusedReport[] = existingStr ? JSON.parse(existingStr) : [];
      // Prepend new report, cap at 50 items
      const updated = [report, ...existing].slice(0, 50); 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save report to storage", e);
    }
  },

  /**
   * Get list of recent reports (Mocking Supabase SELECT).
   */
  async listRecentReports(): Promise<FusedReport[]> {
    await delay(300);
    try {
      const existingStr = localStorage.getItem(STORAGE_KEY);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Get a specific report by ID.
   */
  async getReportById(id: string): Promise<FusedReport | null> {
    await delay(100);
    const reports = await storage.listRecentReports();
    return reports.find(r => r.id === id) || null;
  }
};
