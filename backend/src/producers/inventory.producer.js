import { randomUUID } from "crypto";
import { producer } from "../config/kafka.js";

let producerConnected = false;

async function connectProducer() {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
    console.log("✅ Kafka producer connected");
  }
}

export async function publishInventoryEvent(event) {
  await connectProducer();

  const payload = {
    event_id: event.event_id || randomUUID(),
    product_id: event.product_id,
    event_type: event.event_type,
    quantity: Number(event.quantity),
    unit_price:
      event.event_type === "purchase"
        ? Number(event.unit_price)
        : undefined,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  await producer.send({
    topic: process.env.KAFKA_TOPIC,
    messages: [
      {
        key: payload.product_id,
        value: JSON.stringify(payload),
      },
    ],
  });

  return payload;
}