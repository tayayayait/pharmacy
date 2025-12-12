import crypto from 'crypto';
import { env } from '../config/env';

// AES-256-GCM 기반 문자열 암복호화 유틸
const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(env.encryptionKey, 'utf8');

if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes for AES-256-GCM');
}

export const encryptString = (plainText: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptString = (cipherText: string): string => {
  const data = Buffer.from(cipherText, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

