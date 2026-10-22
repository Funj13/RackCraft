# RackCraft (Unreal Engine 5.4 Ready) 🌐🕹️

Uma ferramenta web para **geração procedural de equipamentos de rede, ambientes e casas low-poly**, com editor de texturas para equipamentos, projetada para jogos e simulação. Exporta modelos `.glb` em escala real para **Unreal Engine 5.4** e **Blender**.

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
5. A modelagem usa centímetros; o exportador aplica escala `0.01` numa cópia para gravar metros no GLB. A Unreal importa esses metros como centímetros, mantendo tamanho real 1:1.

---

### 4. Salvar e Carregar Presets
- Exporte o modelo e a textura a qualquer momento em arquivo `.json` clicando em **"Salvar Preset"**.
- Recarregue e continue editando modelos anteriores através do botão **"Carregar"**.
- Exporte também apenas a folha de textura limpa em formato `.png`.

### 5. Ambientes / Casas — Quarto low-poly

A biblioteca abre em **Ambientes / Casas → Casa completa**. **Quarto individual** mantém o gerador de cômodos simples descrito nesta seção. A categoria **Equipamentos de rede** mantém o editor de roteadores e switches. Os editores preservam seu estado ao alternar categorias durante a sessão; salve um preset antes de fechar a página.

O primeiro gerador de ambientes cria um cômodo retangular com largura, profundidade e altura internas em centímetros, espessura de piso e paredes, teto opcional e quatro paredes independentes. Porta central na parede frontal com opção aberta/fechada e janela central na parede traseira com peitoril ajustável. Ao diminuir o cômodo, as aberturas são limitadas ao espaço disponível. As cores são configuradas por material.

**Vista em corte** oculta o teto e as paredes frontal/direita apenas no editor. O GLB sempre exporta a estrutura habilitada no painel, com peças nomeadas e piso em Y=0. O preset de ambiente usa JSON versão 2.0 com categoria, tipo e unidades; é carregado pelo botão **Carregar ambiente**. Presets antigos de rede continuam sendo carregados pelo editor de rede.

O editor de quarto individual mantém a estrutura simples de um cômodo. Para materiais Bedroom, mobília, múltiplos cômodos, pavimentos e cobertura, use **Casa completa** (também aceita planta 1 × 1). A biblioteca derivada de `Bedroom.glb` acompanha o aplicativo; o arquivo original em Downloads não é necessário para executá-lo. A pintura UV do editor de rede permanece específica aos equipamentos.

Execute `npm run verify:room` para verificar dimensões, limites de aberturas, validação de presets, isolamento da vista em corte e escala métrica do GLB exportado.

### 6. Casa completa — múltiplos cômodos e dois pavimentos

- **Planta em grade**: de 1 a 4 linhas e de 1 a 4 colunas, compartilhadas pelos pavimentos. Cada coluna tem largura própria e cada linha tem profundidade própria. A grade reserva espaço, mas **Largura deste cômodo** e **Profundidade deste cômodo** ajustam apenas o ambiente selecionado no pavimento atual. Os controles antigos ficam em **Dimensões da grade (afetam vizinhos)**; alterar esses eixos ou as dimensões totais continua afetando a grade nos dois andares.
- **Dimensões individuais**: mínimo de 120 cm, máximo do espaço reservado pela célula. O ambiente encolhe preservando os acessos; uma alteração que desconectaria portas é recusada. O espaço liberado fica vazio, indicado pela área escura na planta, sem ser redistribuído aos vizinhos. Piso, paredes, foco e móveis acompanham as dimensões reais. **Ocupar toda a célula novamente** remove o tamanho individual. A célula da escada mantém as medidas estruturais da grade. A cobertura continua abrangendo a grade inteira.
- **Paredes compartilhadas**: trechos colineares da mesma divisória são gerados uma única vez. Editar uma abertura pelo cômodo vizinho altera a mesma configuração. As opções são parede fechada, porta, janela e passagem livre (remove a divisória). Portas compartilhadas ficam no centro da interseção real dos ambientes, com dimensões ajustáveis; janelas são limitadas ao trecho disponível.
- **Um ou dois pavimentos**: casa térrea ou térreo + 1º andar. Cada andar tem pé-direito, nomes, pisos, tamanhos individuais e aberturas próprios, posicionados na grade comum.
- **Escada em U**: reserva uma célula da fileira do fundo em ambos os pavimentos. Inclui dois lances, patamar, corrimãos, circulação superior e guarda-corpo. A laje superior tem um vão real; a escada termina na elevação do piso superior. As dimensões mínimas aumentam automaticamente para acomodar a escada. É possível desativá-la para gerar pavimentos independentes.
- **Cobertura**: duas águas, plana ou ausente, com cor e beiral configuráveis. A cobertura fica sobre o último pavimento.
- **Visualização**: vista em corte, ocultação da cobertura, isolamento do pavimento e **Focar cômodo selecionado** afetam apenas o viewport. O foco mostra somente aquele ambiente, com as paredes frontal/direita ocultas no modo corte. O GLB sempre inclui todos os pavimentos, móveis, aberturas, escada e cobertura habilitados no modelo. A iluminação do viewport inclui sombras; a iluminação final do motor do jogo pode produzir aparência diferente mesmo com os mesmos materiais.
- **Gerar casa aleatória**: sorteia grade, larguras das colunas, profundidades das linhas, número de pavimentos, pé-direito, cobertura, estados das aberturas e disposição dos móveis. **Sortear tamanhos dos cômodos** mantém nomes, tipos e pavimentos e muda apenas os tamanhos. **Desfazer geração** restaura a planta anterior ao último sorteio.
- **Presets**: **Salvar casa** grava JSON versão `4.0`, categoria `environment`, tipo `house`, unidades `cm`. Inclui dimensões variáveis, estilo, tipos de cômodo, revestimentos, ativação da mobília e sementes de distribuição. **Carregar casa** aceita versões `3.0` e `4.0` e converte quartos `2.0`. Casas antigas mantêm células iguais, cores personalizadas e móveis/detalhes desativados até que o usuário os habilite.

### 7. Acabamento Bedroom e mobília por ambiente

O modelo original **não possui imagens de textura**. Seu acabamento vem de materiais PBR e detalhes modelados. `src/assets/bedroom-library.glb` mantém os **38 materiais originais**, com fatores de cor, rugosidade, emissão, transmissão, IOR e especular. O piso de tábuas, a porta com painéis, a moldura da porta, tomadas, interruptores, cama, cômoda, luminária e estação de trabalho foram extraídos da geometria original. A estação inclui mesa, cadeira, PC, monitor, teclado, mouse e mousepad. Os rodapés são paramétricos, com perfil e altura de 15,09 cm e material Baseboard da referência.

O estilo **Bedroom original** aplica a paleta PBR exata; **Cores personalizadas** permite ajustar as cores da arquitetura mantendo os detalhes quando habilitados. Escolha tábuas originais, cerâmica low-poly ou cor lisa para o piso de cada cômodo. O piso de tábuas é redimensionado para a área disponível; a quantidade/disposição de tábuas vem da referência.

- **Quarto**: cama e escrivaninha/estação de trabalho originais, mesa de cabeceira e cômoda.
- **Banheiro**: pia com gabinete e torneira, chuveiro com box e privada.
- **Cozinha**: geladeira, forno/fogão, mesa com duas cadeiras e bancada com pia.
- **Sala**: sofá, TV com rack e mesa de centro.
- **Escritório**: estação de trabalho e cômoda/armário.
- **Lavanderia**: máquina de lavar e pia.

Os móveis que não existem no Bedroom foram modelados proceduralmente com os materiais da mesma biblioteca. **Tipo de cômodo** define a mobília; renomear um ambiente reconhecido também atualiza o tipo quando não há uma escolha manual diferente. Use **Gerar móveis neste cômodo**, **Reorganizar móveis** ou **Mobiliar todos os cômodos**. A semente salva no preset garante a mesma disposição na visualização, na exportação e após carregar novamente.

A distribuição testa limites do cômodo, colisões entre caixas dos móveis e corredores das portas até o centro. Móveis apoiados nas paredes ficam voltados para o interior. A célula da escada não recebe móveis. Se o espaço for insuficiente, os itens excedentes são omitidos e listados no painel; aumente o ambiente ou reorganize. Esses testes de posicionamento não geram colisões de gameplay ou navmesh. Instalações elétricas/hidráulicas funcionais e animações não estão incluídas; tomadas e torneiras são geometria visual. Portas mantêm grupos com pivô para trabalho posterior no motor do jogo.

Para refazer a biblioteca a partir do arquivo original: `node scripts/extract-bedroom.mjs C:/caminho/Bedroom.glb src/assets/bedroom-library.glb`. O extrator preserva materiais e proporções dos móveis, organiza peças independentes e converte metros para os centímetros internos do editor. O exportador final continua aplicando `0.01` para gravar metros no GLB.

Execute `npm run verify:house` para verificar paredes compartilhadas, escada, abertura na laje, isolamento dos andares, conversão de presets antigos, 80 casas aleatórias e exportação métrica. Opcionalmente, `npm run verify:house -- .local/Casa_Dois_Andares.glb` salva o modelo usado na verificação (crie a pasta de destino antes).

Execute `npm run verify:furnished` para verificar os 38 materiais originais, clonagem independente das peças, cômodos com tamanhos diferentes, foco de cômodo, migração de presets, reprodutibilidade e limites/colisões/circulação em 30 casas mobiliadas. `npm run verify:furnished -- .local/Casa_Mobiliada.glb` salva o modelo mobiliado usado na verificação (crie a pasta antes).
# Circulação residencial

## Edição individual de objetos e portas para Unreal

Em **Objetos do cenário**, escolha uma peça do catálogo e clique **Adicionar objeto**. O catálogo contém cama, escrivaninha/computador, cômoda, mesas, cadeira, sofá, TV/rack, geladeira, forno, pia, bancada, privada, chuveiro e máquina de lavar. É possível adicionar várias instâncias do mesmo item. A inclusão procura espaço livre sem bloquear a circulação; se não couber, o editor avisa.

Selecione pela lista, planta de objetos ou clique diretamente no móvel no 3D. O contorno azul e o gizmo permitem arrastar nos eixos X/Y/Z; a câmera orbital é suspensa durante o arraste. Também é possível arrastar a peça na planta do cômodo, usar as setas do teclado (10 cm; Shift: 1 cm), ou preencher posição, altura, rotação e escala. X/Z são locais ao centro do cômodo; os objetos acompanham o cômodo quando ele é movido. **Transferir objeto para outro cômodo** procura espaço no destino (inclusive outro pavimento), mantendo a identidade, escala e altura da peça. A edição manual permite sobreposição/circulação bloqueada com aviso, mas recusa peças fora do cômodo ou acima do teto.

**Remover objeto selecionado** exclui somente aquela instância; **Remover todos os objetos deste cômodo** esvazia somente o ambiente atual. A primeira edição fixa a mobília automática em uma lista persistente, evitando que objetos excluídos reapareçam. **Regenerar móveis (substituir edição)** descarta essa lista e retorna ao gerador. **Desfazer alteração** recupera a última edição. Presets JSON preservam identidade, exclusões e transformações; o GLB exporta apenas as peças presentes, sem gizmos ou contornos de seleção. Peças arquitetônicas como rodapés e tomadas geradas nas paredes continuam nos controles de detalhes da casa, não no catálogo de móveis.

Em **Portas para Unreal**, desative **Incluir folhas das portas** para exportar vãos com batentes/molduras, sem folhas, dobradiças/pivôs de animação ou maçanetas das portas. A prévia também fica sem as folhas. As configurações dos acessos e suas dimensões são preservadas, incluindo a regra de acesso único do banheiro. Assim, as portas interativas podem ser criadas separadamente como Blueprints na Unreal; o editor não cria o Blueprint nem seu sistema de interação. Presets antigos mantêm folhas habilitadas por padrão.

`npm run verify:objects` verifica adição, múltiplas instâncias, exclusão persistente, movimento/rotação/escala/altura, limpeza de um único cômodo, migração, vãos sem folhas e exportação métrica GLB com identidade dos objetos.

## Planta livre: arrastar e ampliar ambientes

Arraste um cômodo na planta 2D à direita para mover sua posição real no pavimento. Ao primeiro movimento, o pavimento passa para **planta livre**, independente das antigas células. A prévia acompanha o ponteiro; ao soltar, paredes, pisos, portas, móveis e a área útil são recalculados. As setas do teclado movem 10 cm (Shift + seta: 1 cm), e os campos de posição X/Z permitem ajustes precisos desde a esquerda/fundo da casa. **Encaixar paredes ao mover** aproxima faces e limites com tolerância de 15 cm; desative para posicionamento sem encaixe.

No modo livre, largura e profundidade podem ultrapassar a célula antiga, até os limites gerais da casa. Sobreposições e espaços menores que a espessura de parede são recusados. A escada continua alinhada e não pode ser movida isoladamente. A grade fica apenas como referência; editar sua contagem ou sortear seus eixos fica desativado para preservar o layout manual.

**Encostar banheiro à direita e ampliar sala** reproduz a disposição do exemplo: com uma sala à esquerda de mesma profundidade e espaço livre à direita do banheiro, move o banheiro para o limite direito e amplia a sala até a nova divisória, sem redimensionar quartos nem o outro pavimento. A porta única do banheiro passa a ligar com a sala. **Desfazer alteração** recupera o último posicionamento/aplicação dessa ação.

As conexões da planta livre seguem contatos reais entre retângulos, inclusive divisórias parciais com mais de um vizinho. Um banheiro nunca vira passagem entre ambientes. Posições provisórias sem acesso são permitidas como rascunho e mostram um aviso; a exportação GLB fica desativada até reconectar a circulação, mas salvar JSON continua disponível. Posições, medidas e aberturas são preservadas no preset. `npm run verify:free-layout` testa o caso sala/banheiro, sobreposições, limites, presets, escada e conversão de 100 casas aleatórias.

Sala, cozinha e demais cômodos mantêm paredes voltadas para o corredor, com acessos por portas de largura definida. Somente células contíguas do tipo corredor/circulação podem ser unidas automaticamente sem divisória. Passagens antigas entre corredor e cômodo são convertidas em portas ao normalizar ou carregar a casa, sem mudar as dimensões nem os tipos dos ambientes.

O gerador distribui ambientes sociais, corredores e quartos antes de abrir os acessos. Cada banheiro tem uma única porta, ligada a um ambiente não sanitário: nunca funciona como passagem entre cômodos. A entrada principal também fica fora do banheiro. Os demais ambientes permanecem conectados sem atravessar banheiros, inclusive até a escada.

O botão **Organizar planta residencial** redistribui os tipos dos ambientes e recalcula as conexões; é possível desfazer. Edições manuais preservam os tipos e corrigem as portas automaticamente. Plantas em que uma faixa de banheiros separaria os demais ambientes são recusadas com uma mensagem, preservando a configuração anterior. Presets antigos com banheiro de múltiplos acessos são corrigidos ao carregar. A referência de planta orienta a circulação, não é uma reprodução exata de suas dimensões.

`npm run verify:circulation` verifica acesso único dos banheiros e conectividade independente em 250 casas aleatórias e nas grades de 1×1 até 4×4.
