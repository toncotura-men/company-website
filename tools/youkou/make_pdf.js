// 大会要項の PDF を作る：node tools/youkou/make_pdf.js 出力先.pdf
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'youkou.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const over = await p.$$eval('.page', ps => ps.map((s, i) => [i + 1, s.scrollHeight > s.clientHeight + 1]).filter(x => x[1]).map(x => x[0]));
  if (over.length) console.log('はみ出しあり: ' + over.join(','));
  await p.pdf({ path: process.argv[2] || 'youkou.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
