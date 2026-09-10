const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const iec = require('../controllers/importExportController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

router.use(auth);

router.get('/export/csv', iec.exportCSV);
router.post('/import/csv', upload.single('file'), iec.importCSV);
router.post('/import/confirm', iec.confirmImport);

module.exports = router;
