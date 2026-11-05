import crypto from 'crypto';
import { getMessageSender } from '../../platform/adapters/index.js';
import { config } from '../../platform/config.js';
import { BusinessRuleError, NotFoundError, UnauthorizedError } from '../../platform/errors.js';
import { logger } from '../../platform/logger.js';
import { prisma } from '../../platform/prisma.js';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory rate limiting & OTP storage
const otpStore = new Map<string, OtpEntry>();

export class AuthService {
  private messageSender = getMessageSender();

  async requestOtp(phone: string): Promise<{ success: boolean; maskedPhone: string }> {
    const cleanPhone = phone.trim();
    const maskedPhone =
      cleanPhone.length > 4 ? `••••${cleanPhone.slice(-4)}` : '••••';

    // Generate OTP: if dev otp enabled, use DEMO_OTP_CODE, otherwise generate random 6-digit code
    const otpCode = config.DEV_OTP_ENABLED
      ? config.DEMO_OTP_CODE
      : Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(cleanPhone, {
      code: otpCode,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      attempts: 0,
    });

    // Check if user exists in db (gracefully catch if db is not connected yet)
    let user: any = null;
    try {
      user = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });
    } catch (e: any) {
      logger.warn(`Database lookup skipped during OTP request: ${e.message}`);
    }

    // Deliver OTP via MessageSender (Spec 8: Notification row never stores OTP value)
    await this.messageSender.send({
      userId: user?.id,
      phone: cleanPhone,
      channel: 'sms_mock',
      template: 'otp_sent',
      body: `Your login verification code has been sent to ${maskedPhone}.`,
    });

    logger.info(`OTP requested for phone ${maskedPhone}`);

    // Always return the same response so phone existence is not revealed (Spec 8)
    return { success: true, maskedPhone };
  }

  async verifyOtp(
    phone: string,
    code: string
  ): Promise<{ token: string; user: any; retailer: any }> {
    const cleanPhone = phone.trim();
    const cleanCode = code.trim();

    const entry = otpStore.get(cleanPhone);
    if (!entry) {
      throw new UnauthorizedError('No OTP request found. Please request a new code.');
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(cleanPhone);
      throw new UnauthorizedError('OTP has expired. Please request a new code.');
    }

    entry.attempts++;
    if (entry.attempts > 5) {
      otpStore.delete(cleanPhone);
      throw new BusinessRuleError('Too many failed attempts. Please request a new OTP.');
    }

    if (entry.code !== cleanCode) {
      throw new UnauthorizedError('Invalid verification code');
    }

    // OTP verified: clear entry
    otpStore.delete(cleanPhone);

    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: { retailer: true },
    });

    if (!user || !user.active) {
      throw new NotFoundError('No active account found for this phone number');
    }

    // Create session with random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

    return {
      token: rawToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        retailerId: user.retailerId,
      },
      retailer: user.retailer,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    if (!sessionToken) return;
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }

  async getMe(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { retailer: true },
    });
    if (!user) throw new NotFoundError('User not found');
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      retailerId: user.retailerId,
      retailer: user.retailer,
    };
  }
}
