import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

async function seedAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `
        INSERT INTO users (username, password_hash)
        VALUES ($1, $2)
      `,
      [username, passwordHash]
    );

    console.log("Admin user created successfully");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedAdmin();
