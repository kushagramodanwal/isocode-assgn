import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

export interface SendMessageOptions {
  userId?: string;
  phone?: string;
  channel: 'sms_mock' | 'whatsapp_mock' | 'in_app';
  template: string;
  body: string;
}

export interface SendMessageResult {
  success: boolean;
  notificationId?: string;
}

export interface MessageSender {
  send(options: SendMessageOptions): Promise<SendMessageResult>;
}

export class MockMessageSender implements MessageSender {
  async send(options: SendMessageOptions): Promise<SendMessageResult> {
    const { userId, channel, template, body } = options;

    logger.info(`[MockMessageSender] Sending notification via ${channel}: ${template}`);

    let attempts = 0;
    const maxAttempts = 2; // Rule 1.5: retry once on failure

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: userId || null,
            channel,
            template,
            body,
            status: 'sent',
            attempts,
          },
        });
        return { success: true, notificationId: notif.id };
      } catch (err: any) {
        logger.warn(`[MockMessageSender] Attempt ${attempts} failed to write notification: ${err.message}`);
        if (attempts >= maxAttempts) {
          try {
            const failedNotif = await prisma.notification.create({
              data: {
                userId: userId || null,
                channel,
                template,
                body,
                status: 'failed',
                attempts,
              },
            });
            return { success: false, notificationId: failedNotif.id };
          } catch (e) {
            // Never block the business flow if notifications fail completely (Rule 1.5)
            return { success: false };
          }
        }
      }
    }

    return { success: false };
  }
}
