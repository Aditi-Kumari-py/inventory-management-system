import {
  processPurchase,
  processSale,
} from "../services/fifo.service.js";
import { publishInventoryEvent } from "../producers/inventory.producer.js";
import pool from "../config/db.js";

export async function createPurchase(req, res) {
  try {
    const {
      product_id,
      quantity,
      unit_price,
      timestamp,
    } = req.body;

    if (!product_id || !quantity || !unit_price) {
      return res.status(400).json({
        success: false,
        message:
          "product_id, quantity and unit_price are required",
      });
    }

    const purchase = await processPurchase({
      productCode: product_id,
      quantity: Number(quantity),
      unitPrice: Number(unit_price),
      timestamp: timestamp || new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      purchase,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function publishEvent(req, res) {
  try {
    const {
      product_id,
      event_type,
      quantity,
      unit_price,
      timestamp,
    } = req.body;

    if (!product_id || !event_type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "product_id, event_type and quantity are required",
      });
    }

    if (
      !["purchase", "sale"].includes(event_type)
    ) {
      return res.status(400).json({
        success: false,
        message: "event_type must be purchase or sale",
      });
    }

    if (
      event_type === "purchase" &&
      unit_price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "unit_price is required for purchase",
      });
    }

    const event = await publishInventoryEvent({
      product_id,
      event_type,
      quantity,
      unit_price,
      timestamp,
    });

    return res.status(202).json({
      success: true,
      message: "Inventory event published to Kafka",
      event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
export async function getInventoryOverview(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.product_id,
        p.name,
        COALESCE(SUM(ib.remaining_quantity), 0) AS current_quantity,
        COALESCE(SUM(ib.remaining_quantity * ib.unit_price), 0) AS total_inventory_cost,
        CASE
          WHEN COALESCE(SUM(ib.remaining_quantity), 0) = 0 THEN 0
          ELSE
            SUM(ib.remaining_quantity * ib.unit_price)
            / SUM(ib.remaining_quantity)
        END AS average_cost_per_unit
      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
        AND ib.remaining_quantity > 0
      GROUP BY p.id, p.product_id, p.name
      ORDER BY p.created_at DESC
    `);

    return res.json({
      success: true,
      products: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getTransactionLedger(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM (
        SELECT
          ib.id,
          p.product_id,
          p.name,
          'purchase' AS event_type,
          ib.original_quantity AS quantity,
          ib.unit_price,
          ib.original_quantity * ib.unit_price AS total_cost,
          ib.purchased_at AS transaction_time
        FROM inventory_batches ib
        JOIN products p ON p.id = ib.product_id

        UNION ALL

        SELECT
          s.id,
          p.product_id,
          p.name,
          'sale' AS event_type,
          s.quantity,
          NULL AS unit_price,
          s.total_cost,
          s.sold_at AS transaction_time
        FROM sales s
        JOIN products p ON p.id = s.product_id
      ) ledger
      ORDER BY transaction_time DESC
    `);

    return res.json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
export async function createSale(req, res) {
  try {
    const {
      product_id,
      quantity,
      timestamp,
    } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "product_id and quantity are required",
      });
    }

    const result = await processSale({
      productCode: product_id,
      quantity: Number(quantity),
      timestamp: timestamp || new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}