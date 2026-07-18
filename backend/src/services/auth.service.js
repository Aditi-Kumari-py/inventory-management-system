
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

export async function loginUser(username, password) {
  const result = await pool.query(
    `
      SELECT id, username, password_hash
      FROM users
      WHERE username = $1
    `,
    [username]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid username or password");
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new Error("Invalid username or password");
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
}