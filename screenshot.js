const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1536, height: 2000 }); // Large viewport to capture most of the page
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000); // Wait for animations
  await page.screenshot({ path: 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\1a6c6778-9ade-470d-a715-3801453bd4d7\\landing_full_view.png' });
  
  // Mobile view
  await page.setViewportSize({ width: 400, height: 1000 });
  await page.screenshot({ path: 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\1a6c6778-9ade-470d-a715-3801453bd4d7\\landing_mobile_view.png' });
  
  await browser.close();
  console.log('Screenshots captured successfully.');
})();
