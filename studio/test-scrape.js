const { chromium } = require('playwright');

async function testPage(url, siteName) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'nb-NO',
    });
    const page = await context.newPage();
    
    console.log(`\n=== ${siteName} ===`);
    console.log(`URL: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        if (siteName === 'motorbasen') {
            // Look for spec table rows with label: value pattern
            const rows = await page.$$eval('table tr', rows => 
                rows.slice(0, 30).map(r => {
                    const cells = Array.from(r.querySelectorAll('td'));
                    return cells.map(c => c.innerText.trim()).filter(t => t);
                }).filter(r => r.length >= 2)
            );
            console.log('Tabellrader (label | verdi):');
            rows.forEach(r => console.log(`  ${r[0]} | ${r[1] || ''}`));
        } else {
            // auto-data.net — look for spec table
            const rows = await page.$$eval('table.cardetailsout tr, table tr', rows =>
                rows.slice(0, 40).map(r => {
                    const cells = Array.from(r.querySelectorAll('td, th'));
                    return cells.map(c => c.innerText.trim()).filter(t => t);
                }).filter(r => r.length >= 2)
            );
            console.log('Tabellrader (label | verdi):');
            rows.forEach(r => console.log(`  ${r[0]} | ${r[1] || ''}`));
        }
    } catch (err) {
        console.log('Feil:', err.message);
    }
    
    await browser.close();
}

(async () => {
    await testPage('https://www.motorbasen.no/sider/bil.asp?Id=4912', 'motorbasen');
    await testPage('https://www.auto-data.net/no/mercedes-benz-vito-w447-facelift-2023-panel-van-long-119-cdi-190hp-4matic-9g-tronic-55928', 'auto-data');
})();
