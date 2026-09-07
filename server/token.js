import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 'dummy', role: 'owner', name: 'dummy' }, 'fallback-secret-development-only-change-in-prod');
console.log(token);
