import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserPayload } from '../types/user-payload.type';
import type { RequestWithUser } from '../types/request-with-user.type'; // 1. IMPORTE O NOVO TIPO

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    // 2. PEGUE A REQUISIÇÃO
    const request: RequestWithUser = ctx.switchToHttp().getRequest();

    // 3. AGORA O TS SABE QUE 'request.user' EXISTE E É DO TIPO 'UserPayload'
    // Os erros de 'any' vão desaparecer.
    return request.user;
  },
);
