import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando arquivos necessários...');

const clientDir = path.join(__dirname, 'client');

// Verificar se existe vite.config.ts
const viteConfigPath = path.join(clientDir, 'vite.config.ts');
if (!fs.existsSync(viteConfigPath)) {
  console.log('📝 Criando vite.config.ts...');
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
  },
  
  server: {
    port: 5000,
    host: "0.0.0.0",
  },
});`);
}

// Verificar se existe tsconfig.node.json
const tsconfigNodePath = path.join(clientDir, 'tsconfig.node.json');
if (!fs.existsSync(tsconfigNodePath)) {
  console.log('📝 Criando tsconfig.node.json...');
  fs.writeFileSync(tsconfigNodePath, `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`);
}

// Verificar se existe lib/utils.ts
const utilsPath = path.join(clientDir, 'src', 'lib', 'utils.ts');
if (!fs.existsSync(utilsPath)) {
  console.log('📝 Criando lib/utils.ts...');
  const utilsDir = path.dirname(utilsPath);
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  fs.writeFileSync(utilsPath, `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`);
}


const requiredDirs = [
  path.join(clientDir, 'src', 'components', 'ui'),
  path.join(clientDir, 'src', 'hooks')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(\`📁 Criando diretório: \${dir}\`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('✅ Verificação completa!');
console.log('📦 Executando build...');