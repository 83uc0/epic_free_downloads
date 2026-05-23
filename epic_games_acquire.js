#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://store.epicgames.com';
const PAGES = 13;
const GAMES_PER_PAGE = 40;
const AUTH_FILE = path.join(process.cwd(), 'auth', 'state.json');
const PROGRESS_FILE = path.join(process.cwd(), 'progress.json');


function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return {
      allGames: new Set(data.allGames || []),
      acquiredGames: new Set(data.acquiredGames || []),
      failedGames: new Set(data.failedGames || [])
    };
  }
  return { allGames: new Set(), acquiredGames: new Set(), failedGames: new Set() };
}

function saveProgress(allGames, acquiredGames, failedGames) {
  const data = {
    timestamp: new Date().toISOString(),
    allGames: Array.from(allGames),
    acquiredGames: Array.from(acquiredGames),
    failedGames: Array.from(failedGames)
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

async function extractAllGames() {
  console.log('\n📥 Extracting games from all pages...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const storageState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  const context = await browser.newContext({
    storageState,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const allGames = [];

  for (let pageNum = 0; pageNum < PAGES; pageNum++) {
    const start = pageNum * GAMES_PER_PAGE;
    const url = `${BASE_URL}/browse?sortBy=releaseDate&sortDir=DESC&priceTier=tierFree&category=Game&count=${GAMES_PER_PAGE}&start=${start}`;

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const links = await page.locator('a[href^="/p/"]').all();
      let pageGameCount = 0;

      for (const link of links) {
        try {
          const href = await link.getAttribute('href');
          if (href && href.match(/^\/p\/[\w-]+$/)) {
            const slug = href.replace('/p/', '');
            if (!allGames.includes(slug)) {
              allGames.push(slug);
              pageGameCount++;
            }
          }
        } catch (e) {
          // Link might have been removed from DOM
        }
      }
      console.log(`  ✓ Page ${pageNum + 1}/${PAGES}: ${pageGameCount} games`);
    } catch (e) {
      console.log(`  ⚠ Page ${pageNum + 1}: ${e.message.slice(0, 40)}`);
    }
  }

  await context.close();
  await browser.close();
  return [...new Set(allGames)];
}

async function acquireGame(page, slug) {
  try {
    await page.goto(`${BASE_URL}/p/${slug}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1200);

    let getBtn = await page.locator('button:has-text("Obtenir")').first();
    if (!await getBtn.isVisible().catch(() => false)) {
      getBtn = await page.locator('button:has-text("Get")').first();
    }

    if (!await getBtn.isVisible().catch(() => false)) {
      return false;
    }

    await getBtn.click();
    await page.waitForTimeout(2500);

    let confirmBtn = await page.locator('button:has-text("C\'est pour vous")').first();
    if (!await confirmBtn.isVisible().catch(() => false)) {
      confirmBtn = await page.locator('button:has-text("Claim it")').first();
    }

    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }

    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('\n🎮 EPIC GAMES AUTO-ACQUIRE');
  console.log('═'.repeat(50));

  if (!fs.existsSync(AUTH_FILE)) {
    console.log('\n❌ Authentication file not found!');
    console.log('📋 First run: Execute save_auth.js to authenticate');
    console.log('   Command: pnpm run save-auth\n');
    process.exit(1);
  }

  // Charger la progression précédente
  const progress = loadProgress();
  console.log(`\n📋 Progression précédente:`);
  console.log(`   - Jeux trouvés: ${progress.allGames.size}`);
  console.log(`   - Acquis: ${progress.acquiredGames.size}`);
  console.log(`   - Échoués: ${progress.failedGames.size}`);

  // Extraire les jeux (rapide si déjà fait)
  let allGames;
  if (progress.allGames.size > 0) {
    console.log('\n✓ Utilisant la liste précédente');
    allGames = Array.from(progress.allGames);
  } else {
    allGames = await extractAllGames();
    progress.allGames = new Set(allGames);
  }

  const toAcquire = allGames.filter(g =>
    !progress.acquiredGames.has(g) &&
    !progress.failedGames.has(g)
  );

  console.log(`\n📦 À acquérir: ${toAcquire.length} jeux`);
  console.log(`⏭️ Démarrage de l'acquisition...\n`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  const storageState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  const context = await browser.newContext({
    storageState,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let success = 0, fail = 0;
  const start = Date.now();

  for (let i = 0; i < toAcquire.length; i++) {
    const slug = toAcquire[i];
    const result = await acquireGame(page, slug);

    if (result) {
      success++;
      progress.acquiredGames.add(slug);
    } else {
      fail++;
      progress.failedGames.add(slug);
    }

    if ((i + 1) % 10 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`[${elapsed}s] Progression: ${i + 1}/${toAcquire.length} (✓${success} ✗${fail})`);
      saveProgress(progress.allGames, progress.acquiredGames, progress.failedGames);
    }
    await page.waitForTimeout(800);
  }

  const totalTime = ((Date.now() - start) / 1000).toFixed(0);
  const successRate = toAcquire.length === 0 ? 0 : ((success / toAcquire.length) * 100).toFixed(0);
  console.log('\n' + '═'.repeat(50));
  console.log(`✓ Succès: ${success}`);
  console.log(`✗ Échoués: ${fail}`);
  console.log(`📈 Taux: ${successRate}%`);
  console.log(`⏱️ Temps: ${totalTime}s`);
  console.log('═'.repeat(50) + '\n');

  // Sauvegarder la progression finale
  saveProgress(progress.allGames, progress.acquiredGames, progress.failedGames);
  console.log(`📁 Progression sauvegardée dans progress.json`);

  await context.close();
  await browser.close();
}

main().catch(console.error);
