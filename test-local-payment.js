import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 'dummy', role: 'owner', name: 'dummy' }, '045f0b5c306c191f25f1a1c48d21957796fff47bf2b2dac7392abc06654eedc5');
console.log(token);
