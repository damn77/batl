// Shared Tournament Service
// Abstracts common logic for tournament operations (Singles & Doubles)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check tournament capacity and determine registration status
 * @param {string} tournamentId
 * @param {string} registrationTable - 'tournamentRegistration' or 'pairRegistration'
 * @returns {Promise<Object>} { status, capacity, currentCount, isFull }
 */
export async function checkCapacity(tournamentId, registrationTable = 'tournamentRegistration') {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { capacity: true }
    });

    if (!tournament) {
        throw new Error('Tournament not found');
    }

    // null capacity = unlimited
    if (tournament.capacity === null) {
        return {
            status: 'REGISTERED',
            capacity: null,
            currentCount: 0,
            isFull: false
        };
    }

    // Count current REGISTERED entities
    // Dynamic table access via prisma[registrationTable]
    const currentCount = await prisma[registrationTable].count({
        where: {
            tournamentId,
            status: 'REGISTERED'
        }
    });

    const isFull = currentCount >= tournament.capacity;
    const status = isFull ? 'WAITLISTED' : 'REGISTERED';

    return {
        status,
        capacity: tournament.capacity,
        currentCount,
        isFull
    };
}

/**
 * Find the next candidate to promote from the waitlist
 * @param {string} tournamentId
 * @param {string} registrationTable - 'tournamentRegistration' or 'pairRegistration'
 * @returns {Promise<Object|null>} The registration record to promote
 */
export async function getNextWaitlistCandidate(tournamentId, registrationTable = 'tournamentRegistration') {
    return await prisma[registrationTable].findFirst({
        where: {
            tournamentId,
            status: 'WAITLISTED'
        },
        orderBy: {
            registrationTimestamp: 'asc' // FIFO
        }
    });
}

export default {
    checkCapacity,
    getNextWaitlistCandidate
};
