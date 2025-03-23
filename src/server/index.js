import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { webhookRouter } from './routes/webhook.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Carregar variáveis de ambiente
config();

// Configurar o servidor
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Cabeçalhos de segurança
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Analisar corpos JSON
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Registro de solicitações HTTP

// Rotas
app.use('/webhook', webhookRouter);

// Rota básica para teste
app.get('/', (req, res) => {
  res.status(200).send('API InHouse Card - Mercado Pago Webhook Server');
});

// Manipulação de erros
app.use(errorHandler);

// Iniciar servidor
app.listen(port, () => {
  logger.info(`Servidor rodando na porta ${port} em modo ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Webhook disponível em: http://localhost:${port}/webhook`);
});

export default app;