import { Pool, PoolClient, QueryResultRow, types } from 'pg';
import { env } from '../config/env';

// DATE-Spalten als "JJJJ-MM-TT"-String ausliefern statt als JS-Date (verhindert Zeitzonen-Verschiebungen).
types.setTypeParser(types.builtins.DATE, (value: string) => value);

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}

/** Führt `fn` in einer Transaktion aus (COMMIT bei Erfolg, ROLLBACK bei Fehler). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
