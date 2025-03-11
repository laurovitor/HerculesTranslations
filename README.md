# Pot's Translate

Pot's Translate é uma ferramenta para traduzir automaticamente arquivos `.pot` do servidor Hercules usando a API do Google Translate. O script permite traduzir mensagens e textos do jogo, garantindo maior acessibilidade para jogadores que falam português.

## ✨ Funcionalidades
- Tradução automática de arquivos `.pot`.
- Suporte a dicionários personalizados para palavras e frases.
- Proteção de placeholders, comandos e tags XML.
- Processamento de diretórios completos.
- Logs detalhados para monitoramento das traduções.

## 🔧 Instalação
### Requisitos
- Node.js (versão 14+)
- Dependências do projeto (fs-extra, google-translate-api-x)

### Passos
1. Clone este repositório:
   ```sh
   git clone https://github.com/seuusuario/pots-translate.git
   cd pots-translate
   ```
2. Instale as dependências:
   ```sh
   npm install
   ```

## 🌐 Uso
Para iniciar a tradução, basta executar:
```sh
node main.js
```
Isso irá processar os arquivos `.pot` localizados nas pastas `translations_pre` e `translations_re` dentro do diretório `Hercules`, gerando as traduções na pasta `Hercules/pt/pre` e `Hercules/pt/re`.

### Alterar o Idioma de Tradução
O idioma de destino pode ser alterado no arquivo `main.js`. 
Basta modificar a linha:
```js
const targetLang = "pt";
```
Substitua `pt` pelo código do idioma desejado (exemplo: `es` para espanhol, `fr` para francês).

### Dicionário Personalizado
Caso deseje personalizar traduções de palavras e frases, edite os arquivos:
- `dictionary_words.json` (para palavras individuais)
- `dictionary_phrases.json` (para frases inteiras)

## 🔨 Desenvolvimento
### Estrutura do Projeto
```
/
├── main.js            # Arquivo principal
├── pots.js            # Processamento de arquivos .pot
├── translations.js    # Funções de tradução e proteção de texto
├── dictionary_words.json    # Dicionário de palavras
├── dictionary_phrases.json  # Dicionário de frases
└── Hercules/         # Pasta contendo os arquivos .pot a serem traduzidos
```

## 📃 Changelog
- **v1.0** - Início do projeto

## ⚖️ Licença
Este projeto está licenciado sob a MIT License. Sinta-se livre para contribuir e modificar conforme necessário!

---
Criado por [Lauro Vitor](https://github.com/laurovitor).