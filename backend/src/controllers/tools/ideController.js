'use strict';

const svc           = require('../../services/tools/ideService');
const { UserDocument } = require('../../../models');

exports.parseXml = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo XML não enviado. Use multipart com campo "xml_file".' });
    }
    if (!/\.xml$/i.test(req.file.originalname)) {
      return res.status(400).json({ error: 'Apenas arquivos .xml são aceitos.' });
    }

    const result = svc.parseXml(req.file.buffer);
    return res.status(200).json(result);
  } catch (err) {
    const code = err.code;
    if (['PARSE_ERROR', 'INVALID_TISS', 'MISSING_VERSION', 'VERSION_NOT_FOUND'].includes(code)) {
      return res.status(422).json({ error: err.message });
    }
    console.error('[ide/parse]', err);
    return res.status(500).json({ error: 'Erro interno ao processar o XML.' });
  }
};

exports.rebuildXml = async (req, res) => {
  try {
    const { tree, prolog } = req.body;
    if (!tree) return res.status(400).json({ error: 'Campo "tree" obrigatório.' });

    const xml = svc.rebuildXmlFromTree(tree, prolog ?? '<?xml version="1.0" encoding="ISO-8859-1"?>');
    return res.status(200).json({ xml });
  } catch (err) {
    console.error('[ide/rebuild]', err);
    return res.status(500).json({ error: 'Erro ao reconstruir o XML.' });
  }
};

exports.saveDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename, rawXml, versao, tipoTransacao, errorCount, description } = req.body;
    if (!rawXml) return res.status(400).json({ error: 'Campo "rawXml" obrigatório.' });

    const doc = await svc.saveDocument(UserDocument, {
      userId, filename: filename || 'documento.xml',
      rawXml, versao, tipoTransacao,
      errorCount: errorCount ?? 0,
      description: description ?? null,
    });
    return res.status(200).json({ id: doc.id, message: 'Documento salvo com sucesso.' });
  } catch (err) {
    console.error('[ide/save]', err);
    return res.status(500).json({ error: 'Erro ao salvar documento.' });
  }
};

exports.listDocuments = async (req, res) => {
  try {
    const docs = await svc.listDocuments(UserDocument, req.user.id);
    return res.status(200).json(docs);
  } catch (err) {
    console.error('[ide/list]', err);
    return res.status(500).json({ error: 'Erro ao listar documentos.' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await UserDocument.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    await doc.destroy();
    return res.status(200).json({ message: 'Documento removido.' });
  } catch (err) {
    console.error('[ide/delete]', err);
    return res.status(500).json({ error: 'Erro ao remover documento.' });
  }
};
