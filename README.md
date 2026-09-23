# Tutu — Caminho Chūnin

Aplicativo de rotina, missões, evolução física e disciplina do projeto **Caminho Chūnin**.

---

## Estrutura do Projeto

```
tutu/
├── Dockerfile
├── docker-compose.yml
├── .env.example          # Variáveis de ambiente (copie para .env)
├── package.json
├── prisma/
│   └── schema.prisma     # Modelos do banco de dados
├── public/               # Frontend (HTML/CSS/JS vanilla)
│   ├── index.html        # App principal
│   ├── login.html        # Tela de login
│   └── assets/
│       └── sharingan.png # Logo
├── src/
│   ├── server.js         # Servidor Express principal
│   ├── db.js             # Cliente Prisma singleton
│   ├── middleware/
│   │   └── auth.js       # Middleware de autenticação
│   ├── routes/
│   │   ├── auth.js       # POST /login, POST /logout, GET /me
│   │   ├── state.js      # GET /api/state
│   │   ├── routine.js    # CRUD da rotina semanal
│   │   ├── missions.js   # Conclusão de missões
│   │   ├── assessments.js # Avaliações físicas semanais
│   │   ├── checkins.js   # Check-ins diários
│   │   ├── challenges.js # Desafios especiais (Sensei)
│   │   └── sync.js       # Migração do localStorage
│   └── services/
│       ├── authService.js # Hash/verificação de senha e init
│       └── stateService.js # Estado consolidado do app
└── scripts/
    ├── backup.sh          # Backup do banco
    └── restore.sh         # Restauração do banco
```

---

## Deploy com Docker Compose (Recomendado)

### 1. Configure as variáveis de ambiente

```bash
# Copie o exemplo e edite
cp .env.example .env
```

Edite o `.env`:

```env
DATABASE_URL=postgresql://tutu:tutupassword@db:5432/tutu_db?schema=public
APP_USERNAME=tutu
APP_PASSWORD=defina_uma_senha_forte_com_8_ou_mais_caracteres
ADMIN_PASSWORD=defina_uma_senha_separada_para_o_sensei
SESSION_SECRET=gere_uma_chave_aleatoria_unica_com_32_ou_mais_caracteres
NODE_ENV=production
```

> ⚠️ **Importante:** em produção, o aplicativo não inicia com senha padrão, sem `ADMIN_PASSWORD`, com senhas administrativa e de acesso iguais ou com `SESSION_SECRET` insegura.

### 2. Suba os containers

```bash
docker compose up -d
```

O app vai:
1. Iniciar o PostgreSQL com volume persistente.
2. Aguardar o banco estar saudável (healthcheck).
3. Executar `prisma migrate deploy` automaticamente.
4. Criar o usuário `tutu` com a senha em hash.
5. Iniciar o servidor internamente na porta `3000`, publicado na porta `3555` do servidor.

### 3. Acesse

```
http://localhost:3555
```

---

## Deploy no Portainer

### Passo a passo:

1. Acesse seu **Portainer** → **Stacks** → **Add Stack**
2. Nome da stack: `tutu-chunin`
3. Cole o conteúdo do `docker-compose.yml` no editor
4. Na seção **Environment variables**, adicione:

| Variável | Valor |
|---|---|
| `APP_USERNAME` | `tutu` |
| `APP_PASSWORD` | senha de acesso com pelo menos 8 caracteres; não use `1234` |
| `ADMIN_PASSWORD` | senha exclusiva do responsável, diferente de `APP_PASSWORD` |
| `SESSION_SECRET` | chave aleatória única com pelo menos 32 caracteres |
| `NODE_ENV` | `production` |

5. Clique em **Deploy the stack**

> 📝 O `DATABASE_URL` já está embutido no `docker-compose.yml` apontando para o serviço `db` interno.
> O acesso externo é feito pela porta `3555`: `http://IP-DO-SERVIDOR:3555`.

---

## Rodar Localmente (sem Docker)

### Pré-requisitos

- Node.js 20+
- PostgreSQL rodando localmente

### 1. Configure o `.env`

```env
DATABASE_URL=postgresql://tutu:tutupassword@localhost:5432/tutu_db?schema=public
APP_USERNAME=tutu
APP_PASSWORD=senha_local
ADMIN_PASSWORD=senha_local_do_sensei
SESSION_SECRET=segredo_dev
PORT=3000
NODE_ENV=development
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Rode as migrações

```bash
npx prisma migrate dev --name init
```

### 4. Inicie o servidor

```bash
npm start
# ou com hot-reload:
npm run dev
```

---

## Credenciais Padrão

| Campo | Valor |
|---|---|
| Usuário | `tutu` |
| Senha | `1234` |

> A senha é armazenada com **bcrypt** (salt rounds 12). Nunca em texto puro.

---

## Migração dos Dados do localStorage

Na **primeira vez** que você ou o Tutu abrir o app após o login, o sistema verifica automaticamente se há dados da versão anterior armazenados no navegador.

Se encontrar, exibe um popup:

> **"Dados encontrados neste aparelho"**  
> "Encontramos dados da versão anterior."

**Opções:**
- **Importar para o servidor** → envia tudo para o PostgreSQL, sem duplicações
- **Ignorar** → continua sem migrar (dados locais permanecem como backup)

O `localStorage` **não é apagado** automaticamente — serve como cópia de segurança.

---

## Backup e Restauração

### Fazer backup

```bash
sh scripts/backup.sh
```

O arquivo será salvo em `./backups/tutu_backup_YYYYMMDD_HHMMSS.sql`.

### Restaurar backup

```bash
sh scripts/restore.sh ./backups/tutu_backup_20261001_120000.sql
```

> ⚠️ **Isso sobrescreve os dados existentes.** Confirme antes de prosseguir.

### Backup manual via Docker

```bash
docker exec tutu_db pg_dump -U tutu tutu_db > backup_manual.sql
```

### Restauração manual via Docker

```bash
cat backup_manual.sql | docker exec -i tutu_db psql -U tutu -d tutu_db
```

---

## Segurança

- Senhas armazenadas com **bcrypt** (hash + salt)
- Sessões em **cookie HttpOnly** (não acessível por JavaScript)
- `SameSite=Lax` e `Secure=true` em produção
- **Helmet.js** com CSP configurada
- Rate limit em `/api/auth/login` (20 tentativas / 15 min)
- Nenhuma rota de dados funciona sem autenticação
- Nenhum dado pessoal público

---

## Sincronização entre Dispositivos

O app sincroniza ao:
- **Abrir o aplicativo** (carrega estado fresco do servidor)
- **Trocar para a aba** (evento `visibilitychange`)
- **Recarregar a página**
- **Salvar qualquer informação** (cada ação persiste imediatamente na API)

Não é necessário WebSocket nesta versão.

---

## Níveis e Insígnias

- O símbolo ao lado da Aura evolui automaticamente conforme a patente muda.
- Ao alcançar uma patente inédita, o app mostra uma animação comemorativa uma única vez em cada dispositivo.
- As insígnias aparecem no painel e na área **Projeto**.
- Criar, editar ou remover insígnias exige a variável `ADMIN_PASSWORD`; o desbloqueio vale por 10 minutos apenas naquela sessão.
- A senha administrativa deve ser diferente da senha usada pelo aprendiz para entrar no aplicativo.

---

## Health Check

```
GET /health
```

Resposta:
```json
{ "status": "ok", "timestamp": "2026-09-21T21:00:00.000Z" }
```

---

## Marco Zero (Referência Imutável)

| Métrica | Valor |
|---|---|
| Data | 21/09/2026 |
| Flexões | 20 repetições |
| Abdominais | 100 repetições |
| Prancha | 2:06 (126 segundos) |
| Altura | 150 cm |
| Peso | 50,4 kg |

O Marco Zero **não é alterado** pelo sistema. As avaliações seguintes são sempre comparadas com ele.
