import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserPayload } from './types/user-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    // 1. Buscamos o segredo
    const secret = process.env.JWT_SECRET;

    // 2. Se ele não existir, paramos o servidor na hora.
    // Isso é bom, pois nos avisa do erro de configuração.
    if (!secret) {
      throw new Error(
        'JWT_SECRET não está definido nas variáveis de ambiente!',
      );
    }

    // 3. Agora, passamos a variável 'secret' (que temos certeza
    //    que é uma string) para o super()
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // <--- AQUI
    });
  }

  /**
   * Este método é chamado pelo Passport após ele verificar
   * a assinatura do token e ver que não expirou.
   */
  // 2. DEFINA O TIPO DE RETORNO AQUI
  async validate(payload: {
    sub: string;
    email: string;
  }): Promise<UserPayload> {
    // O payload é o que colocamos no token: { sub: user.id, email: user.email }

    // Buscamos o usuário E seu personagem
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        character: true, // Incluímos os dados do personagem!
      },
    });

    // Se o usuário foi deletado, o token não vale mais
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    // Removemos a senha antes de retornar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _removedHash, ...userWithCharacter } = user;

    // O que for retornado aqui será injetado em 'req.user'
    // em todas as rotas protegidas
    return userWithCharacter;
  }
}
