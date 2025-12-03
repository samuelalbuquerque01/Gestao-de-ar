import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== EXECUTANDO PRÉ-BUILD CHECK ===');

const clientDir = path.join(__dirname, 'client');
const srcDir = path.join(clientDir, 'src');


const filesToCheck = [
  'src/components/ui/toaster.tsx',
  'src/components/ui/toast.tsx',
  'src/hooks/use-toast.ts',
  'src/lib/utils.ts'
];

let allFilesExist = true;

filesToCheck.forEach(relativePath => {
  const fullPath = path.join(clientDir, relativePath);
  const exists = fs.existsSync(fullPath);
  
  console.log(`${exists ? '✅' : '❌'} ${relativePath}`);
  
  if (!exists) {
    allFilesExist = false;
    console.log(`   Arquivo não encontrado: ${fullPath}`);
    
    
    if (relativePath === 'src/lib/utils.ts') {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`);
      console.log('   ✅ Arquivo utils.ts criado!');
      allFilesExist = true;
    }
  }
});


const viteConfigPath = path.join(clientDir, 'vite.config.ts');
if (!fs.existsSync(viteConfigPath)) {
  console.log('❌ vite.config.ts não encontrado em client/');
  console.log('   Criando vite.config.ts...');
  
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
  console.log('   ✅ vite.config.ts criado!');
} else {
  console.log('✅ vite.config.ts encontrado');
}

if (allFilesExist) {
  console.log('\n✅ Todos os arquivos necessários existem!');
  console.log('✅ Build pode prosseguir...');
  process.exit(0);
} else {
  console.log('\n❌ Alguns arquivos estão faltando!');
  console.log('❌ Build será interrompido.');
  process.exit(1);
}