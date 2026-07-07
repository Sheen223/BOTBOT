import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getRooms, getRoomById } from './controllers/roomController';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BOTBOT backend is healthy' });
});

app.get('/api/rooms', getRooms);
app.get('/api/rooms/:id', getRoomById);

app.use(errorHandler);

export default app;
