import { Router } from 'express';
import { validateWebhook } from '../middleware/validateWebhook.js';
import { handleWebhook } from '../controllers/webhookController.js';

const router = Router();

router.post('/', validateWebhook, handleWebhook);

export { router as webhookRouter };