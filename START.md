# 🎪 GiraFila — Guia de Inicializacao

> Sistema leve de controle de atendimento social. Sem banco de dados externo, sem npm, sem composer.
> **Unico requisito: PHP 8.x instalado na maquina que vai servir a aplicacao.**

---

## 1. Instale o PHP

Acesse o link abaixo e baixe o instalador para Windows:

**https://windows.php.net/download/**

> Escolha a versao mais recente na coluna **VS17 x64 Non Thread Safe** e baixe o arquivo `.zip`.

### Passo a passo da instalacao:

1. Baixe o `.zip` do link acima
2. Crie a pasta `C:\php` e extraia todo o conteudo do `.zip` dentro dela
3. Adicione `C:\php` ao **PATH do Windows**:
   - Abra o menu Iniciar e busque por "Variaveis de Ambiente"
   - Clique em "Editar as variaveis de ambiente do sistema"
   - Em "Variaveis do Sistema", selecione `Path` e clique em Editar
   - Clique em Novo e adicione: `C:\php`
   - Clique em OK em todas as janelas
4. Abra um novo **Prompt de Comando** (cmd) e confirme a instalacao:
   ```
   php -v
   ```
   Deve exibir algo como: `PHP 8.x.x (cli)...`

---

## 2. Copie a pasta do projeto

Coloque a pasta **GiraFila** em `C:` no computador que vai servir a aplicacao.
Exemplo: `C:\GiraFila`

---

## 3. Inicie a aplicacao

1. Abra o menu Iniciar e procure por  **Prompt de Comando** (cmd) ou **PowerShell**;
- Com ele aberto navegue ate a pasta do projeto executando:
```
   cd C:\GiraFila
```
- Depois execute:
```
   php -S 0.0.0.0:8080
```
> Ou simplesmente execute o arquivo `iniciarGiraFila.bat` que já vem na pasta.
## IMPORTANTE
> Mantenha a janela aberta enquanto estiver usando o sistema, pois ao fechar a janela do prompt, a aplicacao para.

---

## 4. Acesse no navegador

| Dispositivo | Endereco |
|---|---|
| Nesta maquina | http://localhost:8080 |
| Outros celulares/tablets na mesma rede Wi-Fi | http://IP-desta-maquina:8080 |

### Como descobrir o IP da maquina:

Abra o Prompt de Comando e execute:
```
ipconfig
```
Procure por **"Endereco IPv4"** (geralmente algo como `192.168.X.X`).
Esse e o endereco que os outros dispositivos devem digitar no navegador.

---

## 5. Observacoes importantes

- O banco de dados (`girafila.db`) e criado **automaticamente** na primeira vez que a aplicacao e acessada.
- Os dados ficam no arquivo `girafila.db` dentro da pasta do projeto. Nao exclua este arquivo.
- A aplicacao funciona **100% offline** — nao precisa de internet, apenas da rede Wi-Fi local.
- Compativel com qualquer navegador moderno: Chrome, Firefox, Safari, Edge.

---

## Resumo rapido (apos o PHP instalado)

```
php -S 0.0.0.0:8080
```

Abra: http://localhost:8080
