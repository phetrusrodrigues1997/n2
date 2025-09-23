import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";

// Configure Neon for WebSocket mode (required for transactions)
// NOTE: WebSocket connections may fail in certain deployment environments:
// - Vercel Edge Runtime: Limited WebSocket support
// - Corporate networks: WebSocket traffic may be blocked
// - Serverless environments: Connection timeouts common
// If transactions fail, the system automatically falls back to sequential operations
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineConnect = false;

// Database connections
let primaryDb: ReturnType<typeof drizzle> | null = null;
let readReplicaDb: ReturnType<typeof drizzle> | null = null;
let transactionDb: ReturnType<typeof drizzleServerless> | null = null;

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

// Initialize transaction-capable database connection (for atomic operations)
async function getTransactionDb() {
  if (!transactionDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    try {
      // The neon-serverless driver requires a Pool, not a neon() function
      const connectionString = process.env.DATABASE_URL;

      console.log('🔧 Initializing transaction database with Pool...');
      console.log('🔧 WebSocket available:', typeof WebSocket !== 'undefined');

      // Configure WebSocket for transactions
      neonConfig.webSocketConstructor = (typeof WebSocket !== 'undefined') ? WebSocket : undefined;

      // Create Pool connection for serverless driver (this has the .query method)
      const pool = new Pool({ connectionString });
      console.log('🔧 Pool created successfully');

      transactionDb = drizzleServerless(pool);
      console.log('🔧 Drizzle serverless driver initialized');

      // Test the connection immediately
      console.log('🔧 Testing pool connection...');
      await pool.query('SELECT 1');
      console.log('✅ Pool connection test passed');

      console.log('✅ Transaction database initialized with Pool connection');
    } catch (error) {
      console.error('❌ Failed to initialize transaction database:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', error);
      throw new Error(`Transaction database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return transactionDb;
}

// Export database connections
export const db = getPrimaryDb(); // Primary database for writes (backward compatibility)
export const readDb = getReadReplicaDb(); // Read replica for reads

// Transaction database needs to be initialized asynchronously
let _txDb: any = null;
export const txDb = {
  async transaction(callback: any) {
    if (!_txDb) {
      _txDb = await getTransactionDb();
    }
    return _txDb.transaction(callback);
  }
};

// Helper functions for specific use cases
export function getDbForWrite() {
  return getPrimaryDb();
}

export function getDbForRead() {
  return getReadReplicaDb();
}

export async function getDbForTransaction() {
  return await getTransactionDb();
}

// Legacy export for backward compatibility
export function getDb() {
  return getPrimaryDb();
}