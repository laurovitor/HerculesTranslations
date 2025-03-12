/*============================================================
  Pot's Translate - pots.js
  By: Lauro Vitor | https://github.com/laurovitor
  Version: 1.0
  Description: Funções para processar e traduzir arquivos .pot.
  Changelog:
  - v1.0 - Inicio do projeto
============================================================*/

require('dotenv').config();
const fs = require("fs-extra");
const path = require("path");
const { translateText } = require("./translations");

const setDelay = process.env.DELAY || 500;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function translatePotFile(inputPath, outputPath) {
    console.log(`📂 Processando arquivo: ${inputPath}`);
    try {
        let content = await fs.readFile(inputPath, "utf-8");
        const msgidRegex = /msgid\s+"([^"]+)"/g;
        let matches = [...content.matchAll(msgidRegex)];

        for (const match of matches) {
            let originalText = match[1].trim();
            if (!originalText) continue;
            let translatedText = await translateText(originalText);
            let escapedOriginal = originalText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            let msgstrRegex = new RegExp(`msgid\\s+"${escapedOriginal}"\\s*(?:.*\\n)*?msgstr\\s*""`, "g");
            content = content.replace(msgstrRegex, `msgid "${originalText}"\nmsgstr "${translatedText}"`);
            await delay(setDelay);
        }
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, content, "utf-8");
        console.log(`✅ Arquivo traduzido salvo: ${outputPath}`);
    } catch (error) {
        console.error(`❌ Erro ao processar ${inputPath}:`, error);
    }
}

async function processDirectory(inputDir, outputDir) {
    console.log(`📁 Entrando no diretório: ${inputDir}`);
    try {
        let files = await fs.readdir(inputDir);
        for (const file of files) {
            let fullPath = path.join(inputDir, file);
            let outputPath = path.join(outputDir, file);
            let stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
                await processDirectory(fullPath, outputPath);
            } else if (file.endsWith(".pot")) {
                await translatePotFile(fullPath, outputPath);
            }
        }
    } catch (error) {
        console.error(`❌ Erro ao processar diretório ${inputDir}:`, error);
    }
}

module.exports = {
    processDirectory,
    translatePotFile
};
