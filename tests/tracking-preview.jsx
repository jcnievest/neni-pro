import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { OrderTrackingView } from "../src/pages/OrderTracking";
import "../src/index.css";

function TrackingFixture() {
  const [delivered, setDelivered] = useState(false);
  return <OrderTrackingView order={{ reference_number: "123", status: "apartado", delivery_date: "2026-11-01", delivered }} refetch={() => setDelivered(true)} />;
}
createRoot(document.getElementById("root")).render(<TrackingFixture />);
