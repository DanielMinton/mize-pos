// Currency formatting
export function formatCurrency(
  amount: number | string,
  currency: string = "USD"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
}

// Short currency (no cents if whole number)
export function formatCurrencyShort(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (numAmount % 1 === 0) {
    return `$${numAmount.toFixed(0)}`;
  }
  return `$${numAmount.toFixed(2)}`;
}

// Percentage formatting
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Time formatting
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Relative time (e.g., "5 min ago")
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

// Order number formatting (pad to 3 digits)
export function formatOrderNumber(num: number): string {
  return `#${num.toString().padStart(3, "0")}`;
}

// Ticket age formatting
export function formatTicketAge(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Quantity formatting
export function formatQuantity(qty: number, unit?: string): string {
  if (unit) {
    return `${qty} ${unit}`;
  }
  return qty.toString();
}
