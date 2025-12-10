const io = require('socket.io-client');
const axios = require('axios');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- TEST: NPC Interaction ---');
    const email = `testnpc_${Date.now()}@test.com`;
    const password = '123456';
    const charName = `TestChar_${Date.now()}`;

    // 1. Register
    console.log(`1. Registering ${email}...`);
    try {
        await axios.post('http://localhost:3000/auth/register', {
            email,
            password,
            characterName: charName,
            characterClass: 'BRUTE'
        });
    } catch (e) {
        console.error('Register failed:', e.response?.data || e.message);
        return; // Don't stop, maybe exists?
    }

    // 2. Login
    console.log('2. Logging in...');
    let token;
    let userId;
    try {
        const res = await axios.post('http://localhost:3000/auth/login', {
            email,
            password
        });
        token = res.data.access_token;
        // Decode token to get ID? Or fetch from DB.
        const user = await prisma.user.findUnique({ where: { email } });
        userId = user.id;
        console.log('✅ Logged in.');
    } catch (e) {
        console.error('Login failed:', e.response?.data || e.message);
        return;
    }

    // 3. Force Move to Starter Room
    console.log('3. Force moving character to starter room...');
    const char = await prisma.character.findFirst({ where: { userId } });
    await prisma.character.update({
        where: { id: char.id },
        data: {
            mapId: 'cl_starter_room',
            prologueState: 'COMPLETED',
            prologueData: { ending: 'ENTER_PORTAL' }
        }
    });

    // 4. Connect Socket
    console.log('4. Connecting Socket...');
    const socket = io('http://localhost:3000', {
        extraHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected!');

        // 5. Interact with Velho Escriba
        const npcId = 'cmixns0lw0007t5esgg9xa5b8';
        console.log(`5. Emitting playerInteractNpc for ${npcId}...`);
        socket.emit('playerInteractNpc', { npcInstanceId: npcId });
    });

    socket.on('npcDialogue', (data) => {
        console.log('✅ RECEBIDOO npcDialogue:', data);
        socket.disconnect();
        process.exit(0);
    });

    socket.on('serverMessage', (msg) => {
        console.log('⚠️ Server Message:', msg);
    });

    // Add quest update listener
    socket.on('updateQuests', (data) => {
        console.log('✅ Quest Updated:', data);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected.');
    });

    // Timeout
    setTimeout(() => {
        console.log('⏰ Timeout waiting for response.');
        socket.disconnect();
        process.exit(1);
    }, 5000);
}

main();
