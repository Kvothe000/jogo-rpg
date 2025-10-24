import { User, Character } from '@prisma/client';

// O personagem PODE ser nulo, de acordo com o Schema do Prisma
export type UserPayload = Omit<User, 'passwordHash'> & {
  character: Character | null;
};

// Adicione este tipo (para o payload do token) já que estamos aqui
export type TokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};
