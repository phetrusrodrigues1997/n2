// Event date mappings for penalty-exempt contracts
// Maps contract addresses to their specific event dates
// Used for F1 races and other scheduled events where predictions should be made for a specific date

export const EVENT_DATE_MAPPING = {
  // F1 2025 Season - Add your penalty-exempt contract addresses here
  // Format: "contractAddress": "YYYY-MM-DD" (race date)

  // Formula 1 Tournament Contract
  "0x7357650abC8B1f980806E80a6c3FB56Aae23c45e": "2025-03-16", // Bahrain GP 2025

  // Example races (replace with actual contract addresses):
  // "0xBahrainGP2024": "2024-03-02",
  // "0xSaudiGP2024": "2024-03-09",
  // "0xAustralianGP2024": "2024-03-24",
  // "0xJapaneseGP2024": "2024-04-07",
  // "0xChineseGP2024": "2024-04-21",
  // "0xMiamiGP2024": "2024-05-05",
  // "0xEmiliaRomagnaGP2024": "2024-05-19",
  // "0xMonacoGP2024": "2024-05-26",

} as const;

/**
 * Get the event date for a specific contract address
 * @param contractAddress The contract address to look up
 * @returns The event date string (YYYY-MM-DD) or null if not found
 */
export function getEventDate(contractAddress: string): string | null {
  return EVENT_DATE_MAPPING[contractAddress as keyof typeof EVENT_DATE_MAPPING] || null;
}

/**
 * Check if a contract has a specific event date mapping
 * @param contractAddress The contract address to check
 * @returns True if the contract has an event date mapping
 */
export function hasEventDate(contractAddress: string): boolean {
  return contractAddress in EVENT_DATE_MAPPING;
}