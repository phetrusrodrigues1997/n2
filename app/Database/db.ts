import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Database connections
let primaryDb: ReturnType<typeof drizzle> | null = null;
let readReplicaDb: ReturnType<typeof drizzle> | null = null;

// Initialize primary database connection (for writes and critical reads)
function getPrimaryDb() {
  if (!primaryDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    const sqlConnection = neon(process.env.DATABASE_URL);
    primaryDb = drizzle(sqlConnection);
  }
  return primaryDb;
}

// Initialize read replica database connection (for read-only queries)
function getReadReplicaDb() {
  if (!readReplicaDb) {
    if (!process.env.READ_REPLICA_URL) {
      // Fallback to primary database if read replica is not configured
      console.warn('READ_REPLICA_URL is not set, falling back to primary database');
      return getPrimaryDb();
    }
    const sqlConnection = neon(process.env.READ_REPLICA_URL);
    readReplicaDb = drizzle(sqlConnection);
  }
  return readReplicaDb;
}

// Export database connections
export const db = getPrimaryDb(); // Primary database for writes (backward compatibility)
export const readDb = getReadReplicaDb(); // Read replica for reads

// Helper functions for specific use cases
export function getDbForWrite() {
  return getPrimaryDb();
}

export function getDbForRead() {
  return getReadReplicaDb();
}

// Legacy export for backward compatibility
export function getDb() {
  return getPrimaryDb();
}