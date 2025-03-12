/*============================================================
  Pot's Translate - main.ks
  By: Lauro Vitor | https://github.com/laurovitor
  Version: 1.0
  Description: Arquivo principal que inicia a tradução dos arquivos .pot.
  Changelog:
  - v1.0 - Inicio do projeto
============================================================*/

require('dotenv').config();

const path = require("path");
const { processDirectory } = require("./pots");

const baseDir = process.env.BASE_DIR || "./Hercules";
const targetLang = process.env.TARGET_LANG || "pt";

const inputDirs = {
    pre: path.join(baseDir, "translations_pre"),
    re: path.join(baseDir, "translations_re"),
};
const outputDirs = {
    pre: path.join(baseDir, targetLang, "pre"),
    re: path.join(baseDir, targetLang, "re"),
};

(async () => {
    console.log("🚀 Iniciando tradução dos arquivos .pot...");
    await processDirectory(inputDirs.pre, outputDirs.pre);
    await processDirectory(inputDirs.re, outputDirs.re);
    console.log("🎉 Tradução concluída!");
})();
