import { createBusinessApp } from './bootstrap';
async function main() {
  const app = await createBusinessApp();
  const port = Number(process.env.BUSINESS_PORT || 3037);
  await app.listen(port, '127.0.0.1');
  console.log(`IPDOS synthetic business flow: http://127.0.0.1:${port}; no external services configured`);
}
void main();
