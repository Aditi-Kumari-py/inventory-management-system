
import pool from "../config/db.js";

export async function processPurchase({
  productCode,
  quantity,
  unitPrice,
  timestamp,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
      SELECT id
      FROM products
      WHERE product_id = $1
      `,
      [productCode]
    );

    if (productResult.rows.length === 0) {
      throw new Error("Product not found");
    }

    const product = productResult.rows[0];

    const batchResult = await client.query(
      `
      INSERT INTO inventory_batches (
        product_id,
        original_quantity,
        remaining_quantity,
        unit_price,
        purchased_at
      )
      VALUES ($1, $2, $2, $3, $4)
      RETURNING *
      `,
      [product.id, quantity, unitPrice, timestamp]
    );

    await client.query("COMMIT");

    return batchResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processSale({
  productCode,
  quantity,
  timestamp,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
      SELECT id
      FROM products
      WHERE product_id = $1
      `,
      [productCode]
    );

    if (productResult.rows.length === 0) {
      throw new Error("Product not found");
    }

    const product = productResult.rows[0];

    const stockResult = await client.query(
      `
      SELECT COALESCE(SUM(remaining_quantity), 0) AS available_quantity
      FROM inventory_batches
      WHERE product_id = $1
      `,
      [product.id]
    );

    const availableQuantity = Number(
      stockResult.rows[0].available_quantity
    );

    if (availableQuantity < quantity) {
      throw new Error(
        `Insufficient stock. Available quantity: ${availableQuantity}`
      );
    }

    const batchesResult = await client.query(
      `
      SELECT *
      FROM inventory_batches
      WHERE product_id = $1
        AND remaining_quantity > 0
      ORDER BY purchased_at ASC, created_at ASC
      FOR UPDATE
      `,
      [product.id]
    );

    let remainingToSell = Number(quantity);
    let totalCost = 0;
    const allocations = [];

    for (const batch of batchesResult.rows) {
      if (remainingToSell <= 0) {
        break;
      }

      const batchRemaining = Number(batch.remaining_quantity);
      const unitCost = Number(batch.unit_price);

      const quantityFromBatch = Math.min(
        remainingToSell,
        batchRemaining
      );

      const allocationCost = quantityFromBatch * unitCost;

      await client.query(
        `
        UPDATE inventory_batches
        SET remaining_quantity = remaining_quantity - $1
        WHERE id = $2
        `,
        [quantityFromBatch, batch.id]
      );

      allocations.push({
        inventoryBatchId: batch.id,
        quantity: quantityFromBatch,
        unitCost,
        totalCost: allocationCost,
      });

      totalCost += allocationCost;
      remainingToSell -= quantityFromBatch;
    }

    const saleResult = await client.query(
      `
      INSERT INTO sales (
        product_id,
        quantity,
        total_cost,
        sold_at
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [product.id, quantity, totalCost, timestamp]
    );

    const sale = saleResult.rows[0];

    for (const allocation of allocations) {
      await client.query(
        `
        INSERT INTO sale_allocations (
          sale_id,
          inventory_batch_id,
          quantity,
          unit_cost,
          total_cost
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          sale.id,
          allocation.inventoryBatchId,
          allocation.quantity,
          allocation.unitCost,
          allocation.totalCost,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      sale,
      allocations,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}