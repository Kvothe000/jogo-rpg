import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt'; // <-- IMPORTE
import { LoginDto } from './dto/login.dto'; // <-- IMPORTE

@Injectable()
export class AuthService {
  // Pedimos ao NestJS para "injetar" o PrismaService que criamos
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Verificar se o email já existe
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (userExists) {
      throw new HttpException('Este email já está em uso', HttpStatus.CONFLICT);
    }

    // 2. Verificar se o nome do personagem já existe
    const characterExists = await this.prisma.character.findUnique({
      where: { name: dto.characterName },
    });

    if (characterExists) {
      throw new HttpException(
        'Este nome de personagem já está em uso',
        HttpStatus.CONFLICT,
      );
    }

    // 3. Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // 4. Criar o Usuário E o Personagem em uma única transação
    // Isso garante que se um falhar, o outro também falha (atomicidade)
    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: passwordHash,
          // Criamos o personagem "aninhado"
          character: {
            create: {
              name: dto.characterName,
              map: {
                connect: {
                  id: 'cl_starter_room',
                },
              },
              // --- NOVO: CONECTAR KEYWORDS INICIAIS ---
              powerKeywords: {
                create: [
                  // Usa 'create' para criar as entradas na tabela de junção
                  { powerKeyword: { connect: { id: 'kw_lamina' } } }, // Conecta à Keyword Lâmina
                  { powerKeyword: { connect: { id: 'kw_sombra' } } }, // Conecta à Keyword Sombra
                  // Futuro: Poderíamos permitir que o jogador escolhesse no registo
                ],
              },
              // --- FIM DA ADIÇÃO ---
            },
          },
        },
        // Stats iniciais definidos no schema.prisma (defaults)
        // Pedimos para o Prisma nos retornar o personagem junto
        include: {
          character: true,
        },
      });

      // Não retorne a senha!
      // Nós "desestruturamos" o objeto:
      // 1. A senha vai para a variável 'passwordHash' (que não usamos)
      // 2. Todo o "resto" (rest) vai para a variável 'userSemSenha'

      // Renomeamos 'passwordHash' para 'removedHash' (Hash Removido)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _removedHash, ...userSemSenha } = newUser;

      // Retornamos apenas o objeto com o "resto"
      return userSemSenha;
    } catch (error) {
      // 1. Logamos o erro real no console do servidor
      console.error('Falha no registro:', error);

      // 2. Lançamos o erro genérico para o usuário
      throw new HttpException(
        'Erro ao criar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async login(dto: LoginDto) {
    // 1. Encontrar o usuário
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Se o usuário não existe, lance um erro genérico
    if (!user) {
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    // 2. Comparar a senha enviada com o hash salvo no banco
    const isPasswordCorrect = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    // Se a senha estiver errada, lance o mesmo erro genérico
    if (!isPasswordCorrect) {
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    // 3. Se tudo estiver correto, gere o token JWT
    const payload = {
      sub: user.id, // 'sub' (subject) é o padrão do JWT para o ID do usuário
      email: user.email,
    };

    // 4. Retorne o token
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  /**
   * Rota de teste para curar o personagem e dar um buff temporário.
   */
  async healAndBuff(characterId: string) {
    const buffStrength = 50; // Aumentamos muito o dano para os testes

    // 1. Encontrar o personagem para pegar o HP máximo
    const char = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { maxHp: true, maxEco: true, strength: true, dexterity: true },
    });

    if (!char) {
      throw new HttpException(
        'Personagem não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Aplicar a cura e o buff de Força
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        hp: char.maxHp, // Restaura HP
        eco: char.maxEco, // Restaura Eco/Mana
        strength: char.strength + buffStrength, // Aumenta o dano para teste
      },
    });

    return {
      message: `Personagem curado e Força aumentada em +${buffStrength} para testes.`,
      buff: buffStrength,
    };
  }
}
