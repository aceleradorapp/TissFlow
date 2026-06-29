'use strict';

const { Router } = require('express');
const multer     = require('multer');

const {
  listUsers, updateUserStatus, updateUserRole, updateUserPlan, resetUserPassword,
  listPlans, createTool, listTools, setPlanTools,
  listFeatures, updateFeature,
} = require('../controllers/adminController');
const { getStats }                      = require('../controllers/dashboardController');
const { uploadXsd }                     = require('../controllers/tissController');
const { listVersions, generateDiff }    = require('../controllers/versionDiffController');
const { updateAdminSettings }           = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();
const guard  = [authMiddleware, roleMiddleware(['proprietario'])];

const xsdUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xsd|xml)$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Apenas arquivos .xsd ou .xml são permitidos.'));
  },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats',           ...guard, getStats);

// ─── Usuários ─────────────────────────────────────────────────────────────────
router.get('/users',                     ...guard, listUsers);
router.patch('/users/:id/status',        ...guard, updateUserStatus);
router.patch('/users/:id/role',          ...guard, updateUserRole);
router.patch('/users/:id/plan',          ...guard, updateUserPlan);
router.post('/users/:id/reset-password', ...guard, resetUserPassword);

// ─── Planos ───────────────────────────────────────────────────────────────────
router.get('/plans',                     ...guard, listPlans);
router.post('/plans/:planId/tools',      ...guard, setPlanTools);

// ─── Feature Management ───────────────────────────────────────────────────────
router.get('/features',                  ...guard, listFeatures);
router.put('/features/:id',              ...guard, updateFeature);

// ─── Tools (legacy endpoints) ─────────────────────────────────────────────────
router.post('/tools',                    ...guard, createTool);
router.get('/tools',                     ...guard, listTools);

// ─── TISS Schema Engine ───────────────────────────────────────────────────────
router.post('/tiss/upload',              ...guard, xsdUpload.array('xsd_files', 20), uploadXsd);

// ─── Version Diff Generator ───────────────────────────────────────────────────
router.get('/versions',                  ...guard, listVersions);
router.post('/versions/generate-diff',   ...guard, generateDiff);

// ─── System Settings ──────────────────────────────────────────────────────────
router.put('/settings',                  ...guard, updateAdminSettings);

module.exports = router;
