import { validateSettings } from "../src/settings.ts";

try {
  validateSettings();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
console.log(`Settings valid for APP_ENV=${process.env.APP_ENV}.`);
