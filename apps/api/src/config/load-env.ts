import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    config({ path: envPath });
  }
}
