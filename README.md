# RackCraft (Unreal Engine 5.4 Ready) 🌐🕹️

Uma ferramenta web moderna para **geração procedural e modelagem de modelos 3D de equipamentos de rede** (roteadores, switches de borda, modems e servidores de rack) e um **sistema de texturização integrado estilo editor de skins**, projetado especialmente para jogos, simulação e com exportação nativa em escala 1:1 métrica (`.glb`) para a **Unreal Engine 5.4** e **Blender**.

---

## 🚀 Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```
2. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

3. **Gerar build de produção**:
   ```bash
   npm run build
   ```

---

## ✨ Principais Funcionalidades

### 1. Modelagem Procedural Paramétrica (Hardware)
- **Presets de Equipamentos**:
  - *Roteador Doméstico Wi-Fi*
  - *Mini Switch Desktop 8 Portas*
  - *Switch 1U de Rack 19"*
  - *Switch 2U Core / Enterprise*
- **Controle de Dimensões**: Largura, Altura e Profundidade ajustáveis com pés de borracha e orelhas de rack (*rack ears*) opcionais.
- **Portas de Rede Ethernet (RJ45)**:
  - Portas LAN (Amarelas) configuráveis de 0 a 48 portas.
  - Portas WAN (Azuis) configuráveis de 0 a 4 portas.
  - Disposição em fileira única (1xN) ou dupla (2xN).
  - Porta Console (Azul claro) para switches gerenciáveis.
- **Portas Ópticas de Fibra**:
  - **SFP** (1G)
  - **SFP+** (10G)
  - **SFP28** (25G)
  - **QSFP / QSFP28** (40G / 100G de alta velocidade)
- **Fontes de Alimentação**:
  - **DC Barrel Jack**: Conector circular redondo com pino central (12V tipo notebook e roteadores residenciais).
  - **IEC C14**: Tomada de 3 pinos trapezoidal de computadores e servidores de rack.
  - Chave Liga/Desliga (*Rocker switch* e *Push button*).
  - Suporte a fontes simples ou redundantes (Dual IEC / Dual DC).
- **Antenas Wi-Fi Articuladas**: De 0 a 8 antenas com articulação SMA dourada, ajuste de altura e abertura em leque.
- **Painel Frontal**: LEDs de status com material emissivo (*Lumen Glow*), botão WPS, orifício de RESET e display OLED.

---

### 2. Editor de Texturas 3D & 2D (Minecraft Skin Style)
- **Pintura 3D Direta (Raycast)**: Pinte diretamente sobre a malha 3D do roteador com o mouse.
- **Canvas 2D UV Sheet**: Visualize a textura desdobrada com contornos das faces (Topo, Frente, Traseira, Base e Laterais).
- **Ferramentas**:
  - Pincel com tamanho e opacidade ajustáveis.
  - Balde de tinta (*Flood Fill*) para preenchimento rápido.
  - Borracha.
  - Conta-gotas (*Eyedropper*).
  - Carimbos e Decals: Logos (*NETSYS*, *RouterOS*), selos de portas (*1000M*, *10G SFP+*, *100G QSFP*), *Wi-Fi 6*, código de barras/MAC address e etiquetas de tensão.
  - Histórico de Desfazer/Refazer (*Undo/Redo*).

---

### 3. Integração com a Unreal Engine 5.4
1. Clique no botão **"Exportar .GLB (UE 5.4)"**.
2. No seu projeto da Unreal Engine 5.4, arraste o arquivo `.glb` diretamente para o **Content Browser**.
3. O importador nativo da Unreal (Interchange) criará a Static Mesh e os materiais PBR automaticamente.
4. Para fazer os LEDs brilharem no escuro com o **Lumen**, abra a instância do material e aumente a intensidade do canal *Emissive*.
5. A escala da malha é centimétrica (1 unidade = 1 cm), perfeita para o padrão da Unreal Engine.

---

### 4. Salvar e Carregar Presets
- Exporte o modelo e a textura a qualquer momento em arquivo `.json` clicando em **"Salvar Preset"**.
- Recarregue e continue editando modelos anteriores através do botão **"Carregar"**.
- Exporte também apenas a folha de textura limpa em formato `.png`.
