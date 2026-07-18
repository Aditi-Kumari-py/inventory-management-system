import "dotenv/config";
import { Kafka } from "kafkajs";

const brokers = process.env.KAFKA_BROKERS
  .split(",")
  .map((broker) => broker.trim());

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers,
});

export const producer = kafka.producer();

export const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID,
});

export default kafka;