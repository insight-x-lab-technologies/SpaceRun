# SpaceRun — Modelo de dados e persistência

Status: **implementado na v0.5**. O formato v2 migra explicitamente o save v1 e
mantém o legado somente para leitura/recuperação.

## Objetivos

- Preservar o progresso local entre versões.
- Manter `Storage` como única fonte de verdade persistida.
- Tratar localStorage, arquivos importados e payloads de URL como não confiáveis.
- Permitir evolução por migrações explícitas e testáveis.
- Registrar contexto suficiente para interpretar runs, scores e ghosts.
- Continuar offline-first, sem conta e sem sincronização automática.

## Não objetivos

- Provar que um score é legítimo.
- Sincronizar dispositivos ou resolver conflitos distribuídos.
- Armazenar telemetria remota.
- Tornar saves editados manualmente confiáveis.
- Persistir estado frame a frame de uma partida em andamento.

## Fonte de verdade e chaves

Hoje a aplicação usa `spacerun.save.v1`, sem versão interna. Na v0.5:

- chave primária: `spacerun.save.v2`;
- backup bruto da migração: `spacerun.save.v1.backup`;
- legado somente para leitura/migração: `spacerun.save.v1`.

Não reutilizar uma chave para formatos incompatíveis. Nenhum módulo pode acessar
essas chaves diretamente; todo acesso passa por `Storage`.

## Envelope v2

O v2 mantém os campos principais no nível superior para reduzir o risco da
migração. Novas grandes reorganizações exigem v3.

```js
{
  schemaVersion: 2,
  meta: {
    createdAt: 0,
    updatedAt: 0,
    migratedFrom: null       // null ou 1
  },

  best: 0,
  totalMeters: 0,
  totalRuns: 0,
  bestTime: 0,
  crystals: 0,
  selectedShip: "scout",
  unlocked: ["scout"],
  achievements: [],
  history: [],
  streak: 0,
  maxStreak: 0,
  leaderboard: [],
  ghosts: [],
  playerName: "",
  friendCode: "a1b2c3d4e5f6", // aleatório local; rótulo de origem, não identidade
  shipSkins: {},
  upgrades: { agility: 0, thrust: 0 },
  cosmetics: {
    trail: "ion",
    explosion: "nova",
    title: "cadet",
    unlocked: ["trail:ion", "explosion:nova", "title:cadet"]
  },
  retention: {
    lastClaimDate: "2026-07-25", // YYYY-MM-DD local; nunca volta no relógio
    loginStreak: 1,               // 1..7
    xp: 0,
    daily: { date: "2026-07-25", progress: {} },
    weekly: { week: "2026-W30", progress: {} }
  },
  settings: {
    sound: true,
    music: true,
    particles: true,
    lang: null,
    reduceMotion: false,
    highContrast: false,
    theme: "neon",
    performanceMode: false,
    haptics: false
  }
}
```

Campos futuros só entram com default, validação, migração e teste. Ausência de
campo nunca pode ser interpretada diretamente como erro fatal.

### Retenção F4B

`retention` é local, limitado e normalizado: datas aceitam somente
`YYYY-MM-DD`/`YYYY-Www`, contadores são inteiros não negativos e o mapa contém
no máximo 12 entradas. A recompensa só é liberada quando a data local atual é
maior que `lastClaimDate`; assim, retroceder o relógio não duplica uma coleta.
XP é uma projeção do progresso local e não é usado para autorizar gameplay.

## Tipos persistidos

### RunRecord

`history` contém no máximo 50 registros, do mais antigo para o mais recente.

```js
{
  id: "local-random-id",
  m: 1234,                    // metros inteiros
  t: 42.3,                    // segundos, uma casa decimal
  c: 18,                      // cristais obtidos na run
  d: 1784600000000,           // timestamp local em ms
  mode: "classic",           // classic | daily | zen | sprint | hardcore | marathon | timeattack | bossrush
  seed: 1234567890,           // uint32; 0 quando não aplicável
  rulesetId: "classic-v2",
  shipId: "scout",
  loadout: { agility: 0, thrust: 0 },
  maxCombo: 7,
  powerups: ["magnet", "shield"] // tipos únicos, máximo de 3
}
```

Regras:

- `rulesetId` identifica física, colisão, dificuldade e geração lógica.
- `loadout` é um snapshot; não consultar upgrades atuais para reinterpretar run
  antiga.
- `powerups` registra apenas os tipos efetivamente aplicados (`magnet`,
  `doubleCrystals`, `shield`) para depuração/replay; valores desconhecidos,
  duplicados ou excessivos são descartados.
- Um campo desconhecido é ignorado na leitura, nunca executado ou renderizado
  como HTML.
- Modo/ruleset desconhecido pode ser exibido como incompatível, mas não entra em
  ranking comparável.

### ScoreRecord

`leaderboard` contém no máximo 10 registros por categoria `{mode, rulesetId}`
(até 80 no save atual, para as oito categorias conhecidas), ordenados por
distância e com desempate documentado.

```js
{
  id: "local-random-id",
  name: "Pilot",
  m: 1234,
  t: 42.3,
  d: 1784600000000,
  mode: "classic",           // classic | daily | zen | sprint | hardcore | marathon | timeattack | bossrush
  seed: 0,
  rulesetId: "classic-v2",
  shipId: "scout",
  loadout: { agility: 0, thrust: 0 },
  source: "local"             // local | imported
  origin: "friend-code"        // somente imported; rótulo local, não identidade
}
```

Scores só são diretamente comparáveis quando modo, ruleset e categoria de
loadout forem compatíveis. `source: imported` nunca significa verificado.
Cada categoria preserva até 10 resultados locais e até 10 importados, para que
um link recebido não expulse o Top 10 local. `friendCode` é um token aleatório
local e não autentica uma pessoa.

### GhostRecord (F5B)

`ghosts` é uma coleção persistente de replays, separada de `leaderboard`.
Guarda no máximo 10 registros `self` (um melhor por `{mode, rulesetId}`) e 20
`imported`; itens importados excedentes são descartados. Cada item é
normalizado antes de entrar no save:

```js
{
  id: "ghost-local-id",
  type: "self",              // self | imported
  kind: "ghost",             // ghost | challenge; self aceita somente ghost
  origin: "a1b2c3d4e5f6",    // rótulo local, não identidade
  savedAt: 1784600000000,
  payload: {
    seed: 1234567890,
    mode: "classic",
    rulesetId: "classic-v2",
    shipId: "scout",
    loadout: { agility: 0, thrust: 0 },
    durationTicks: 3600,
    inputs: [[0, "thrustOn"], [18, "thrustOff"]],
    claimedScore: { m: 1234, t: 60.0 },
    target: { m: 1234, t: 60.0 } // obrigatório somente em kind challenge
  }
}
```

O payload aceita apenas modos/rulesets atuais, naves, upgrades, eventos e
limites já definidos no protocolo. Entradas locais hostis são descartadas como
na URL. Export/import do save preservam somente registros normalizados; reset
limpa a coleção com o restante do progresso.

### Desbloqueio de modos

Não há campo persistido adicional para os modos F9. `Storage.isModeUnlocked`
deriva o acesso exclusivamente de `totalMeters`: Classic (0), Daily (10.000),
Zen (25.000), Sprint (50.000), Hardcore (100.000), Marathon (250.000), Time
Attack (500.000) e Boss Rush (1.000.000). Assim o cálculo é retrocompatível e
um save v2 existente ganha os acessos correspondentes sem migração.

### Skins e upgrades

- `shipSkins` é mapa `shipId -> { color, accent }`.
- Cores aceitas usam exatamente `#RRGGBB`; valores inválidos voltam à skin
  padrão da nave.
- Apenas ids existentes em `Ships.list` são preservados.
- Upgrades aceitos hoje: `agility` e `thrust`, inteiros entre 0 e
  `Storage.UPGRADE_MAX`.
- Upgrades são progressão mecânica, não cosmética.

### Cosméticos de expressão

- `cosmetics.trail` aceita `ion`, `wave`, `stars` ou `flame`; `explosion`
  aceita `nova`, `neon`, `particles` ou `wave`; `title` aceita `cadet`,
  `voyager` ou `legend`.
- `unlocked` é uma lista única e limitada de ids conhecidos no formato
  `tipo:valor`. As três opções-base estão sempre presentes; trilhas/efeitos
  alternativos são comprados com cristais e títulos avançados são liberados por
  distância total.
- Uma seleção que não esteja em `unlocked` volta ao valor-base. Esses dados são
  puramente cosméticos e nunca entram em regra, assinatura Daily ou score.

### Settings

- Booleanos são normalizados; strings como `"false"` não viram `true`.
- `lang`: `null`, `pt`, `en` ou `es`.
- `theme`: id presente em `Themes.list`; fallback `neon`.
- Uma preferência nova deve ter default que preserve o comportamento anterior.
- `prefers-reduced-motion` pode definir a primeira escolha, mas uma preferência
  salva pelo jogador tem precedência.
- `haptics` é booleano e começa em `false`; a vibração é opcional e não deve
  ocorrer quando `reduceMotion` estiver ativo.

## Limites e normalização

Todo valor importado ou carregado deve passar por estas regras:

| Dado | Regra |
|------|-------|
| Distância/contadores/cristais | inteiro seguro, finito e não negativo |
| Tempo | número finito, não negativo, arredondado para 0,1 s |
| Seed | inteiro uint32 |
| Timestamp | inteiro finito; valores absurdos não controlam recompensas |
| Nome | string Unicode, trim, máximo de 16 grafemas; render via `textContent` |
| Arrays de ids | lista única, apenas ids conhecidos, com limite por domínio |
| Histórico | máximo 50 |
| Leaderboard | máximo 10 local + 10 importados por `{mode, rulesetId}`; 160 no total |
| Payload importado | limite de bytes definido pelo protocolo antes do parse |

Valores inválidos são substituídos pelo default do campo, não pelo reset do save
inteiro. A exceção é um envelope impossível de interpretar; nesse caso o backup
é preservado e a aplicação inicia com defaults, exibindo aviso localizado.

## API obrigatória de Storage

O módulo deve expor leitura sem mutação e comandos explícitos. A lista pode
crescer, mas consumidores não devem editar o objeto interno.

```text
Leitura
  getSnapshot()
  getSettings()
  getBest()
  getHistory()
  getLeaderboard(filter?)
  getFriendCode()
  getLastError()

Comandos
  setSetting(key, value)
  setSelectedShip(id)
  unlock(id)
  setShipSkin(id, color, accent)
  resetShipSkin(id)
  buyUpgrade(stat)
  setPlayerName(name)
  recordRun(result)
  recordLeaderboard(result)
  importLeaderboard(entries, origin)
  importSave(serialized)
  exportSave()
  reset()
```

Compatibilidade temporária com `get()` só é permitida durante a migração e deve
retornar cópia. Testes não devem conceder cristais mutando o snapshot; usar um
fixture/método de teste explícito.

## Escrita transacional

Para cada comando:

1. Clonar o estado atual.
2. Aplicar a mudança na cópia.
3. Normalizar e validar o envelope completo.
4. Serializar antes de alterar o estado em memória.
5. Gravar em `localStorage`.
6. Só então trocar o snapshot em memória.

Se serialização ou escrita falhar, manter o estado anterior, registrar um código
de erro não sensível e informar a UI quando a ação do usuário não foi salva.

## Migração v1 → v2

Ordem obrigatória:

1. Se `spacerun.save.v2` existir e for válido, usá-lo.
2. Se v2 estiver inválido, tentar uma cópia v2 de recuperação, caso exista.
3. Se não houver v2 válido, ler `spacerun.save.v1`.
4. Guardar o texto v1 intacto em `spacerun.save.v1.backup` sem sobrescrever um
   backup anterior.
5. Mapear campos conhecidos, completar defaults e normalizar.
6. Converter `history` e `leaderboard` antigos, preenchendo:
   - `mode: "classic"` quando o modo original não for conhecido;
   - `rulesetId: "legacy-v04"`;
   - `shipId: "unknown"` e loadout zero quando não houver informação.
7. Validar/serializar/gravar o v2.
8. Manter a chave v1 durante pelo menos todo o ciclo da v0.5. Remoção futura
   exige decisão e release note.

Não inventar seed, ship ou loadout antigo. Informação desconhecida deve continuar
marcada como desconhecida.

## Exportação e importação

- Exportação gera JSON do envelope normalizado, com versão e sem dados externos.
- Importação nunca faz merge implícito. O jogador escolhe substituir após ver um
  resumo localizado; o save atual recebe backup antes da substituição.
- O parser rejeita formato, versão ou tamanho não suportado antes de modificar
  estado.
- Importar save não transforma scores em verificados.
- Nunca usar `innerHTML` para exibir dados do arquivo.

## Privacidade e retenção

- Todos os dados permanecem locais até ação explícita de exportar/compartilhar.
- Não coletar nome, histórico ou identificador em telemetria sem nova decisão e
  consentimento.
- Histórico detalhado permanece limitado; totais agregados podem ser mantidos.
- Reset deve apagar chave primária e backups somente após confirmação clara.

## Testes mínimos

- defaults v2 completos;
- round-trip salvar/carregar;
- migração de fixture v1 realista;
- save parcial, JSON inválido e tipos hostis;
- `NaN`, `Infinity`, negativos, arrays enormes e ids desconhecidos;
- falha/quota de `localStorage` sem perda do snapshot anterior;
- snapshot externo imutável;
- limites de histórico/leaderboard;
- export/import e cancelamento;
- texto controlável renderizado literalmente;
- compatibilidade de run/score por modo, ruleset e loadout.

## Regra para campos futuros

Uma mudança persistente só está pronta quando inclui, no mesmo trabalho:

1. definição e default neste documento;
2. validação;
3. migração quando necessária;
4. API de leitura/mutação;
5. testes de round-trip e corrupção;
6. i18n da experiência de erro/recuperação;
7. atualização de `ARCHITECTURE.md` e `ROADMAP.md`.
