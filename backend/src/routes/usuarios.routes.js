const express    = require('express');
const auth       = require('../middleware/auth');
const controller = require('../controllers/UsuarioController');
const router     = express.Router();

router.get('/me',    auth, (req, res, next) => controller.getMe(req, res, next));
router.patch('/me',  auth, (req, res, next) => controller.updateMe(req, res, next));

module.exports = router;
