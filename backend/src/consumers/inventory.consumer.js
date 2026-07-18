import "dotenv/config";

import pool from "../config/db.js";
import { consumer } from "../config/kafka.js";

import {
  processPurchase,
  processSale,
} from "../services/fifo.service.js";

async function eventAlreadyProcessed(eventId) {
  const result = await pool.query(
    `
    SELECT id
    FROM inventory_events
    WHERE event_id = $1
    `,
    [eventId]
  );

  return result.rows.length > 0;
}

async function saveEvent(event, status, errorMessage = null) {
  await pool.query(
    `
    INSERT INTO inventory_events (
      event_id,
      product_code,
      event_type,
      quantity,
      unit_price,
      event_timestamp,
      status,
      error_message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (event_id) DO NOTHING
    `,
    [
      event.event_id,
      event.product_id,
      event.event_type,
      event.quantity,
      event.unit_price ?? null,
      event.timestamp,
      status,
      errorMessage,
    ]
  );
}

async function processEvent(event) {
  if (
    !event.event_id ||
    !event.product_id ||
    !event.event_type ||
    !event.quantity
  ) {
    throw new Error("Invalid inventory event");
  }

  const alreadyProcessed = await eventAlreadyProcessed(event.event_id);

  if (alreadyProcessed) {
    console.log(`Skipped duplicate event: ${event.event_id}`);
    return;
  }

  if (event.event_type === "purchase") {
    if (event.unit_price === undefined) {
      throw new Error("unit_price is required for purchase");
    }

    await processPurchase({
      productCode: event.product_id,
      quantity: Number(event.quantity),
      unitPrice: Number(event.unit_price),
      timestamp: event.timestamp,
    });
  } else if (event.event_type === "sale") {
    await processSale({
      productCode: event.product_id,
      quantity: Number(event.quantity),
      timestamp: event.timestamp,
    });
  } else {
    throw new Error("event_type must be purchase or sale");
  }

  await saveEvent(event, "processed");

  console.log(
    `✅ Processed ${event.event_type} event for ${event.product_id}`
  );
}

async function startConsumer() {
  try {
    await consumer.connect();

    await consumer.subscribe({
      topic: process.env.KAFKA_TOPIC,
      fromBeginning: false,
    });

    console.log("✅ Kafka consumer connected");
    console.log(`Listening on topic: ${process.env.KAFKA_TOPIC}`);

    await consumer.run({
      eachMessage: async ({ message }) => {
        let event;

        try {
          event = JSON.parse(message.value.toString());

          await processEvent(event);
        } catch (error) {
          console.error("❌ Kafka event failed:", error.message);

          if (event?.event_id) {
            await saveEvent(event, "failed", error.message);
          }
        }
      },
    });
  } catch (error) {
    console.error("❌ Consumer failed:", error.message);
    process.exit(1);
  }
}

startConsumer();