// Precisamos instalar estas bibliotecas para validar os dados
// Rode no terminal: pnpm install class-validator class-transformer
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome do personagem é obrigatório.' })
  @MinLength(3, {
    message: 'O nome do personagem deve ter no mínimo 3 caracteres.',
  })
  characterName: string;
}
