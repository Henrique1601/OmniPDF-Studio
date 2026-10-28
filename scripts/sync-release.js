#!/usr/bin/env node

/**
 * OmniPDF Studio - Script de Verificação & Sincronização de Releases
 * Garante que package.json, src/constants/version.ts, landing/index.html e Vercel estejam sincronizados.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 [OmniPDF Studio] Verificando integridade das versões...\n');

const rootDir = path.resolve(__dirname, '..');

// 1. Ler package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const pkgVersion = pkg.version;
console.log(`📦 package.json versão: ${pkgVersion}`);

// 2. Ler src/constants/version.ts
const versionTsPath = path.join(rootDir, 'src', 'constants', 'version.ts');
if (!fs.existsSync(versionTsPath)) {
  console.error('❌ ERRO: src/constants/version.ts não encontrado!');
  process.exit(1);
}
const versionTsContent = fs.readFileSync(versionTsPath, 'utf8');
const versionMatch = versionTsContent.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const constVersion = versionMatch ? versionMatch[1] : null;
console.log(`💻 src/constants/version.ts versão: ${constVersion}`);

// 3. Ler landing/index.html
const landingPath = path.join(rootDir, 'landing', 'index.html');
const landingContent = fs.readFileSync(landingPath, 'utf8');
const hasCorrectSetupLink = landingContent.includes(`Setup.${pkgVersion}.exe`);
const hasCorrectTitleVersion = landingContent.includes(`v${pkgVersion}`);
console.log(`🌐 landing/index.html link de instalador v${pkgVersion}: ${hasCorrectSetupLink ? '✅ OK' : '❌ NÃO ENCONTRADO'}`);

// Validação
let hasErrors = false;

if (pkgVersion !== constVersion) {
  console.error(`\n❌ DISCREPÂNCIA: package.json (${pkgVersion}) != version.ts (${constVersion})`);
  hasErrors = true;
}

if (!hasCorrectSetupLink || !hasCorrectTitleVersion) {
  console.error(`\n❌ DISCREPÂNCIA: landing/index.html não possui os links atualizados para a versão ${pkgVersion}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n🚫 Abortando: As versões do aplicativo e da landing page estão desalinhadas!');
  process.exit(1);
}

console.log('\n✨ TODAS AS VERSÕES LOCAIS ESTÃO 100% SINCRONIZADAS!');
console.log(`👉 Versão confirmada: v${pkgVersion}`);
console.log('👉 Para realizar deploy da landing page na Vercel:');
console.log('   cd landing && npx vercel --prod --yes');
