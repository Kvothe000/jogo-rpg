import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomService {
    constructor(private prisma: PrismaService) { }

    private atmosphericDetails = [
        "A iluminação aqui pisca intermitentemente.",
        "O ar tem um cheiro metálico e ozônio.",
        "Você ouve zumbidos elétricos distantes.",
        "Cabos expostos faiscam ocasionalmente no teto.",
        "Há um silêncio inquietante neste setor.",
        "A ventilação sopra um ar gelado e úmido.",
        "Sombras parecem se mover na periferia da sua visão.",
        "Terminais antigos exibem códigos de erro em loop."
    ];

    async getRoomData(mapId: string) {
        const room = await this.prisma.gameMap.findUnique({
            where: { id: mapId },
            include: {
                characters: { select: { id: true, name: true } },
                npcInstances: {
                    where: { currentHp: { gt: 0 } },
                    include: { template: { select: { name: true } } }
                },
            },
        });

        if (!room) return null;

        // Procedural Enhancement
        const randomDetail = this.atmosphericDetails[Math.floor(Math.random() * this.atmosphericDetails.length)];
        const enrichedDescription = `${room.description}\n\n[OBSERVAÇÃO DO SISTEMA]: ${randomDetail}`;

        return {
            ...room,
            description: enrichedDescription
        };
    }
}
