# Velocity Runner: Subway Surfers 8000Hz Offline Edition

> Jogo estilo endless runner 3D 100% offline com visual urbano de metrô low-poly de altíssimo FPS, motor de input sub-milissegundo calibrado para teclados magnéticos de 8000Hz com Rapid Trigger e exportador completo do projeto nativo Tauri v2 + Rust para Windows.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> - **Estilo Visual**: Clássico urbano estilo metrô com trens e grafites, em modelagem low-poly minimalista ultra-otimizada para máximo FPS (visando suportar 240Hz, 360Hz e 540Hz sem oscilação de frametime).
> - **Calibração de Input**: Resposta sub-milissegundo imediata com simulação e calibração de Rapid Trigger ajustável (0.1mm a 2.0mm de ponto de atuação) para extrair o potencial máximo de switches magnéticos (Wooting, Razer Huntsman V3, DrunkDeer, Polar 68, etc.).
> - **Formato de Entrega**: Jogo web 100% offline com Service Worker / Cache Storage e botão de exportação/download do código-fonte completo do projeto nativo Windows em Tauri v2 + Rust (com `Cargo.toml`, `main.rs` com RawInput hook, `tauri.conf.json` com flags de GPU desbloqueada e scripts de compilação `.bat`).

---

### 1. Overview & Core Concept

- **O que faz**: O jogador assume o controle de um corredor urbano nos trilhos de um metrô subterrâneo e elevado, desviando de trens em movimento, barreiras de sinalização e obstáculos de manutenção, coletando moedas e latas de spray de grafite.
- **Público-alvo**: Jogadores competitivos de jogos de reflexo e usuários com periféricos de alto desempenho (monitores de alta taxa de atualização e teclados magnéticos com polling rate de até 8000Hz).
- **Valor central**: Eliminação completa de input lag. O motor de entrada captura o evento do hardware instantaneamente na thread de eventos sem aguardar o próximo ciclo de renderização (`requestAnimationFrame`), permitindo mudanças de pista imediatas e cancelamento de comandos.

---

### 2. User Experience & Visual Design

#### A. Fluxo de Experiência do Jogador
1. **Zero-State / Splash**: Carregamento instantâneo offline com verificação de hardware (GPU renderer e detecção de taxa de atualização do monitor).
2. **Setup de Teclado Magnético**: Painel de calibração rápida de sensibilidade (ponto de atuação de 0.1mm a 4.0mm, sensibilidade de Rapid Trigger e visualizador de latência em microssegundos $\mu s$).
3. **Gameplay Loop**:
   - 3 trilhos de metrô com troca de pista instantânea (Teclas `A` / `D` ou `Setas`).
   - Salto sobre obstáculos e trens (Tecla `W` ou `Espaço`).
   - Rolamento / Slide por baixo de barreiras altas (Tecla `S` ou `Seta Baixo`).
   - Power-ups: Hoverboard magnético (protege contra 1 colisão), Imã de moedas, Multiplicador 2x de pontuação e Jetpack urbano.
4. **Game Over & Highscore**: Tela de pontuação com estatísticas de inputs registrados, precisão de reflexo, moedas coletadas e recorde salvo localmente via `localStorage`.
5. **Exportador Windows**: Aba modal dedicada permitindo inspecionar e baixar o projeto Tauri v2 com Rust pronto para compilar em `.exe` nativo no Windows.

#### B. Identidade Visual e Tema
- **Direção Estética**: Clássico metrô urbano low-poly com iluminação estilizada. Trens de metrô com faixas de cor e grafites vetoriais, postes de sinalização ferroviária, dormentes de madeira, trilhos de aço reflexivo e túneis de concreto desgastado.
- **Paleta de Cores**:
  - *Canvas Neutro*: Cinza asfalto escuro e concreto subterrâneo (`#0f172a`, `#1e293b`).
  - *Estruturas*: Aço industrial (`#475569`), sinalizadores amarelos de obra (`#f59e0b`) e trens clássicos prata com faixas vermelhas/azuis (`#ef4444`, `#3b82f6`).
  - *Acentos*: Ouro para moedas coletáveis (`#fbbf24`) e neon ciano para power-ups e partículas de velocidade (`#06b6d4`).
- **Tipografia**:
  - Títulos e HUD de velocidade: Fonte geométrica de alto impacto e legibilidade (`Outfit` ou `Plus Jakarta Sans`).
  - Telemetria de Input e FPS: Numerais tabulares monoespaçados (`tabular-nums font-mono`).
- **Composição da Interface (HUD)**:
  - Topo: Pontuação atual, multiplicador e moedas coletadas em tipografia limpa sem caixas pesadas.
  - Canto Superior Esquerdo: Monitor de telemetria compacto (FPS real, $\Delta t$ de input, taxa de amostragem).
  - Rodapé Retrátil: Dock unificado de calibração de input, alternância de controles e botão de exportação nativa Windows.

#### C. Áudio Procedural (Web Audio API)
- Zero arquivos de áudio externos para garantir 100% de disponibilidade offline.
- Sintetizador procedural em tempo real:
  - Som de troca de pista rápida: swoosh de ar comprimido com filtro passa-faixa.
  - Coleta de moedas: tom senoidal cristalino em arpeggio pentatônico.
  - Salto: sweep harmônico ascendente.
  - Slide: ruído branco filtrado com decay rápido (som de atrito no trilho).
  - Colisão e Game Over: impacto metálico e oscilador FM descendente.

---

### 3. Key Product Decisions & Trade-Offs

#### Decisão 1: Arquitetura de Entrada para Teclados de 8000Hz (Rapid Trigger)
- **Abordagem Escolhida**: Escuta direta de `keydown` no nível de documento com `e.repeat === false`, micro-timestamping com `performance.now()` e fila de ação de prioridade zero-latency que calcula imediatamente a transição de coordenada $X$ antes da renderização do frame.
- **Por quê**: Em teclados magnéticos de 8000Hz, a ativação e desativação física da tecla ocorrem em frações de milissegundo (0.1mm de percurso). Esperar o tick do `requestAnimationFrame` para calcular a nova posição introduz até 16.6ms de atraso a 60Hz ou 4.1ms a 240Hz. Computar a física e a animação com interpolação contínua garante resposta instantânea sem "engasgos".
- **Alternativas Descartadas**: Polling em loop de requestAnimationFrame (causaria atraso de até 1 frame completo).

#### Decisão 2: Motor 3D Three.js Otimizado com Geometrias Compartilhadas e Zero-GC
- **Abordagem Escolhida**: Três pistas contínuas com reutilização procedural de blocos de pista (pooling de objetos: trens, barreiras, moedas). Instanciamento e reutilização estrita de `Vector3`, `Matrix4` e `Quaternion` em escopo estático para evitar pausas de Garbage Collector (GC pauses).
- **Por quê**: Pausas de GC no JavaScript causam micro-travamentos ("stutters") de 10-30ms, arruinando a vantagem de um teclado de alta precisão. Com alocação zero no loop principal, o jogo atinge estabilidade de 240+ FPS.

#### Decisão 3: Suporte Offline Web + Exportador Tauri v2 Rust para Windows
- **Abordagem Escolhida**: Implementar o jogo como um PWA web offline completo com Service Worker que funciona diretamente no navegador, combinado com uma suíte de exportação que gera todos os arquivos fonte de um projeto Tauri v2 em Rust configurado para Windows (com bypass de throttling, flags `--disable-frame-rate-limit`, `--high-dpi-support=1` e suporte a RawInput).
- **Por quê**: Permite que o usuário jogue imediatamente no navegador com máxima performance e, ao mesmo tempo, tenha em mãos todo o código fonte pronto para compilar o executável `.exe` independente no Windows.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VELOCITY RUNNER ENGINE                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │  8000Hz Raw Input     │             │  Three.js Render Pipeline  │  │
│  │  Listener & Rapid     ├────────────►│  (Zero-GC Object Pooling,  │  │
│  │  Trigger Engine       │             │   Low-poly Metro Shaders)  │  │
│  └──────────┬────────────┘             └─────────────▲──────────────┘  │
│             │                                        │                 │
│             ▼                                        │                 │
│  ┌───────────────────────┐             ┌─────────────┴──────────────┐  │
│  │  Physics & Collision  │             │  Procedural Audio Engine   │  │
│  │  State Manager        ├────────────►│  (Web Audio Oscillators,   │  │
│  │  (Lanes, Jump, Slide) │             │   Synthesized SFX)         │  │
│  └──────────┬────────────┘             └────────────────────────────┘  │
│             │                                                          │
│             ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Telemetry HUD & Diagnostics (FPS, Input Latency, Polling Rate)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│             │                                                          │
│             ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Native Windows Tauri v2 + Rust Exporter Modal (Offline Bundle)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Dados e Estado do Jogo
- `GameState`: `idle` | `playing` | `paused` | `gameover`
- `PlayerState`:
  - `lane`: `-1` (Esquerda), `0` (Centro), `1` (Direita)
  - `targetX`: posição física alvo calculada instantaneamente
  - `currentX`: posição interpolada com velocidade ajustada
  - `y`: altitude (salto e gravidade com física responsiva)
  - `isSliding`: booleano de rolamento com hitbox reduzida
  - `powerups`: estado ativo de ímã, escudo/hoverboard e multiplicador
- `InputMetrics`:
  - `lastInputTimestamp`: timestamp de alta resolução (`performance.now()`)
  - `measuredLatencyMs`: tempo de processamento do input até o despacho da física
  - `rapidTriggerActuation`: valor configurável de 0.1mm a 4.0mm
  - `pollingRateEstimate`: taxa calculada de eventos por segundo
- `TrackChunk`:
  - `type`: trilho reto, trilho com trem parado, trilho com trem em movimento, barreira alta, barreira baixa, sequência de moedas
  - `z`: posição no eixo de profundidade com reciclagem em pool (repositioning contínuo à frente do jogador)

#### Componentes Principais
1. `GameCanvas.tsx`: Canvas WebGL com Three.js, iluminação PBR estúdio e névoa atmosférica de metrô.
2. `GameHUD.tsx`: HUD leve com pontuação, contador de moedas, multiplicador e barra de vida do hoverboard.
3. `TelemetryOverlay.tsx`: Medidor de desempenho em tempo real para entusiastas de periféricos (FPS, latência de input, estabilidade de frametime).
4. `InputSettingsModal.tsx`: Painel de calibração para teclados magnéticos (Rapid Trigger, sensibilidade, mapeamento de teclas).
5. `WindowsTauriExporter.tsx`: Modal interativo com visualização e download dos arquivos de projeto Tauri v2 + Rust (`src-tauri/Cargo.toml`, `main.rs`, `tauri.conf.json`, `build.bat`, guia completo de compilação sem internet).
6. `audio.ts`: Sintetizador Web Audio API puro, sem dependências de rede.
