const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
const templateFile = path.join(root, 'js', 'supabase-config.template.js');
const outputFile = path.join(root, 'js', 'supabase-config.js');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 0) return [line, ''];
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      })
  );
}

const values = { ...readEnvFile(envFile), ...process.env };
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !values[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const replacements = {
  __SUPABASE_URL__: values.SUPABASE_URL,
  __SUPABASE_ANON_KEY__: values.SUPABASE_ANON_KEY,
  __VAPID_PUBLIC_KEY__: values.VAPID_PUBLIC_KEY || 'YOUR-VAPID-PUBLIC-KEY',
  __ADMIN_PASSWORD__: values.ADMIN_PASSWORD
};

let output = fs.readFileSync(templateFile, 'utf8');
for (const [placeholder, value] of Object.entries(replacements)) {
  output = output.replaceAll(`'${placeholder}'`, JSON.stringify(value));
}

fs.writeFileSync(outputFile, output);
console.log(`Generated ${path.relative(root, outputFile)}`);
