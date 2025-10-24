import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// --- A CORREÇÃO (REVISADA) ---
// Dizemos ao linter para ignorar o 'as any' nesta linha específica
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(BigInt.prototype as any).toJSON = function (this: bigint) {
  // Agora o TS sabe que 'this' é um 'bigint',
  // então 'this.toString()' é 100% seguro.
  return this.toString();
};
// --- FIM DA CORREÇÃO ---

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(3000);
}
bootstrap();
