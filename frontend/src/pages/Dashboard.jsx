import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN");
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [eventLoading, setEventLoading] = useState(false);

  const [eventForm, setEventForm] = useState({
    product_id: "PRD001",
    event_type: "purchase",
    quantity: 10,
    unit_price: 100,
  });

  const loadDashboard = useCallback(async () => {
    try {
      const [overviewResponse, ledgerResponse] =
        await Promise.all([
          api.get("/inventory/overview"),
          api.get("/inventory/ledger"),
        ]);

      setProducts(overviewResponse.data.products || []);
      setTransactions(
        ledgerResponse.data.transactions || []
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(loadDashboard, 5000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  const totals = useMemo(() => {
    return products.reduce(
      (summary, product) => {
        summary.quantity += Number(
          product.current_quantity || 0
        );

        summary.value += Number(
          product.total_inventory_cost || 0
        );

        return summary;
      },
      {
        quantity: 0,
        value: 0,
      }
    );
  }, [products]);

  function logout() {
    localStorage.removeItem("inventory_token");
    localStorage.removeItem("inventory_user");
    navigate("/login");
  }

  function handleEventChange(event) {
    setEventForm({
      ...eventForm,
      [event.target.name]: event.target.value,
    });
  }

  async function publishEvent(event) {
    event.preventDefault();
    setMessage("");
    setEventLoading(true);

    try {
      const payload = {
        product_id: eventForm.product_id,
        event_type: eventForm.event_type,
        quantity: Number(eventForm.quantity),
      };

      if (eventForm.event_type === "purchase") {
        payload.unit_price = Number(eventForm.unit_price);
      }

      // await api.post("/inventory/events", payload);
      if (payload.event_type === "purchase") {
  await api.post("/inventory/purchase", {
    product_id: payload.product_id,
    quantity: payload.quantity,
    unit_price: payload.unit_price,
  });
} else {
  await api.post("/inventory/sale", {
    product_id: payload.product_id,
    quantity: payload.quantity,
  });
}

      setMessage(
        // "Event published to Kafka successfully. Dashboard will refresh automatically."
        "Event published to Kafka..."
      );

      setTimeout(loadDashboard, 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to publish event"
      );
    } finally {
      setEventLoading(false);
    }
  }
  async function runSimulator() {
  setMessage("");
  setEventLoading(true);

  try {
    const events = [];

    const totalEvents =
      Math.floor(Math.random() * 6) + 5;

    for (let index = 0; index < totalEvents; index += 1) {
      const isPurchase = Math.random() < 0.65;

      const payload = isPurchase
        ? {
            product_id: eventForm.product_id,
            event_type: "purchase",
            quantity:
              Math.floor(Math.random() * 26) + 5,
            unit_price:
              Math.floor(Math.random() * 61) + 90,
          }
        : {
            product_id: eventForm.product_id,
            event_type: "sale",
            quantity:
              Math.floor(Math.random() * 8) + 1,
          };

      events.push(payload);
    }

    for (const payload of events) {
      await api.post("/inventory/events", payload);

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );
    }

    setMessage(
      `${events.length} dummy Kafka events published successfully.`
    );

    setTimeout(loadDashboard, 2000);
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
        "Simulator failed"
    );
  } finally {
    setEventLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-slate-50">
<header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              FIFO Inventory Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Real-time stock, valuation and transaction ledger
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 space-y-8">
        {message && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            {message}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Products
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Available Units
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {totals.quantity}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Inventory Value
            </p>
            <p className="mt-3 text-3xl font-bold text-violet-700">
              {formatMoney(totals.value)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Product Stock Overview
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Inventory Cost</th>
                    <th className="px-6 py-4">Average Cost</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.product_id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {product.product_id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {product.name}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {Number(product.current_quantity)}
                      </td>

                      <td className="px-6 py-4">
                        {formatMoney(
                          product.total_inventory_cost
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {formatMoney(
                          product.average_cost_per_unit
                        )}
                      </td>
                    </tr>
                  ))}

                  {!loading && products.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No products available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={publishEvent}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
          >
         
            <h2 className="text-lg font-bold text-slate-900">
              Kafka Event Simulator
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Publish a purchase or sale event
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Product ID
                </label>

                <select
                  name="product_id"
                  value={eventForm.product_id}
                  onChange={handleEventChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3"
                >
                  {products.map((product) => (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_id} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Event Type
                </label>

                <select
                  name="event_type"
                  value={eventForm.event_type}
                  onChange={handleEventChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3"
                >
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  name="quantity"
                  value={eventForm.quantity}
                  onChange={handleEventChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  required
                />
              </div>

              {eventForm.event_type === "purchase" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Unit Price
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="unit_price"
                    value={eventForm.unit_price}
                    onChange={handleEventChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={eventLoading}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {eventLoading
                  ? "Publishing..."
                  : "Publish Event"}
              </button>
                 {/* <button
  type="button"
  onClick={runSimulator}
  disabled={eventLoading || products.length === 0}
  className="w-full rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
>
  Generate 5–10 Dummy Events
</button> */}
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Transaction Ledger
            </h2>

            <button
              onClick={loadDashboard}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Unit Price</th>
                  <th className="px-6 py-4">Total Cost</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={`${transaction.event_type}-${transaction.id}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(
                        transaction.transaction_time
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {transaction.product_id}
                      </p>
                      <p className="text-sm text-slate-500">
                        {transaction.name}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          transaction.event_type === "purchase"
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {transaction.event_type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {Number(transaction.quantity)}
                    </td>

                    <td className="px-6 py-4">
                      {transaction.unit_price
                        ? formatMoney(
                            transaction.unit_price
                          )
                        : "FIFO"}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {formatMoney(transaction.total_cost)}
                    </td>
                  </tr>
                ))}

                {!loading && transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
