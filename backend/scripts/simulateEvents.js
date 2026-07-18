import "dotenv/config";
import { randomUUID } from "crypto";
import { producer } from "../src/config/kafka.js";

const PRODUCT_ID = "PRD001";
const TOPIC = process.env.KAFKA_TOPIC || "inventory-events";

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createPurchase() {
  return {
    event_id: randomUUID(),
    product_id: PRODUCT_ID,
    event_type: "purchase",
    quantity: randomNumber(5, 30),
    unit_price: randomNumber(90, 150),
    timestamp: new Date().toISOString(),
  };
}

function createSale() {
  return {
    event_id: randomUUID(),
    product_id: PRODUCT_ID,
    event_type: "sale",
    quantity: randomNumber(1, 8),
    timestamp: new Date().toISOString(),
  };
}

async function simulateEvents() {
  try {
    await producer.connect();

    const totalEvents = randomNumber(5, 10);

    console.log(`Generating ${totalEvents} Kafka events...`);

    for (let index = 0; index < totalEvents; index += 1) {
      const event =
        Math.random() < 0.65
          ? createPurchase()
          : createSale();

      await producer.send({
        topic: TOPIC,
        messages: [
          {
            key: event.product_id,
            value: JSON.stringify(event),
          },
        ],
      });

      console.log(
        `Published ${event.event_type}:`,
        JSON.stringify(event)
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 800)
      );
    }

    console.log("Simulation completed successfully.");
  } catch (error) {
    console.error("Simulation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await producer.disconnect();
  }
}

simulateEvents();
