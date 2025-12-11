import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    PrologueUpdatePayload,
} from '../types/socket-with-auth.type';
import { QuestService } from 'src/quest/quest.service';

@Injectable()
export class PrologueService {
    private readonly logger = new Logger(PrologueService.name);

    constructor(
        private prisma: PrismaService,
        private questService: QuestService
    ) { }

    /**
     * Retorna o estado atual do prólogo para um personagem e o payload de atualização
     * para enviar ao cliente.
     */
    async getPrologueState(characterId: string): Promise<PrologueUpdatePayload | null> {
        const character = await this.prisma.character.findUnique({
            where: { id: characterId },
        });

        if (!character || character.prologueState === 'COMPLETED') {
            return null;
        }

        return this.buildPayloadForState(character.prologueState);
    }

    /**
     * Processa uma interação de objeto (clicar em algo).
     */
    async handleInteract(characterId: string, targetId: string): Promise<PrologueUpdatePayload | null> {
        const character = await this.prisma.character.findUnique({
            where: { id: characterId },
        });

        if (!character) return null;

        const currentState = character.prologueState;
        let newState = currentState;

        // --- CENA 1: A FACHADA ---
        if (currentState === 'NOT_STARTED' || currentState === 'SCENE_1_INTRO') {
            if (targetId === 'terminal_primario_01') {
                newState = 'SCENE_1_GLITCH';
            }
        }

        // --- CENA 2: O CONFINAMENTO ---
        else if (currentState === 'SCENE_2_ELARA_CONTACT') {
            if (targetId === 'painel_de_controle_cela') {
                newState = 'SCENE_2_CHOICE_OPEN';
            }
        }

        // --- CENA 3: A FUGA ---
        else if (currentState === 'SCENE_3_ESCAPE_START') {
            if (targetId === 'ferida_digital_01') {
                newState = 'SCENE_4_KEYWORD_SELECT';
            }
        }

        // --- CENA 5 (Uso da Skill) ---
        else if (currentState === 'SCENE_5_SKILL_TUTORIAL') {
            // Permite avançar tanto clicando no boneco (fallback) quanto usando a skill (via trigger externo)
            if (targetId === 'boneco_de_treino_01' || targetId === 'SKILL_USED_SUCCESS') {
                newState = 'SCENE_6_CONCLUSION';
            }
        }

        if (newState !== currentState) {
            await this.updateState(characterId, newState);
            return this.buildPayloadForState(newState);
        }

        return null;
    }

    /**
     * Processa uma escolha de diálogo.
     */
    async handleChoice(characterId: string, choiceId: string): Promise<PrologueUpdatePayload | null> {
        this.logger.log(`[handleChoice] Char: ${characterId}, Choice: ${choiceId}`);

        const character = await this.prisma.character.findUnique({
            where: { id: characterId },
        });
        if (!character) {
            this.logger.warn(`[handleChoice] Character not found: ${characterId}`);
            return null;
        }

        const currentState = character.prologueState;
        let newState = currentState;

        this.logger.log(`[handleChoice] Current State: ${currentState}`);

        // Helper safety check for usage below
        const getAlignment = (c: any) => (c.prologueData as any)?.alignment || { citadel: 0, renegade: 0, neutral: 0 };

        // --- CENA 1: Intro -> Anomaly ---
        if (currentState === 'SCENE_1_INTRO') {
            // Aceita qualquer escolha inicial (Trabalhar/Explorar)
            newState = 'SCENE_1_ANOMALY';

            // Alignment
            const currentData = (character.prologueData as any) || {};
            const align = currentData.alignment || { citadel: 0, renegade: 0, neutral: 0 };

            if (choiceId === 'WORK') align.citadel++;
            if (choiceId === 'SLACK') align.renegade++;
            if (choiceId === 'EXPLORE') align.neutral++;

            await this.prisma.character.update({
                where: { id: characterId },
                data: { prologueState: newState, prologueData: { ...currentData, alignment: align } }
            });
            return this.buildPayloadForState(newState);
        }

        // --- CENA 1: Anomaly -> Glitch ---
        else if (currentState === 'SCENE_1_ANOMALY') {
            // Aceita qualquer reação (Reportar/Esconder)
            newState = 'SCENE_1_GLITCH';

            // Alignment
            const currentData = (character.prologueData as any) || {};
            const align = currentData.alignment || { citadel: 0, renegade: 0, neutral: 0 };

            if (choiceId === 'REPORT') align.citadel += 2;
            if (choiceId === 'HIDE') align.renegade += 2;
            if (choiceId === 'TOUCH') align.neutral += 2;

            await this.prisma.character.update({
                where: { id: characterId },
                data: { prologueState: newState, prologueData: { ...currentData, alignment: align } }
            });
            return this.buildPayloadForState(newState);
        }

        // --- CENA 1: Supervisor -> Confinement ---
        else if (currentState === 'SCENE_1_SUPERVISOR') {
            newState = 'SCENE_2_CONFINEMENT';
        }

        // --- CENA 2: Confinement -> Struggle ---
        else if (currentState === 'SCENE_2_CONFINEMENT') {
            if (choiceId === 'FORCE_DOOR') {
                // Player tries to force door -> Fail -> Struggle State
                newState = 'SCENE_2_STRUGGLE';
            }
        }

        // --- CENA 2: Struggle -> Elara ---
        else if (currentState === 'SCENE_2_STRUGGLE') {
            if (choiceId === 'YELL') {
                // Player yells -> Elara contacts
                newState = 'SCENE_2_ELARA_CONTACT';
            }
        }

        // --- CENA 2: Elara ---
        else if (currentState === 'SCENE_2_CHOICE_OPEN') {
            const choiceMap: Record<string, string> = { '1': 'DESCONFIADO', '2': 'CURIOSO', '3': 'PRAGMATICO' };
            const affinity = choiceMap[choiceId] || 'UNKNOWN';

            this.logger.log(`[handleChoice] Scene 2 Choice. Affinity: ${affinity}`);

            // Trata prologueData de forma segura para garantir que é um objeto
            const currentData = (character.prologueData && typeof character.prologueData === 'object' && !Array.isArray(character.prologueData))
                ? character.prologueData as object
                : {};

            await this.prisma.character.update({
                where: { id: characterId },
                data: {
                    prologueState: 'SCENE_3_ESCAPE_START',
                    prologueData: {
                        ...currentData,
                        affinity: affinity
                    }
                }
            });

            return this.buildPayloadForState('SCENE_3_ESCAPE_START');
        }

        // --- CENA 4: Escolha de Keyword e Transição para Cena 5 ---
        else if (currentState === 'SCENE_4_KEYWORD_SELECT') {
            const keywordMap: Record<string, string> = { 'GLITCH': 'Glitch', 'IRON': 'Ferro', 'SHADOW': 'Sombra' };
            const selectedKeyword = keywordMap[choiceId];

            if (selectedKeyword) {
                this.logger.log(`[handleChoice] Scene 4 Choice. Keyword: ${selectedKeyword}`);

                let initialSkillId = 'sk_corte_dissimulado'; // Default (Shadow/Glitch)
                if (selectedKeyword === 'Ferro') initialSkillId = 'sk_lamina_incandescente'; // Força/Fogo

                const currentData = (character.prologueData && typeof character.prologueData === 'object' && !Array.isArray(character.prologueData))
                    ? character.prologueData as object
                    : {};

                // Safely add skill (Idempotent)
                await this.prisma.characterSkill.upsert({
                    where: {
                        characterId_skillId: {
                            characterId: characterId,
                            skillId: initialSkillId
                        }
                    },
                    create: {
                        characterId: characterId,
                        skillId: initialSkillId
                    },
                    update: {}
                });

                await this.prisma.character.update({
                    where: { id: characterId },
                    data: {
                        prologueState: 'SCENE_5_SKILL_TUTORIAL',
                        prologueData: {
                            ...currentData,
                            chosenKeyword: selectedKeyword,
                            initialSkill: initialSkillId
                        }
                    }
                });
                return this.buildPayloadForState('SCENE_5_SKILL_TUTORIAL');
            }
        }

        // --- CENA 6: Conclusão / O Dilema ---
        // --- CENA 6: Conclusão ---
        else if (currentState === 'SCENE_6_CONCLUSION') {
            let targetRoom = 'cl_starter_room';
            let endMessage = 'Prólogo Finalizado.';

            if (choiceId === 'ENTER_PORTAL') {
                targetRoom = 'td_room_01_entrance'; // Leads to Tutorial Dungeon
                endMessage = '>> SISTEMA: ATENÇÃO! DUNGEON RANK F DETECTADA. <<\n\n[GLITCH] A realidade se fragmenta ao seu redor...';
            } else if (choiceId === 'CAUGHT_CITADEL') {
                targetRoom = 'cl_hallway_01';
                endMessage = 'Você foi capturado pela Cidadela.';
            }

            if (choiceId === 'ENTER_PORTAL' || choiceId === 'CAUGHT_CITADEL') {
                const currentData = (character.prologueData && typeof character.prologueData === 'object' && !Array.isArray(character.prologueData))
                    ? character.prologueData as any
                    : {};

                // --- ALIGNMENT REWARD CALC ---
                const align = currentData.alignment || { citadel: 0, renegade: 0, neutral: 0 };
                let rewardTrait = 'trait_balance'; // Default
                let rewardMsg = '>> SINTONIA: NEUTRA. Você vê o código como ele é. [+10 Max Eco]';
                let statUpdate = { maxEco: { increment: 10 } };

                if (align.citadel > align.renegade && align.citadel > align.neutral) {
                    rewardTrait = 'trait_order';
                    rewardMsg = '>> SINTONIA: ORDEM. Sua lealdade blindou sua mente. [+2 Defesa]';
                    statUpdate = { defense: { increment: 2 } } as any;
                } else if (align.renegade > align.citadel && align.renegade > align.neutral) {
                    rewardTrait = 'trait_chaos';
                    rewardMsg = '>> SINTONIA: CAOS. Sua rebeldia afiou seus reflexos. [+2 Ataque]';
                    statUpdate = { strength: { increment: 2 } } as any; // Using Strength as proxy for Attack
                }

                // Grant Trait (Keyword)
                await this.prisma.characterPowerKeyword.upsert({
                    where: { characterId_powerKeywordId: { characterId, powerKeywordId: rewardTrait } },
                    create: { characterId, powerKeywordId: rewardTrait },
                    update: {}
                });

                // Apply Stat Bonus & Finish
                await this.prisma.character.update({
                    where: { id: characterId },
                    data: {
                        prologueState: 'COMPLETED',
                        mapId: targetRoom,
                        prologueData: {
                            ...currentData,
                            ending: choiceId,
                            finalAlignment: align,
                            rewardTrait
                        },
                        ...statUpdate
                    }
                });

                // Append reward msg
                endMessage += `\n\n${rewardMsg}`;

                // Start First Quest
                try {
                    await this.questService.startQuest(characterId, 'qst_eco_awakening');
                } catch (e) {
                    this.logger.error(`Failed to start first quest for ${characterId}`, e);
                }

                return { step: 'COMPLETED', scene: 'COMPLETED', targetId: '', message: endMessage };
            }
        }

        if (newState !== currentState) {
            await this.updateState(characterId, newState);
            return this.buildPayloadForState(newState);
        }

        return null;
    }

    /**
     * Força uma atualização de estado (usada por timers no Gateway, ex: Supervisor chegando).
     */
    async forceTransition(characterId: string, targetState: string) {
        await this.updateState(characterId, targetState);
        return this.buildPayloadForState(targetState);
    }

    private async updateState(characterId: string, newState: string) {
        await this.prisma.character.update({
            where: { id: characterId },
            data: { prologueState: newState },
        });
        this.logger.log(`Character ${characterId} advanced to ${newState}`);
    }

    private buildPayloadForState(state: string): PrologueUpdatePayload {
        switch (state) {
            // --- CENA 1 ---
            case 'NOT_STARTED':
            case 'SCENE_1_INTRO':
                return {
                    scene: '1',
                    step: 'SCENE_1_INTRO',
                    message: '>> SISTEMA OPERACIONAL CIDADELA v90.2 <<\n>> STATUS: Conectado. \n\nSua tarefa diária de processamento de dados espera. O código flui na tela interminavelmente.',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'WORK', text: '[OBEDECER] Iniciar calibração de rotina' },
                        { id: 'EXPLORE', text: '[CURIOSO] Investigar logs de erro incomuns' },
                        { id: 'SLACK', text: '[BURLAR] Tentar otimizar o trabalho para terminar cedo' }
                    ]
                };

            case 'SCENE_1_ANOMALY':
                return {
                    scene: '1',
                    step: 'SCENE_1_ANOMALY',
                    message: '>> ERRO CRÍTICO: VIOLAÇÃO DE INTEGRIDADE. <<\n\nNúmeros começam a sangrar na tela. Uma linha de código pulsa com uma cor que não deveria existir: Dourado.',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'REPORT', text: '[REPORTAR] "Supervisor! Erro no terminal!"' },
                        { id: 'TOUCH', text: '[TOCAR] Tentar interagir com o código dourado' },
                        { id: 'HIDE', text: '[ESCONDER] Tentar fechar a janela antes que vejam' }
                    ]
                };

            case 'SCENE_1_GLITCH':
                return {
                    scene: '1',
                    step: 'SCENE_1_GLITCH',
                    message: '//- PROJETO RESSONÂNCIA :: ECO DETECTADO :: AMEAÇA NÍVEL S_GMA -//',
                    targetId: '',
                };

            case 'SCENE_1_SUPERVISOR':
                return {
                    scene: '1',
                    step: 'SCENE_1_SUPERVISOR',
                    message: '**Supervisor:** "Incompatibilidade de Ressonância. Nível Sigma confirmado. Lamento. Protocolos de contenção serão iniciados."',
                    targetId: '',
                    dialogueOptions: [
                        { id: '1', text: '[Confuso] "Ressonância? O que aconteceu?"' },
                        { id: '2', text: '[Desafiador] "Que direito vocês têm?"' },
                        { id: '3', text: '[Silêncio] ...' },
                    ]
                };

            // --- CENA 2 ---
            case 'SCENE_2_CONFINEMENT':
            case 'SCENE_2_DETAINED': // Backward combatibility
                return {
                    scene: '2',
                    step: 'SCENE_2_CONFINEMENT',
                    message: '>> INTERFACE BLOQUEADA. STATUS: Análise Compulsória Pendente. <<\n\nVocê está trancado em uma cela de contenção de dados. As paredes pulsam com códigos de bloqueio.',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'FORCE_DOOR', text: '[FORÇA] Tentar abrir a porta manualmente' }
                    ]
                };

            case 'SCENE_2_STRUGGLE':
                return {
                    scene: '2',
                    step: 'SCENE_2_STRUGGLE',
                    message: 'A porta nem se move. Seus músculos (ou o que sobrou deles na simulação) queimam.\n\n>> ALERTA: Tentativa de fuga registrada. <<',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'YELL', text: '[GRITAR] "Ei! Vocês não podem me prender!"' }
                    ]
                };

            case 'SCENE_2_ELARA_CONTACT':
                return {
                    scene: '2',
                    step: 'SCENE_2_ELARA_CONTACT',
                    message: '**Voz Distorcida:** "...escute... Consegue ouvir-me por entre o ruído da Ordem? O tempo é curto."',
                    targetId: 'painel_de_controle_cela',
                };

            case 'SCENE_2_CHOICE_OPEN':
                return {
                    scene: '2',
                    step: 'SCENE_2_CHOICE_OPEN',
                    message: '**Elara:** "Posso tirar-te daqui, mas tens de confiar. Estás pronto?"',
                    targetId: '',
                    dialogueOptions: [
                        { id: '1', text: '[Desconfiado] "Quem é você? Isso é algum truque?"' },
                        { id: '2', text: '[Curioso] "Eco? Arquiteto? O que está acontecendo?"' },
                        { id: '3', text: '[Pragmático] "Não quero ser apagado. Diga o que fazer."' },
                    ]
                };

            case 'SCENE_3_ESCAPE_START':
                return {
                    scene: '3',
                    step: 'SCENE_3_ESCAPE_START',
                    message: '**Elara:** "Agora! O campo de força caiu. Corra para a <span class="highlight-objective">Ferida Digital</span>! Não olhe para trás!"',
                    targetId: 'ferida_digital_01',
                };

            case 'SCENE_4_KEYWORD_SELECT':
                return {
                    scene: '4',
                    step: 'SCENE_4_KEYWORD_SELECT',
                    message: '>> SISTEMA HÍBRIDO ATIVO. <<\n\nVocê alcança a Ferida. O código bruto do mundo pulsa ao seu redor. Uma escolha define sua nova existência. Qual é o seu Eco?',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'GLITCH', text: '[GLITCH] "Eu sou a falha no sistema. O erro que eles não podem corrigir."' },
                        { id: 'IRON', text: '[FERRO] "Eu sou a resistência. Inquebrável e implacável."' },
                        { id: 'SHADOW', text: '[SOMBRA] "Eu sou o invisível. Aquele que age nas entrelinhas."' },
                    ]
                };

            // --- CENA 5: Tutorial ---
            case 'SCENE_5_SKILL_TUTORIAL':
                return {
                    scene: '5',
                    step: 'SCENE_5_SKILL_TUTORIAL',
                    message: '>> NOVA HABILIDADE ADQUIRIDA. <<\n\n**Elara:** "Sentiu isso? É o poder do Arquiteto fluindo em você. Use-o para destruir o <span class="highlight-objective">Bloqueio de Dados</span> à frente!"\n\n(DICA: Abra o menu de Skills ou use o atalho para ativar sua nova habilidade.)',
                    targetId: 'boneco_de_treino_01',
                };

            case 'SCENE_6_CONCLUSION':
                return {
                    scene: '6',
                    step: 'SCENE_6_CONCLUSION',
                    message: '**Arquiteto:** "Interessante... Você persiste. A saída está logo à frente, mas a Cidadela o cerca."\n\nÀ sua frente, o Portal se abre, instável e barulhento. Atrás, drones da Ordem se aproximam.',
                    targetId: '',
                    dialogueOptions: [
                        { id: 'ENTER_PORTAL', text: '[CORRER] "Atravessar o portal antes que feche!"' },
                        { id: 'CAUGHT_CITADEL', text: '[RENDER-SE] "Não há saída. Entregar-se à Cidadela."' }
                    ]
                };

            case 'SCENE_4_AWAKENED':
                return { scene: '4', step: 'SCENE_4_AWAKENED', message: '...', targetId: '' }; // Fallback

            default:
                return {
                    scene: 'unknown',
                    step: state,
                    message: '',
                    targetId: '',
                };
        }
    }
}
