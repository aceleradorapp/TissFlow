require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes       = require('./routes/authRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const publicRoutes     = require('./routes/publicRoutes');
const swaggerRoutes    = require('./routes/tools/swaggerRoutes');
const generatorRoutes  = require('./routes/tools/generatorRoutes');
const viewerRoutes     = require('./routes/tools/viewerRoutes');
const ideRoutes               = require('./routes/tools/ideRoutes');
const versionComparatorRoutes = require('./routes/tools/versionComparatorRoutes');
const classGeneratorRoutes    = require('./routes/tools/classGeneratorRoutes');
const xmlTemplateBuilderRoutes = require('./routes/tools/xmlTemplateBuilderRoutes');
const xmlTemplateRoutes        = require('./routes/xmlTemplateRoutes');
const validatorRoutes          = require('./routes/tools/validatorRoutes');
const v1PublicRoutes           = require('./routes/v1PublicRoutes');
const internalRoutes           = require('./routes/internalRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/public',        publicRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/tools/swagger',    swaggerRoutes);
app.use('/api/tools/generator', generatorRoutes);
app.use('/api/tools/viewer',    viewerRoutes);
app.use('/api/tools/ide',            ideRoutes);
app.use('/api/tools/version-diff',   versionComparatorRoutes);
app.use('/api/tools/class-generator', classGeneratorRoutes);
app.use('/api/tools/xml-template-builder', xmlTemplateBuilderRoutes);
app.use('/api/xml-templates', xmlTemplateRoutes);
app.use('/api/tools/validator', validatorRoutes);
app.use('/api/v1/public',      v1PublicRoutes);
app.use('/api/v1/internal',    internalRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TISSflow backend rodando na porta ${PORT}`);
});

module.exports = app;
