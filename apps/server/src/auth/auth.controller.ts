import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get, // 1. IMPORTE O 'Get'
  UseGuards,
  HttpException, // 2. IMPORTE O 'UseGuards'
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // 4. IMPORTE NOSSO GUARDA
import { GetUser } from './decorators/get-user.decorator';
import type { UserPayload } from './types/user-payload.type';

@Controller('auth') // Define o prefixo da rota (ex: /auth/register)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // Rota: POST /auth/register
  @HttpCode(HttpStatus.CREATED) // Retorna status 201 em vez de 200
  async register(@Body() registerDto: RegisterDto) {
    // Graças ao ValidationPipe e ao DTO,
    // o 'registerDto' já chega validado!
    return this.authService.register(registerDto);
  }
  // ADICIONE O ENDPOINT DE LOGIN
  @Post('login')
  @HttpCode(HttpStatus.OK) // Retorna 200 OK
  async login(@Body() loginDto: LoginDto) {
    // O DTO e o ValidationPipe cuidam da validação
    return this.authService.login(loginDto);
  }
  // ----- NOSSO ENDPOINT PROTEGIDO (REFEITO) -----
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  // 2. SUBSTITUA O @Request() req PELO NOSSO @GetUser()
  getProfile(@GetUser() user: UserPayload) {
    // 3. 'user' agora está 100% tipado e seguro!
    //    Os erros do ESLint desaparecerão.
    return user;
  }
  @UseGuards(JwtAuthGuard)
  @Get('heal')
  @HttpCode(HttpStatus.OK)
  async heal(@GetUser() user: UserPayload) {
    // --- CORREÇÃO (Type Guard) ---
    if (!user.character) {
      // Se, por algum motivo MUITO estranho, não houver personagem, retorne erro.
      throw new HttpException(
        'Personagem não encontrado para este usuário.',
        HttpStatus.NOT_FOUND,
      );
    }
    // Daqui em diante, o TS sabe que user.character existe.
    // --- FIM DA CORREÇÃO ---

    return this.authService.healAndBuff(user.character.id);
  }
}
