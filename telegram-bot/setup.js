#!/usr/bin/env node
/**
 * FLEUR Baden-Baden - Telegram Bot Setup Script
 *
 * Führt dich durch die Einrichtung des Bots.
 */

const readline = require('readline');
const fs = require('fs').promises;
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('\n===========================================');
    console.log('  FLEUR Baden-Baden Telegram Bot Setup');
    console.log('===========================================\n');

    console.log('Dieser Assistent hilft dir bei der Einrichtung.\n');

    // Step 1: Bot Token
    console.log('SCHRITT 1: Bot Token');
    console.log('--------------------');
    console.log('1. Öffne Telegram und suche nach @BotFather');
    console.log('2. Sende /newbot und folge den Anweisungen');
    console.log('3. Kopiere den Token (sieht aus wie: 123456789:ABCdef...)\n');

    const botToken = await question('Bot Token eingeben: ');
    if (!botToken || !botToken.includes(':')) {
        console.error('Ungültiger Token. Bitte erneut starten.');
        process.exit(1);
    }

    // Step 2: User IDs
    console.log('\nSCHRITT 2: Autorisierte User');
    console.log('----------------------------');
    console.log('1. Öffne Telegram und suche nach @userinfobot');
    console.log('2. Starte den Chat - er zeigt deine User-ID');
    console.log('3. Wiederhole für alle autorisierten Personen\n');

    const userIds = await question('User IDs eingeben (kommagetrennt): ');
    if (!userIds) {
        console.error('Mindestens eine User-ID erforderlich.');
        process.exit(1);
    }

    // Step 3: Output Path
    console.log('\nSCHRITT 3: Ausgabepfad');
    console.log('----------------------');
    const defaultPath = '../public/data/announcement.json';
    const outputPath = await question(`Ausgabepfad [${defaultPath}]: `) || defaultPath;

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Create .env file
    const envContent = `# FLEUR Baden-Baden Telegram Bot - Konfiguration
# Erstellt: ${new Date().toISOString()}

TELEGRAM_BOT_TOKEN=${botToken}
AUTHORIZED_USERS=${userIds}
OUTPUT_PATH=${outputPath}
WEBHOOK_SECRET=${webhookSecret}
LOG_LEVEL=info
PORT=3000
`;

    await fs.writeFile('.env', envContent);
    console.log('\n.env Datei erstellt.');

    // Create output directory
    const path = require('path');
    const outputDir = path.dirname(outputPath);
    try {
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Ausgabeverzeichnis erstellt: ${outputDir}`);
    } catch (e) {
        // Directory might already exist
    }

    // Summary
    console.log('\n===========================================');
    console.log('  Setup abgeschlossen!');
    console.log('===========================================\n');
    console.log('Nächste Schritte:');
    console.log('1. npm install');
    console.log('2. npm start');
    console.log('3. Öffne Telegram und teste mit /status\n');

    console.log('Bot-Befehle für @BotFather (/setcommands):');
    console.log('------------------------------------------');
    console.log('announce - Neue Ankündigung setzen');
    console.log('event - Neues Event hinzufügen');
    console.log('hide - Ankündigung ausblenden');
    console.log('show - Ankündigung einblenden');
    console.log('status - Aktuelle Konfiguration anzeigen');
    console.log('help - Hilfe anzeigen\n');

    rl.close();
}

main().catch(error => {
    console.error('Fehler:', error.message);
    process.exit(1);
});
