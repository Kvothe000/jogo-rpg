import { Request } from 'express';
import type { UserPayload } from './user-payload.type';

export interface RequestWithUser extends Request {
  user: UserPayload;
}
