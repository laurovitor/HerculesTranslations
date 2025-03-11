/*============================================================
  Pot's Translate - translation.js
  By: Lauro Vitor | https://github.com/laurovitor
  Version: 1.0
  Description: Funções de proteção, restauração e tradução de strings.
  Changelog:
  - v1.0 - Inicio do projeto
  -
============================================================*/

const fs = require("fs-extra");
const path = require("path");
const translate = require("google-translate-api-x");

const targetLang = "pt"; // Tradução para português (Brasil)
const sourceLang = "en"; // Idioma de origem

// Carrega os dicionários
const wordsDictionary = fs.existsSync("dictionary_words.json")
    ? JSON.parse(fs.readFileSync("dictionary_words.json", "utf-8"))
    : {};
const phrasesDictionary = fs.existsSync("dictionary_phrases.json")
    ? JSON.parse(fs.readFileSync("dictionary_phrases.json", "utf-8"))
    : {};

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
        let result = await translate(tempText, { from: sourceLang, to: targetLang });
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
        return translatedText;
    } catch (error) {
        console.error(`❌ Erro ao traduzir: "${text}". ${error.message}`);
        return text;
    }
}

module.exports = {
    translateText,
    applyPhrasesDictionary,
    applyWordsDictionary
};
