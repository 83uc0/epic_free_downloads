#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function saveAuthentication() {
  console.log('\n🔐 Saving authentication state...');
  console.log('📝 Log in to Epic Games when the browser opens...\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  await page.goto('https://store.epicgames.com', { waitUntil: 'domcontentloaded' });

  console.log('⏳ Waiting for you to log in... (close browser when done)');
  console.log('⚠️  Once logged in, close the browser window\n');

  // Attendre 90 secondes pour que l'utilisateur se connecte et ferme le navigateur
  await new Promise(resolve => {
    setTimeout(resolve, 90 * 1000);
  });

  console.log('\n💾 Saving authentication state...');

  // Sauvegarder l'état
  const authDir = path.join(process.cwd(), 'auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);

  const state = await context.storageState();
  fs.writeFileSync(path.join(authDir, 'state.json'), JSON.stringify(state, null, 2));

  console.log('✅ Authentication state saved to ./auth/state.json');

  try {
    await context.close();
  } catch (e) {
    // Déjà fermé
  }

  try {
    await browser.close();
  } catch (e) {
    // Déjà fermé
  }
}

saveAuthentication().catch(console.error);
