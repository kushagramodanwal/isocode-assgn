
/**
 * Outbound SMS / WhatsApp adapter. Mocked: the brief says to mock messages and outside systems.
 * A real gateway (e.g. an Indian DLT-registered SMS provider) would be wired in here.
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[sms:mock] to ${phone.slice(0, 2)}••••••${phone.slice(-2)}: ${text.replace(/\d{6}/, "••••••")}`);
  }
}
