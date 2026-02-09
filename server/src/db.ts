import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = async <T>(
  text: string,
  params?: Array<string | number | null>
) => {
  const result = await pool.query<T>(text, params);
  return result;
};
