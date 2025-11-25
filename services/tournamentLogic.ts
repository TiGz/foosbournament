import { PlayerView, Match, Team } from '../types';

export const WINNING_SCORE = 10;

// Scoring Constants
export const POINTS_WIN = 1;
export const POINTS_UNICORN_BONUS = 1; // Extra point for 10-0

// Helper to create a UUID-like string
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Create a new empty player view
export const createPlayerView = (nickname: string, photoUrl: string | null): PlayerView => ({
  id: generateId(),
  nickname,
  photoUrl,
  wins: 0,
  losses: 0,
  goalsScored: 0,
  goalsConceded: 0,
  gamesPlayed: 0,
  attackPlayed: 0,
  defensePlayed: 0,
  isAvailable: true,
  points: 0,
  unicorns: 0
});

// Calculate Leaderboard
export const getLeaderboard = (players: PlayerView[]): PlayerView[] => {
  return [...players].sort((a, b) => {
    // Primary: Total Points
    if (a.points !== b.points) return b.points - a.points;

    // Tie-breaker 1: Win Count
    if (a.wins !== b.wins) return b.wins - a.wins;

    // Tie-breaker 2: Goal Difference
    const diffA = a.goalsScored - a.goalsConceded;
    const diffB = b.goalsScored - b.goalsConceded;
    return diffB - diffA;
  });
};

// Update stats after a match
export const updatePlayerStats = (players: PlayerView[], match: Match): PlayerView[] => {
  if (match.status !== 'completed' || !match.winner) return players;

  const t1 = match.team1;
  const t2 = match.team2;
  
  // Check for Unicorn (10-0)
  const isUnicorn = (t1.score === 10 && t2.score === 0) || (t2.score === 10 && t1.score === 0);

  return players.map(p => {
    let team: Team | null = null;
    let oppTeam: Team | null = null;
    let isWinner = false;

    if (t1.attackerId === p.id || t1.defenderId === p.id) {
      team = t1;
      oppTeam = t2;
      isWinner = match.winner === 'team1';
    } else if (t2.attackerId === p.id || t2.defenderId === p.id) {
      team = t2;
      oppTeam = t1;
      isWinner = match.winner === 'team2';
    }

    if (team && oppTeam) {
      const isAttacker = team.attackerId === p.id;
      
      // Calculate Points
      let matchPoints = 0;
      let unicornEarned = 0;

      if (isWinner) {
        matchPoints += POINTS_WIN;
        if (isUnicorn) {
          matchPoints += POINTS_UNICORN_BONUS;
          unicornEarned = 1;
        }
      }

      return {
        ...p,
        gamesPlayed: p.gamesPlayed + 1,
        wins: isWinner ? p.wins + 1 : p.wins,
        losses: isWinner ? p.losses : p.losses + 1,
        goalsScored: p.goalsScored + team.score,
        goalsConceded: p.goalsConceded + oppTeam.score,
        attackPlayed: isAttacker ? p.attackPlayed + 1 : p.attackPlayed,
        defensePlayed: !isAttacker ? p.defensePlayed + 1 : p.defensePlayed,
        points: p.points + matchPoints,
        unicorns: p.unicorns + unicornEarned
      };
    }
    return p;
  });
};

// Generate the next match
export const generateNextMatch = (players: PlayerView[], matches: Match[]): Match | null => {
  // Filter for available players only
  const availablePlayers = players.filter(p => p.isAvailable);

  if (availablePlayers.length < 4) return null;

  // 1. Sort available players by games played (ascending) to ensure fair rotation.
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
    return 0.5 - Math.random();
  });

  // Pick the 4 players who need to play the most
  const participants = sortedPlayers.slice(0, 4);

  // 2. Build a history of who has been teammates
  const teammateHistory: Record<string, number> = {};
  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('-');

  matches.forEach(m => {
    if (m.status === 'completed' || m.status === 'scheduled') {
      const t1Key = getPairKey(m.team1.attackerId, m.team1.defenderId);
      const t2Key = getPairKey(m.team2.attackerId, m.team2.defenderId);
      teammateHistory[t1Key] = (teammateHistory[t1Key] || 0) + 1;
      teammateHistory[t2Key] = (teammateHistory[t2Key] || 0) + 1;
    }
  });

  // 3. Generate all 3 possible ways to split these 4 participants into 2 teams
  const possibleCombinations = [
    { t1: [participants[0], participants[1]], t2: [participants[2], participants[3]] },
    { t1: [participants[0], participants[2]], t2: [participants[1], participants[3]] },
    { t1: [participants[0], participants[3]], t2: [participants[1], participants[2]] }
  ];

  const scoredCombinations = possibleCombinations.map(combo => {
    const t1Key = getPairKey(combo.t1[0].id, combo.t1[1].id);
    const t2Key = getPairKey(combo.t2[0].id, combo.t2[1].id);
    const cost = (teammateHistory[t1Key] || 0) + (teammateHistory[t2Key] || 0);
    return { ...combo, cost };
  });

  scoredCombinations.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    return 0.5 - Math.random();
  });

  const bestOption = scoredCombinations[0];

  // 4. Assign Roles (Attack vs Defense) based on history
  const assignRoles = (p1: PlayerView, p2: PlayerView): { attackerId: string, defenderId: string } => {
    // Calculate "Attack Bias" = AttackGames - DefenseGames
    const bias1 = (p1.attackPlayed || 0) - (p1.defensePlayed || 0);
    const bias2 = (p2.attackPlayed || 0) - (p2.defensePlayed || 0);

    // We want the person with the higher bias to Defend.
    if (bias1 > bias2) {
      return { attackerId: p2.id, defenderId: p1.id };
    } else if (bias2 > bias1) {
      return { attackerId: p1.id, defenderId: p2.id };
    } else {
      // Random if equal bias
      return Math.random() > 0.5 
        ? { attackerId: p1.id, defenderId: p2.id }
        : { attackerId: p2.id, defenderId: p1.id };
    }
  };

  const team1Roles = assignRoles(bestOption.t1[0], bestOption.t1[1]);
  const team2Roles = assignRoles(bestOption.t2[0], bestOption.t2[1]);

  return {
    id: generateId(),
    status: 'scheduled',
    timestamp: Date.now(),
    team1: { ...team1Roles, score: 0 },
    team2: { ...team2Roles, score: 0 }
  };
};

// Generate a queue of matches to equalise games played
export const generateMatchQueue = (players: PlayerView[], matches: Match[]): Match[] => {
  const queue: Match[] = [];
  
  // Create deep copies to simulate progression without affecting current state
  let virtualPlayers = players.map(p => ({ ...p }));
  let virtualMatches = matches.map(m => ({ ...m }));

  // 1. Determine Target
  // We want to raise the floor (min games played) to the next level.
  // If everyone is equal (variance 0), target = current + 1.
  // If unequal, target = max(current).
  const availablePlayers = virtualPlayers.filter(p => p.isAvailable);
  if (availablePlayers.length < 4) return [];

  const counts = availablePlayers.map(p => p.gamesPlayed);
  const minGames = Math.min(...counts);
  const maxGames = Math.max(...counts);
  
  let targetGames = maxGames;
  if (minGames === maxGames) {
      targetGames = maxGames + 1;
  }
  
  // Safety Limit
  const MAX_ADDED_MATCHES = 20; 
  
  for (let i = 0; i < MAX_ADDED_MATCHES; i++) {
      const currentMin = Math.min(...virtualPlayers.filter(p => p.isAvailable).map(p => p.gamesPlayed));
      if (currentMin >= targetGames) break;

      const nextMatch = generateNextMatch(virtualPlayers, virtualMatches);
      if (!nextMatch) break;

      // Add to queue
      queue.push(nextMatch);
      virtualMatches.push(nextMatch);

      // Update virtual player stats (gamesPlayed) for the next iteration
      const participantIds = [
          nextMatch.team1.attackerId, 
          nextMatch.team1.defenderId, 
          nextMatch.team2.attackerId, 
          nextMatch.team2.defenderId
      ];

      virtualPlayers = virtualPlayers.map(p => {
          if (participantIds.includes(p.id)) {
              return { 
                  ...p, 
                  gamesPlayed: p.gamesPlayed + 1,
                  // Also update position stats roughly for the bias logic to keep working in simulation
                  attackPlayed: (p.id === nextMatch.team1.attackerId || p.id === nextMatch.team2.attackerId) ? p.attackPlayed + 1 : p.attackPlayed,
                  defensePlayed: (p.id === nextMatch.team1.defenderId || p.id === nextMatch.team2.defenderId) ? p.defensePlayed + 1 : p.defensePlayed,
              };
          }
          return p;
      });
  }

  return queue;
};