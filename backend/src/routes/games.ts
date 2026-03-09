import { Router } from 'express';
import { listGames, gameHistory, getGame, createGame } from '../controllers/gameController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', listGames);
router.get('/history', authenticate, gameHistory);
router.get('/:id', getGame);
router.post('/create', authenticate, createGame);

export default router;
