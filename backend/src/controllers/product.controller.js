import pool from "../config/db.js";

export async function createProduct(req, res) {
  try {
    const { product_id, name } = req.body;

    if (!product_id || !name) {
      return res.status(400).json({
        success: false,
        message: "product_id and name are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO products(product_id,name)
      VALUES($1,$2)
      RETURNING *
      `,
      [product_id, name]
    );

    res.status(201).json({
      success: true,
      product: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

export async function getProducts(req, res) {

  const result = await pool.query(`
      SELECT *
      FROM products
      ORDER BY created_at DESC
  `);

  res.json(result.rows);

}