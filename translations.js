/*============================================================
  Pot's Translate - translation.js
  By: Lauro Vitor | https://github.com/laurovitor
  Version: 1.0
  Description: Funções de proteção, restauração e tradução de strings.
  Changelog:
  - v1.0 - Inicio do projeto
  - Funcionalidades adicionadas:
      • Log detalhado de erros (translation_errors.log)
      • Saída para unchanged_phrases.json
      • Saída para phrases_to_review.json
      • Sistema de cache (translation_cache.json)
      • Suporte a Proxy (https-proxy-agent)
      • Uso de .env para configuração (TARGET_LANG, SOURCE_LANG, PROXY_URL)
============================================================*/

require('dotenv').config(); // Carrega variáveis de ambiente

const fs = require("fs-extra");
const path = require("path");
const translate = require("google-translate-api-x");
const HttpsProxyAgent = require('https-proxy-agent'); // Suporte a Proxy

// Configura idioma e fonte com base no .env, ou usa os valores padrão.
const targetLang = process.env.TARGET_LANG || "pt"; // Tradução para português (Brasil)
const sourceLang = process.env.SOURCE_LANG || "en"; // Idioma de origem

// Carrega os dicionários
const wordsDictionary = fs.existsSync("dictionary_words.json")
    ? JSON.parse(fs.readFileSync("dictionary_words.json", "utf-8"))
    : {};
const phrasesDictionary = fs.existsSync("dictionary_phrases.json")
    ? JSON.parse(fs.readFileSync("dictionary_phrases.json", "utf-8"))
    : {};

// Sistema de cache para traduções
let translationCache = {};
try {
    if (fs.existsSync("translation_cache.json")) {
        translationCache = JSON.parse(fs.readFileSync("translation_cache.json", "utf-8"));
    }
} catch (err) {
    console.error("Erro ao carregar o cache:", err);
}

//==================== Funções de Dicionário ====================

// Aplica o dicionário de frases (case-insensitive)
function applyPhrasesDictionary(text) {
    for (let key in phrasesDictionary) {
        if (text.toLowerCase() === key.toLowerCase()) {
            return phrasesDictionary[key];
        }
    }
    return null;
}

// Aplica o dicionário de palavras (case-sensitive, substituição exata)
function applyWordsDictionary(text) {
    for (const key in wordsDictionary) {
        if (text === key) {
            return wordsDictionary[key];
        }
    }
    return text.split(/\b/).map(token => {
        return wordsDictionary.hasOwnProperty(token) ? wordsDictionary[token] : token;
    }).join("");
}

// Compara de forma case-sensitive para correspondência exata
function getExactWordsDictionary(text) {
    const trimmed = text.trim();
    for (let key in wordsDictionary) {
        if (trimmed === key.trim()) {
            return wordsDictionary[key];
        }
    }
    return null;
}

//==================== Proteção do Dicionário de Palavras =====================

function protectDictionaryWords(text) {
    let dictTokens = [];
    let keys = Object.keys(wordsDictionary).sort((a, b) => b.length - a.length);
    let protectedText = text;
    keys.forEach(key => {
        let regex = new RegExp("\\b" + key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "\\b", "g");
        protectedText = protectedText.replace(regex, () => {
            let token = `##WD${dictTokens.length}##`;
            dictTokens.push({ token, value: wordsDictionary[key] });
            return token;
        });
    });
    return { text: protectedText, dictTokens };
}

function restoreDictionaryWords(text, dictTokens) {
    return text.replace(/##\s*WD(\d+)\s*##/gi, (match, index) => {
        return dictTokens[parseInt(index)].value;
    });
}

//==================== Proteção de Placeholders =====================

function protectPlaceholders(text) {
    let placeholders = [];
    let protectedText = text.replace(/(%(?:\d+\$)?[sdif%])/gi, (match) => {
        let token = `##PH${placeholders.length}##`;
        placeholders.push({ token, value: match });
        return token;
    });
    return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
    return text.replace(/##\s*ph(\d+)\s*##/gi, (match, index) => {
        return placeholders[parseInt(index)].value;
    });
}

//==================== Proteção de Comandos (@) =====================

function protectAtCommands(text) {
    let atCommands = [];
    let newText = text.replace(/(@[a-zA-Z0-9_]+)/g, (match) => {
        let token = `##AT${atCommands.length}##`;
        atCommands.push({ token, value: match });
        return token;
    });
    return { text: newText, atCommands };
}

function restoreAtCommands(text, atCommands) {
    return text.replace(/##\s*AT(\d+)\s*##/gi, (match, index) => {
        return atCommands[parseInt(index)].value;
    });
}

//==================== Proteção de Tags XML =====================

function protectXmlTags(text) {
    let xmlTags = [];
    let newText = text.replace(/<[^>]+>/g, (match) => {
        let token = `##XML${xmlTags.length}##`;
        xmlTags.push({ token, value: match });
        return token;
    });
    return { text: newText, xmlTags };
}

function restoreXmlTags(text, xmlTags) {
    return text.replace(/##\s*XML(\d+)\s*##/gi, (match, index) => {
        return xmlTags[parseInt(index)].value;
    });
}

//==================== Outras Funções =====================

// Se o texto estiver inteiramente entre colchetes, retorna-o sem tradução.
function isBracketEnclosed(text) {
    text = text.trim();
    return text.startsWith("[") && text.endsWith("]");
}

// Preserva códigos especiais como \r.
const CODE_TOKEN = "__CODE_TOKEN__";
function preserveCodes(text) {
    return text.replace(/\r/g, CODE_TOKEN);
}
function restoreCodes(text) {
    return text.replace(new RegExp(CODE_TOKEN, "g"), "\r");
}

//==================== Função Principal de Tradução =====================

async function translateText(text) {
    console.log(`🔄 Traduzindo: "${text}"`);

    // Verifica cache: se já houver tradução, retorna imediatamente.
    if (translationCache[text]) {
        console.log(`✅ Cache hit: "${text}" -> "${translationCache[text]}"`);
        return translationCache[text];
    }

    if (isBracketEnclosed(text)) {
        console.log(`✅ Texto entre colchetes, mantido sem tradução: "${text}"`);
        return text;
    }

    let manualTranslation = applyPhrasesDictionary(text);
    if (manualTranslation !== null) {
        console.log(`✅ Tradução manual encontrada: "${manualTranslation}"`);
        return manualTranslation;
    }

    let { text: dictProtectedText, dictTokens } = protectDictionaryWords(text);
    let { text: xmlProtectedText, xmlTags } = protectXmlTags(dictProtectedText);
    let { text: atProtectedText, atCommands } = protectAtCommands(xmlProtectedText);
    let { protectedText, placeholders } = protectPlaceholders(atProtectedText);
    let tempText = preserveCodes(protectedText);
    tempText = applyWordsDictionary(tempText);

    try {
        // Configuração do proxy (se PROXY_URL estiver definido no .env)
        let proxyAgent = process.env.PROXY_URL ? new HttpsProxyAgent(process.env.PROXY_URL) : undefined;
        let result = await translate(tempText, { 
            from: process.env.SOURCE_LANG || sourceLang, 
            to: process.env.TARGET_LANG || targetLang,
            agent: proxyAgent
        });
        let translatedText = result.text;
        translatedText = restoreCodes(translatedText);
        translatedText = restorePlaceholders(translatedText, placeholders);
        translatedText = restoreAtCommands(translatedText, atCommands);
        translatedText = restoreXmlTags(translatedText, xmlTags);
        translatedText = restoreDictionaryWords(translatedText, dictTokens);

        // Verificação final para substituição exata
        const exactDictValue = getExactWordsDictionary(text);
        if (exactDictValue !== null) {
            translatedText = exactDictValue;
        }

        console.log(`✅ Tradução concluída: "${translatedText}"`);

        // Salva a tradução no cache
        translationCache[text] = translatedText;
        await fs.writeFile("translation_cache.json", JSON.stringify(translationCache, null, 2), "utf-8");

        // Registra em unchanged_phrases.json se a tradução for idêntica à entrada
        if(text === translatedText) {
            let unchangedPhrases = [];
            try {
                if (fs.existsSync("unchanged_phrases.json")) {
                    unchangedPhrases = JSON.parse(await fs.readFile("unchanged_phrases.json", "utf-8"));
                }
            } catch (err) {
                console.error("Erro ao ler unchanged_phrases.json:", err);
            }
            unchangedPhrases.push({ text, translation: translatedText });
            await fs.writeFile("unchanged_phrases.json", JSON.stringify(unchangedPhrases, null, 2), "utf-8");
        }

        // Registra em phrases_to_review.json se a frase contiver caracteres especiais.
        // Define caracteres especiais como quaisquer caracteres que não sejam letras, números, espaços ou pontuações comuns.
        const specialCharRegex = /[^\p{L}\p{N}\s.,?!'":;()\-]/u;
        if (specialCharRegex.test(text)) {
            let phrasesToReview = [];
            try {
                if (fs.existsSync("phrases_to_review.json")) {
                    phrasesToReview = JSON.parse(await fs.readFile("phrases_to_review.json", "utf-8"));
                }
            } catch (err) {
                console.error("Erro ao ler phrases_to_review.json:", err);
            }
            phrasesToReview.push({ text, translation: translatedText });
            await fs.writeFile("phrases_to_review.json", JSON.stringify(phrasesToReview, null, 2), "utf-8");
        }

        return translatedText;
    } catch (error) {
        console.error(`❌ Erro ao traduzir: "${text}". ${error.message}`);
        // Registra erro completo no arquivo de log
        await fs.appendFile("translation_errors.log", `Erro ao traduzir: "${text}" - ${error.stack}\n`, "utf-8");
        return text;
    }
}

module.exports = {
    translateText,
    applyPhrasesDictionary,
    applyWordsDictionary
};
