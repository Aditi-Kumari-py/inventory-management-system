// import "dotenv/config";
// import { Kafka } from "kafkajs";

// const brokers = process.env.KAFKA_BROKERS
//   .split(",")
//   .map((broker) => broker.trim());

// const kafka = new Kafka({
//   clientId: process.env.KAFKA_CLIENT_ID,
//   brokers,
// });

// export const producer = kafka.producer();

// export const consumer = kafka.consumer({
//   groupId: process.env.KAFKA_GROUP_ID,
// });

// export default kafka;

import "dotenv/config";
import { Kafka } from "kafkajs";

const brokers = (
  process.env.KAFKA_BROKERS || "localhost:9092"
)
  .split(",")
  .map((broker) => broker.trim());

const kafkaOptions = {
  clientId:
    process.env.KAFKA_CLIENT_ID ||
    "inventory-management-api",
  brokers,
};

if (
  process.env.KAFKA_USERNAME &&
  process.env.KAFKA_PASSWORD
) {
  kafkaOptions.ssl = true;
  kafkaOptions.sasl = {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  };
}

const kafka = new Kafka(kafkaOptions);

export const producer = kafka.producer();

export const consumer = kafka.consumer({
  groupId:
    process.env.KAFKA_GROUP_ID ||
    "inventory-management-consumer",
});

export default kafka;