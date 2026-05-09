import { parsePdfControlPoints } from './server/pdfControlPointParser';
import { readFileSync } from 'fs';

async function main() {
  const buf = readFileSync('/home/ubuntu/upload/CIP222US80Overlay.pdf');
  const result = await parsePdfControlPoints(buf, 'CIP222US80Overlay.pdf');
  console.log('success:', result.success);
  console.log('pages:', result.totalPages);
  console.log('tables:', result.tablesFound);
  console.log('points:', result.points.length);
  console.log('warnings:', result.warnings);
  result.points.forEach(p => console.log(JSON.stringify(p)));
}
main().catch(console.error);
