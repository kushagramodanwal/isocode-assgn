import { config } from '../config.js';
import { GeminiLlmClient, LlmClient, MockLlmClient } from './llm.js';
import { MessageSender, MockMessageSender } from './messaging.js';
import { MockPaymentGateway, PaymentGateway } from './payment.js';
import { MockTallyExporter, TallyExporter } from './tally.js';

export * from './llm.js';
export * from './messaging.js';
export * from './payment.js';
export * from './tally.js';

let messageSenderInstance: MessageSender | null = null;
let paymentGatewayInstance: PaymentGateway | null = null;
let tallyExporterInstance: TallyExporter | null = null;
let llmClientInstance: LlmClient | null = null;

export function getMessageSender(): MessageSender {
  if (!messageSenderInstance) {
    messageSenderInstance = new MockMessageSender();
  }
  return messageSenderInstance;
}

export function getPaymentGateway(): PaymentGateway {
  if (!paymentGatewayInstance) {
    paymentGatewayInstance = new MockPaymentGateway();
  }
  return paymentGatewayInstance;
}

export function getTallyExporter(): TallyExporter {
  if (!tallyExporterInstance) {
    tallyExporterInstance = new MockTallyExporter();
  }
  return tallyExporterInstance;
}

export function getLlmClient(): LlmClient {
  if (!llmClientInstance) {
    if (config.LLM_PROVIDER === 'gemini' && config.GEMINI_API_KEY) {
      llmClientInstance = new GeminiLlmClient(config.GEMINI_API_KEY);
    } else {
      llmClientInstance = new MockLlmClient();
    }
  }
  return llmClientInstance;
}
