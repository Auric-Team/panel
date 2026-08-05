import { Router } from 'express';
import { getUsers, createUser, toggleBlockUser, deleteUser } from '../controllers/users.controller';
import { authenticate, authorizeRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', authorizeRole(['owner', 'manager']), getUsers);
router.post('/create', authorizeRole(['owner', 'manager']), createUser);
router.post('/toggle-block', authorizeRole(['owner', 'manager']), toggleBlockUser);
router.post('/delete', authorizeRole(['owner', 'manager']), deleteUser);

export default router;
