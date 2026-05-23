#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://store.epicgames.com';
const PAGES = 13;
const GAMES_PER_PAGE = 40;
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

async function extractAllGames(page) {
  console.log('\n📥 Extracting games from all pages...');
  const allGames = [];

  for (let pageNum = 0; pageNum < PAGES; pageNum++) {
    const start = pageNum * GAMES_PER_PAGE;
    const url = `${BASE_URL}/browse?sortBy=releaseDate&sortDir=DESC&priceTier=tierFree&category=Game&count=${GAMES_PER_PAGE}&start=${start}`;

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1500);

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
        } catch (e) {}
      }
      console.log(`  ✓ Page ${pageNum + 1}/${PAGES}: ${pageGameCount} games`);
    } catch (e) {
      console.log(`  ⚠ Page ${pageNum + 1}: ${e.message.slice(0, 40)}`);
    }
  }

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
  console.log('\n🎮 EPIC GAMES AUTO-ACQUIRE (UNIFIED)');
  console.log('═'.repeat(50));

  const progress = loadProgress();
  console.log(`\n📋 Progression précédente:`);
  console.log(`   - Jeux trouvés: ${progress.allGames.size}`);
  console.log(`   - Acquis: ${progress.acquiredGames.size}`);
  console.log(`   - Échoués: ${progress.failedGames.size}`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Aller à Epic Games pour que l'utilisateur se connecte
  await page.goto(BASE_URL);
  console.log('\n⚠️  Si vous n\'êtes pas connecté, connectez-vous maintenant');
  console.log('⏳ Attente 60 secondes...\n');
  await page.waitForTimeout(60000);

  // Extraire les jeux
  let allGames;
  if (progress.allGames.size > 0) {
    console.log('\n✓ Utilisant la liste précédente');
    allGames = Array.from(progress.allGames);
  } else {
    allGames = await extractAllGames(page);
    progress.allGames = new Set(allGames);
    saveProgress(progress.allGames, progress.acquiredGames, progress.failedGames);
  }

  // Relancer SEULEMENT les jeux qui ont échoué précédemment
  const toAcquire = Array.from(progress.failedGames);

  console.log(`\n📦 À acquérir: ${toAcquire.length} jeux`);
  console.log(`⏭️ Démarrage de l'acquisition...\n`);

  let success = 0, fail = 0;
  const start = Date.now();

  for (let i = 0; i < toAcquire.length; i++) {
    const slug = toAcquire[i];
    const result = await acquireGame(page, slug);

    if (result) {
      success++;
      progress.acquiredGames.add(slug);
      progress.failedGames.delete(slug); // Retirer du failed si succès
    } else {
      fail++;
      progress.failedGames.add(slug); // Ajouter aux failed si échoue
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

  saveProgress(progress.allGames, progress.acquiredGames, progress.failedGames);
  console.log(`📁 Progression sauvegardée\n`);

  await context.close();
  await browser.close();
}

main().catch(console.error);
