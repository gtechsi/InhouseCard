// Script para mostrar instruções sobre como criar índices no Firestore
// Execute com: node create-indexes.mjs

import dotenv from 'dotenv';

// Configurar o dotenv
dotenv.config();

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'inhousecard-a17c9';

// Limpa o console
console.clear();

console.log('=============================================');
console.log('INSTRUÇÕES PARA CRIAR ÍNDICES NO FIRESTORE');
console.log('=============================================\n');

console.log('Para criar os índices necessários para a aplicação, acesse o console do Firebase:');
console.log(`https://console.firebase.google.com/project/${projectId}/firestore/indexes\n`);

console.log('Você precisa criar os seguintes índices compostos:');
console.log('----------------------------------------------');
console.log('1) Coleção: "orders"');
console.log('   Campos:');
console.log('   - user_id (Ascending)');
console.log('   - status (Ascending)');
console.log('   - created_at (Descending)\n');

console.log('2) Coleção: "orders"');
console.log('   Campos:');
console.log('   - user_id (Ascending)');
console.log('   - created_at (Descending)\n');

console.log('3) Coleção: "orders"');
console.log('   Campos:');
console.log('   - status (Ascending)');
console.log('   - created_at (Descending)\n');

console.log('----------------------------------------------');
console.log('IMPORTANTE:');
console.log('Após criar os índices, aguarde alguns minutos para que eles sejam construídos.');
console.log('Então tente acessar a página de pedidos novamente na aplicação.');
console.log('============================================='); 