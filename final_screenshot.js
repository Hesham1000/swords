const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // 6.8" Screen (iPhone 15 Pro Max equivalent)
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto('http://localhost:3000/dashboard?tab=wallet');
  await page.waitForTimeout(3000); // Wait for animations
  
  await page.screenshot({ path: 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\1a6c6778-9ade-470d-a715-3801453bd4d7\\wallet_mobile_6.8_verify.png' });
  
  // Also check the landing page hero on mobile
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\1a6c6778-9ade-470d-a715-3801453bd4d7\\landing_mobile_6.8_verify.png' });

  await browser.close();
  console.log('Mobile screenshots captured.');
})();
