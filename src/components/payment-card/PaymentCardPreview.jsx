
const colorThemes = {
  rose: { from: "#e11d48", to: "#be123c", accent: "#fda4af", text: "white" },
  violet: { from: "#7c3aed", to: "#5b21b6", accent: "#c4b5fd", text: "white" },
  sky: { from: "#0284c7", to: "#0369a1", accent: "#7dd3fc", text: "white" },
  emerald: { from: "#059669", to: "#047857", accent: "#6ee7b7", text: "white" },
  amber: { from: "#d97706", to: "#b45309", accent: "#fcd34d", text: "white" },
  slate: { from: "#475569", to: "#334155", accent: "#cbd5e1", text: "white" },
};

export default function PaymentCardPreview({ cardData, clientName, amount, partial = false }) {
  const theme = colorThemes[cardData?.card_color || "rose"];

  const maskClabe = (clabe) => {
    if (!clabe) return "";
    if (partial) return `**** **** **** ${clabe.slice(-4)}`;
    return clabe;
  };

  const maskCard = (card) => {
    if (!card) return null;
    const clean = card.replace(/\s/g, "");
    if (partial) return `**** **** **** ${clean.slice(-4)}`;
    // Format as groups of 4
    return clean.match(/.{1,4}/g)?.join(" ") || card;
  };

  return (
    <div
      id="payment-card-preview"
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        borderRadius: "16px",
        padding: "24px",
        color: theme.text,
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "180px",
        boxShadow: `0 8px 32px ${theme.from}44`,
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 140, height: 140, borderRadius: "50%",
        background: `${theme.accent}33`,
      }} />
      <div style={{
        position: "absolute", bottom: -30, left: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: `${theme.accent}22`,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <p style={{ fontSize: "10px", opacity: 0.75, marginBottom: "2px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Datos para transferencia
            </p>
            <p style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.2 }}>
              {cardData?.shop_name || "Mi Negocio"}
            </p>
          </div>
          {amount && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", opacity: 0.75 }}>Monto a pagar</p>
              <p style={{ fontSize: "18px", fontWeight: 800 }}>${amount?.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Client if provided */}
        {clientName && (
          <p style={{ fontSize: "12px", opacity: 0.85, marginBottom: "12px", fontWeight: 500 }}>
            Para: {clientName}
          </p>
        )}

        {/* Bank data */}
        <div style={{ marginBottom: "14px" }}>
          {cardData?.holder_name && (
            <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>{cardData.holder_name}</p>
          )}
          {cardData?.bank && (
            <p style={{ fontSize: "11px", opacity: 0.85, marginBottom: "3px" }}>🏦 {cardData.bank}</p>
          )}
          {cardData?.clabe && (
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", opacity: 0.95 }}>
              CLABE: {maskClabe(cardData.clabe)}
            </p>
          )}
          {cardData?.card_number && (
            <p style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
              Tarjeta: {maskCard(cardData.card_number)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${theme.accent}55`, paddingTop: "10px" }}>
          <p style={{ fontSize: "10px", opacity: 0.8 }}>
            {cardData?.payment_note || "Envía tu comprobante por WhatsApp"}
          </p>
          {cardData?.phone && (
            <p style={{ fontSize: "10px", opacity: 0.85, fontWeight: 600 }}>📱 {cardData.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}