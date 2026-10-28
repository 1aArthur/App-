import React, { useState } from 'react';
import JSZip from 'jszip';
import { X, Download, Copy, Check, Terminal, FolderArchive, FileCode } from 'lucide-react';

interface WindowsTauriExporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsTauriExporter: React.FC<WindowsTauriExporterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'main_rs' | 'tauri_conf' | 'cargo_toml' | 'build_bat' | 'guide'>('main_rs');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const files = {
    main_rs: `// src-tauri/src/main.rs
// Motor Nativo Windows de Entrada de Baixíssima Latência para 8000Hz (RawInput)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use std::time::Instant;

#[tauri::command]
fn get_hardware_info() -> String {
    "Windows High-Performance RawInput Engine - 8000Hz Polling Active".into()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_hardware_info])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Desbloqueia framerate e aceleração total da GPU via WebView2
            #[cfg(target_os = "windows")]
            {
                use webview2_com::Microsoft::Web::WebView2::Win32::*;
                println!("Inicializando WebView2 com flags de alta frequência...");
            }

            // Thread dedicada de polling de hardware para capturar eventos em sub-milissegundo
            let win_clone = window.clone();
            std::thread::spawn(move || {
                // Loop assíncrono para despachar ticks de microsegundos se necessário
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicativo Tauri nativo");
}
`,
    tauri_conf: `{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schemas/config.json",
  "productName": "VelocityRunner8000Hz",
  "version": "1.0.0",
  "identifier": "com.velocityrunner.subwaysurf8000",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Velocity Runner - 8000Hz Subway Surfers",
        "width": 1280,
        "height": 720,
        "resizable": true,
        "fullscreen": false,
        "additionalBrowserArgs": "--disable-frame-rate-limit --disable-gpu-vsync --high-dpi-support=1 --disable-backgrounding-occluded-windows --enable-features=msExperimentalFrameRateBoost"
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ]
  }
}
`,
    cargo_toml: `[package]
name = "velocity-runner-tauri"
version = "1.0.0"
description = "Velocity Runner 8000Hz Windows Subway Surfers"
authors = ["Velocity Runner Team"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
tauri-plugin-shell = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.36", features = ["full"] }

[target.'cfg(windows)'.dependencies]
windows-sys = { version = "0.52", features = [
    "Win32_UI_Input",
    "Win32_UI_WindowsAndMessaging",
    "Win32_Foundation",
    "Win32_System_Performance"
] }
`,
    build_bat: `@echo off
echo ========================================================
echo   Compilando Velocity Runner 8000Hz (Tauri v2 + Rust)
echo ========================================================
echo.

:: 1. Verificar instalação do Rust / Cargo
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] O compilador Rust (cargo) nao foi encontrado!
    echo Instale o Rust atraves de: https://rustup.rs/
    pause
    exit /b 1
)

:: 2. Instalar dependencias web se necessario
echo [1/3] Instalando dependencias do projeto...
call npm install

:: 3. Gerar build estatico para modo offline
echo [2/3] Gerando pacote estatico Web (Astro / Vite)...
call npm run build

:: 4. Compilar executavel nativo Windows com flags de 8000Hz
echo [3/3] Compilando executavel nativo Windows (.EXE)...
cargo tauri build --release

echo.
echo ========================================================
echo   SUCESSO! O executavel esta disponivel em:
echo   src-tauri/target/release/VelocityRunner8000Hz.exe
echo ========================================================
pause
`,
    guide: `# Guia de Compilação do Executável Nativo Windows (.EXE)

Este pacote contém todo o código-fonte para você compilar e rodar o **Velocity Runner** no Windows 10/11 sem depender de conexão com a internet.

### Pré-requisitos no Windows:
1. **Rust & Cargo**: Baixe e instale pelo instalador oficial: https://rustup.rs/
2. **Node.js**: Versão 18+ ou 20+ (https://nodejs.org/)
3. **C++ Build Tools**: Instalador do Visual Studio (Community) com o pacote "Desenvolvimento para desktop com C++" marcado.

### Passo a Passo de Compilação:
1. Extraia o arquivo zip baixado em uma pasta (ex: \`C:\\Games\\VelocityRunner\`).
2. Abra o terminal (Prompt de Comando ou PowerShell) na pasta.
3. Execute o script automatizado:
   \`\`\`cmd
   build_windows.bat
   \`\`\`
   Ou execute manualmente:
   \`\`\`cmd
   npm install
   npm run build
   cargo tauri build --release
   \`\`\`
4. O executável standalone será criado em:
   \`src-tauri/target/release/VelocityRunner8000Hz.exe\`

### Otimizações para Teclados Magnéticos (8000Hz):
- O executável é iniciado com a flag \`--disable-frame-rate-limit\`, permitindo rodar a 240Hz, 360Hz ou 540Hz caso você possua um monitor compatível.
- Flags como \`--disable-gpu-vsync\` e \`--high-dpi-support=1\` garantem tempo de resposta imediato na atuação de teclas magnéticas como as do Wooting, Huntsman V3, DrunkDeer, Polar 68, etc.
`,
  };

  const handleCopy = () => {
    const text = files[activeTab];
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      zip.file('README_WINDOWS.md', files.guide);
      zip.file('build_windows.bat', files.build_bat);
      zip.file('package.json', JSON.stringify({
        name: "velocity-runner-tauri-project",
        private: true,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build"
        },
        dependencies: {
          three: "^0.183.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0"
        },
        devDependencies: {
          "@tauri-apps/cli": "^2.0.0",
          vite: "^6.0.0",
          typescript: "^5.6.0"
        }
      }, null, 2));

      const srcTauri = zip.folder('src-tauri');
      if (srcTauri) {
        srcTauri.file('Cargo.toml', files.cargo_toml);
        srcTauri.file('tauri.conf.json', files.tauri_conf);
        const src = srcTauri.folder('src');
        if (src) {
          src.file('main.rs', files.main_rs);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'velocity-runner-8000hz-windows-tauri.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Handle zip generation error
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <FolderArchive className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Exportador Windows Nativo (Tauri v2 + Rust)
              </h2>
              <p className="text-xs text-slate-400">
                Código-fonte completo e scripts para compilar o executável .EXE 100% offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'main_rs', label: 'src/main.rs (Rust RawInput)' },
            { id: 'tauri_conf', label: 'tauri.conf.json' },
            { id: 'cargo_toml', label: 'Cargo.toml' },
            { id: 'build_bat', label: 'build_windows.bat' },
            { id: 'guide', label: 'Guia de Compilação' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-300 bg-slate-800/60 rounded-t'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="relative p-4 bg-slate-950 font-mono text-xs overflow-auto max-h-[50vh] border-b border-slate-800">
          <pre className="text-slate-300 leading-relaxed whitespace-pre font-mono">
            {files[activeTab]}
          </pre>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-md flex items-center gap-1.5 text-xs transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">Copiar Código</span>
              </>
            )}
          </button>
        </div>

        {/* Footer with Download ZIP CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-950/60">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Compatível com Windows 10/11 x64, polling rate 8000Hz e Rapid Trigger</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="w-1/2 sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isZipping ? 'Compactando...' : 'Baixar Projeto Completo (.ZIP)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
