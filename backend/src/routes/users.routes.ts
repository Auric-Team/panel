import { Router } from 'express';
import { getUsers, createUser, toggleBlockUser, deleteUser, updateTokens } from '../controllers/users.controller';
import { authenticate, authorizeRole } from '../middlewares/auth';

const router = Router();
const authMiddleware = authenticate;

router.use(authenticate);
router.get('/', authorizeRole(['owner', 'manager']), getUsers);
router.post('/create', authorizeRole(['owner', 'manager']), createUser);
router.post('/toggle-block', authorizeRole(['owner', 'manager']), toggleBlockUser);
router.post('/delete', authorizeRole(['owner', 'manager']), deleteUser);
router.post('/tokens', authMiddleware, updateTokens);

export default router;
