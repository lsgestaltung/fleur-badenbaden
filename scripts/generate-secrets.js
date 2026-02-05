#!/usr/bin/env node

/**
 * FLEUR Baden-Baden - Secret Generator
 *
 * Generiert sichere Secrets für Environment Variables.
 */

const crypto = require('crypto');

console.log('🌸 FLEUR Baden-Baden - Secret Generator');
console.log('========================================\n');

// Generate secrets
const webhookSecret = crypto.randomBytes(32).toString('hex');
const revalidateSecret = crypto.randomBytes(16).toString('hex');

console.log('Kopiere diese Werte in deine Vercel Environment Variables:\n');

console.log('TELEGRAM_WEBHOOK_SECRET=');
console.log(webhookSecret);
console.log('');

console.log('REVALIDATE_SECRET=');
console.log(revalidateSecret);
console.log('');

console.log('========================================');
console.log('⚠️  Speichere diese Secrets sicher!');
console.log('    Sie werden nur einmal angezeigt.');
console.log('========================================\n');

// Also output as copyable block
console.log('Für .env.local (lokale Entwicklung):');
console.log('------------------------------------');
console.log(`TELEGRAM_WEBHOOK_SECRET=${webhookSecret}`);
console.log(`REVALIDATE_SECRET=${revalidateSecret}`);
