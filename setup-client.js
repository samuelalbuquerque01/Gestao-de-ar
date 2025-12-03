import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== SETUP CLIENT PARA RENDER ===');

const clientDir = path.join(__dirname, 'client');

// 1. tsconfig.node.json
const tsconfigNodePath = path.join(clientDir, 'tsconfig.node.json');
if (!fs.existsSync(tsconfigNodePath)) {
  console.log('Criando tsconfig.node.json...');
  fs.writeFileSync(tsconfigNodePath, `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}`);
}

// 2. vite.config.ts (simplificado)
const viteConfigPath = path.join(clientDir, 'vite.config.ts');
if (!fs.existsSync(viteConfigPath)) {
  console.log('Criando vite.config.ts...');
  fs.writeFileSync(viteConfigPath, `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
  }
});`);
}

// 3. Verificar estrutura de diretórios
const requiredDirs = [
  'src/lib',
  'src/hooks', 
  'src/components/ui'
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(clientDir, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Criando diretório: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// 4. Criar lib/utils.ts se não existir
const utilsPath = path.join(clientDir, 'src/lib/utils.ts');
if (!fs.existsSync(utilsPath)) {
  console.log('Criando utils.ts...');
  fs.writeFileSync(utilsPath, `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`);
}

console.log('\n✅ Setup completo!');
console.log('Arquivos criados/verificados:');
console.log('- client/tsconfig.node.json');
console.log('- client/vite.config.ts');
console.log('- client/src/lib/utils.ts');
console.log('- Estrutura de diretórios');