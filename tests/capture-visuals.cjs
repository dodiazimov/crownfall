const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = '/home/behruz/.gemini/antigravity-cli/brain/357356cc-76c3-456b-b2aa-44fcef4256c2';
const BASE_URL = 'http://127.0.0.1:4173';

(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/home/behruz/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('Browser launched successfully. Starting visual capture suite...');

  // 1. Desktop 1440x900 Overview
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => { state.aiDisabled = true; });
    await page.waitForTimeout(600);
    await page.click('#zoomReset');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-desktop-1440.png') });
    console.log('Saved screenshot-desktop-1440.png');
    await page.close();
  }

  // 2. Mobile 390x844 Portrait View (Non-blocking bottom sheet in peek mode)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => { state.aiDisabled = true; });
    await page.waitForTimeout(600);
    await page.click('#zoomReset');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-mobile-390.png') });
    console.log('Saved screenshot-mobile-390.png');
    await page.close();
  }

  // 3. Tablet 768x1024 View
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="fortifier"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => { state.aiDisabled = true; });
    await page.waitForTimeout(600);
    await page.click('#zoomReset');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-tablet-768.png') });
    console.log('Saved screenshot-tablet-768.png');
    await page.close();
  }

  // 4. Landscape Mobile 844x390 View
  {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => { state.aiDisabled = true; });
    await page.waitForTimeout(600);
    await page.click('#zoomReset');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-landscape-844.png') });
    console.log('Saved screenshot-landscape-844.png');
    await page.close();
  }

  // 5. Castle Selection with CAPTURE REWARD UI Card
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => { state.aiDisabled = true; });
    await page.waitForTimeout(500);

    // Select archer tower (castle 10) to inspect CAPTURE REWARD card
    await page.click('#castle10');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-capture-reward.png') });
    console.log('Saved screenshot-capture-reward.png');
    await page.close();
  }

  // 6. Cavalry Movement March
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => {
      state.aiDisabled = true;
      state.castles[0].units = { soldier: 0, archer: 0, knight: 0, cavalry: 50 };
      state.castles[0].troops = 50;
      updateUI();
    });
    await page.click('#castle2');
    await page.click('#dispatchActionBtn');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-cavalry-march.png') });
    console.log('Saved screenshot-cavalry-march.png');
    await page.close();
  }

  // 7. Archer Movement March
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => {
      state.aiDisabled = true;
      state.castles[0].units = { soldier: 0, archer: 50, knight: 0, cavalry: 0 };
      state.castles[0].troops = 50;
      updateUI();
    });
    await page.click('#castle2');
    await page.click('#dispatchActionBtn');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-archer-march.png') });
    console.log('Saved screenshot-archer-march.png');
    await page.close();
  }

  // 8. Active Road Battle with Swords Clash, Ratio Bar, Live Casualty Indicators
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => {
      state.aiDisabled = true;
      state.progressiveCombat = true;
      const a1 = CrownEngine.dispatch(state, 'blue', 0, 1, 32);
      const a2 = CrownEngine.dispatch(state, 'red', 1, 0, 15);
      CrownEngine.engageBattle(state, [a1, a2]);
      CrownEngine.tickBattles(state, 0.4);
      updateUI();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-road-battle.png') });
    console.log('Saved screenshot-road-battle.png');
    await page.close();
  }

  // 9. Epoch Map & Weather Visual State (17th Century Blizzard)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL);
    await page.evaluate(() => CrownI18n.setLanguage('en'));
    await page.click('#menuSinglePlayBtn');
    await page.click('[data-hero="vanguard"]');
    await page.click('#startGameBtn');
    await page.click('#skipCoach');
    await page.evaluate(() => {
      state.aiDisabled = true;
      state.epoch = '17th';
      state.weather = { type: 'snow', speedMod: 1.0, volleyMod: 0.70 };
      CrownView.init(state);
      updateUI();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot-epoch-weather.png') });
    console.log('Saved screenshot-epoch-weather.png');
    await page.close();
  }

  await browser.close();
  console.log('SUCCESS: All 9 visual screenshots generated and saved to artifact directory!');
})().catch(e => {
  console.error('Visual capture error:', e);
  process.exit(1);
});
