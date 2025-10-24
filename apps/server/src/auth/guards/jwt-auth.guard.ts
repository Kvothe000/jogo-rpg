import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// O 'jwt' aqui tem que ser o mesmo nome que demos no
// PassportStrategy(Strategy, 'jwt') na jwt.strategy.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
