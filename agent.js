///<reference path="main.ts"/>
// timeout ms before search is abruptly stopped
const TIMEOUT = 20000;
const MAXSEATS = 4;
const MAXSOLUTIONS = 10;
// id -> Player dictionary for all players
var PLAYERS = {};
// Track search progress for UI feedback
var searchProgress = {
    nodesExpanded: 0,
    nodesGenerated: 0,
    nodesSkipped: 0,
    goalsFound: 0,
    bestScore: Infinity,
    progressPercent: 0
};
// Default weights
const DEFAULT_WEIGHTS = {
    powerImbalance: 50, // Increased from 10 to 50 to strongly discourage power mismatches
    powerDiff: 1.5, // Increased from 0.1 to 1.5 to heavily penalize non-overlapping power levels
    blacklist: 100, // Increased from 50 to 100 to make blacklists even more important
    emptySeat: 10, // Reduced from 30 to 10 to prefer fuller tables of same power level
    unseated: 1,
    playHistory: 3, // Reduced slightly to prioritize power matching over play history
    powerDiversity: 40 // High penalty for tables with multiple power levels
};
let playerPlayHistory = {};
// Function to track players who have played together
function recordPlayedTogether(seatings) {
    // Skip if seatings is undefined or not an array
    if (!seatings || !Array.isArray(seatings)) {
        console.warn("Invalid seatings provided to recordPlayedTogether", seatings);
        return;
    }
    try {
        seatings.forEach(table => {
            // Skip if table is not an array
            if (!Array.isArray(table))
                return;
            // For each pair of players at this table, record that they played together
            for (let i = 0; i < table.length; i++) {
                for (let j = i + 1; j < table.length; j++) {
                    const playerId1 = table[i];
                    const playerId2 = table[j];
                    // Skip invalid player IDs
                    if (playerId1 === undefined || playerId2 === undefined)
                        continue;
                    // Initialize histories if they don't exist
                    if (!playerPlayHistory[playerId1]) {
                        playerPlayHistory[playerId1] = {};
                    }
                    if (!playerPlayHistory[playerId2]) {
                        playerPlayHistory[playerId2] = {};
                    }
                    // Increment play count
                    playerPlayHistory[playerId1][playerId2] = (playerPlayHistory[playerId1][playerId2] || 0) + 1;
                    playerPlayHistory[playerId2][playerId1] = (playerPlayHistory[playerId2][playerId1] || 0) + 1;
                }
            }
        });
        // Save to localStorage for persistence
        localStorage.setItem('playerPlayHistory', JSON.stringify(playerPlayHistory));
    }
    catch (error) {
        console.error("Error in recordPlayedTogether:", error);
        // Don't throw the error, just log it
    }
}
// Load play history from localStorage if available
function loadPlayHistory() {
    const savedHistory = localStorage.getItem('playerPlayHistory');
    if (savedHistory) {
        try {
            playerPlayHistory = JSON.parse(savedHistory);
        }
        catch (e) {
            console.error('Error parsing play history:', e);
            playerPlayHistory = {};
        }
    }
}
// Call this function when the page loads
function initPlayHistory() {
    var _a;
    loadPlayHistory();
    // Trigger history visualization update if the modal is open
    if ((_a = document.getElementById('history')) === null || _a === void 0 ? void 0 : _a.classList.contains('active')) {
        // Wait for DOM to be ready
        requestAnimationFrame(() => {
            if (typeof updateHistoryVisualization === 'function') {
                updateHistoryVisualization();
            }
        });
    }
}
// Utility to clear play history
function clearPlayHistory() {
    playerPlayHistory = {};
    localStorage.removeItem('playerPlayHistory');
}
// Export play history to a file
function exportPlayHistory() {
    const data = JSON.stringify(playerPlayHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'play_history.json';
    a.click();
    URL.revokeObjectURL(url);
}
// Import play history from a file
function importPlayHistory(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        var _a;
        try {
            const importedHistory = JSON.parse((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
            // Merge with existing history
            for (const playerId in importedHistory) {
                if (!playerPlayHistory[playerId]) {
                    playerPlayHistory[playerId] = {};
                }
                for (const otherPlayerId in importedHistory[playerId]) {
                    const currentCount = playerPlayHistory[playerId][otherPlayerId] || 0;
                    const importedCount = importedHistory[playerId][otherPlayerId];
                    playerPlayHistory[playerId][otherPlayerId] = currentCount + importedCount;
                }
            }
            // Save merged history
            localStorage.setItem('playerPlayHistory', JSON.stringify(playerPlayHistory));
            alert('Play history imported and merged successfully!');
        }
        catch (e) {
            console.error('Error importing play history:', e);
            alert('Error importing play history. Please check the file format.');
        }
    };
    reader.readAsText(file);
}
class MinHeap {
    constructor(h) {
        this.getval = h;
        this.heap = [];
    }
    copy() {
        let a = new MinHeap(this.getval);
        a.heap = Array.from(this.heap);
        return a;
    }
    orderedArrHelper(index, outArray) {
        outArray.push(this.heap[index]);
        if (this.hasRightChild(index)) {
            this.orderedArrHelper(this.getRightChildIndex(index), outArray);
        }
        if (this.hasLeftChild(index)) {
            this.orderedArrHelper(this.getLeftChildIndex(index), outArray);
        }
    }
    getOrderedArray() {
        let arr = [];
        let clone = this.copy();
        while (clone.heap.length) {
            arr.push(clone.remove());
        }
        return arr;
    }
    // Helper Methods
    getLeftChildIndex(parentIndex) {
        return 2 * parentIndex + 1;
    }
    size() {
        return this.heap.length;
    }
    getRightChildIndex(parentIndex) {
        return 2 * parentIndex + 2;
    }
    getParentIndex(childIndex) {
        return Math.floor((childIndex - 1) / 2);
    }
    hasLeftChild(index) {
        return this.getLeftChildIndex(index) < this.heap.length;
    }
    hasRightChild(index) {
        return this.getRightChildIndex(index) < this.heap.length;
    }
    hasParent(index) {
        return this.getParentIndex(index) >= 0;
    }
    leftChild(index) {
        return this.heap[this.getLeftChildIndex(index)];
    }
    rightChild(index) {
        return this.heap[this.getRightChildIndex(index)];
    }
    parent(index) {
        return this.heap[this.getParentIndex(index)];
    }
    // Functions to create Min Heap
    swap(indexOne, indexTwo) {
        const temp = this.heap[indexOne];
        this.heap[indexOne] = this.heap[indexTwo];
        this.heap[indexTwo] = temp;
    }
    peek() {
        if (this.heap.length === 0) {
            return null;
        }
        return this.heap[0];
    }
    // Removing an element will remove the
    // top element with highest priority then
    // heapifyDown will be called 
    remove() {
        if (this.heap.length === 0) {
            return null;
        }
        const item = this.heap[0];
        this.heap[0] = this.heap[this.heap.length - 1];
        this.heap.pop();
        this.heapifyDown();
        return item;
    }
    add(item) {
        this.heap.push(item);
        this.heapifyUp();
    }
    heapifyUp() {
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.getval(this.parent(index)) > this.getval(this.heap[index])) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }
    heapifyDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.getval(this.rightChild(index)) < this.getval(this.leftChild(index))) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.getval(this.heap[index]) < this.getval(this.heap[smallerChildIndex])) {
                break;
            }
            else {
                this.swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }
}
class Heuristic {
    constructor(maxplayers, weights = {}) {
        /* Heuristic evaluation of a player state
        Scores:
            power imbalance > blacklist:
                Power should always be favoured over blacklists, otherwise people with a
                lot of blacklists can be seated into a table with heavily mismatched power levels.
            blacklist < powerdiff * 3:
                Two players that have one or two unfavoured power levels between then
                may be seatable together. This might be the case if one player only likes
                to play CEDH and one plays only high power, even though they might have a
                comparable power level.
            blacklist > powerdiff * 3:
                Two blacklisted players are discouraged to be podded, regardless of a power difference
                they will be moved to a pod with differing powerlevel
        */
        // These are fallback values only - actual values come from the weights object
        this.POWERIMBALANCE = 10; // Cost for power imbalance that exist if theres a lower power in the pod.
        // This score is additive for each player that's lower level.
        // i.e., 3 players of low level with 1 higher level will add 3x score.
        this.POWERDIFF = 0.1; // Cost for each power that's missing out of another players list
        this.BLACKLIST = 50; // Cost for Blacklisted players are at same table
        this.EMPTYSEAT = 30; // Cost for each empty seat on a table
        this.UNSEATED = 1; // Encouragement cost -- try get the AI to check results that are closer to the goal 
        this.maxPlayers = maxplayers;
        this.hashmap = {};
        // Merge default weights with custom weights
        const currentDefaultWeights = getHeuristicWeights();
        this.weights = Object.assign(Object.assign({}, currentDefaultWeights), weights);
        // Update local fallback values too
        this.POWERIMBALANCE = this.weights.powerImbalance;
        this.POWERDIFF = this.weights.powerDiff;
        this.BLACKLIST = this.weights.blacklist;
        this.EMPTYSEAT = this.weights.emptySeat;
        this.UNSEATED = this.weights.unseated;
    }
    evalPlayer(playersSet) {
        if (playersSet.size == 0) {
            return null;
        }
        // Convert to array for easier processing
        const playerIds = Array.from(playersSet);
        // Score each player based on how constrained they are
        const playerScores = playerIds.map(playerId => {
            const player = PLAYERS[playerId];
            let score = 0;
            // Players with whitelist or blacklist constraints should be placed first
            // as they have fewer valid placements
            if (player.hasWhitelist()) {
                score += 30;
            }
            if (player.hasBlacklist()) {
                score += 20;
            }
            // Players with fewer power levels are more constrained
            score += (10 - player.power.size * 2);
            // Add some randomness for variety when constraints are equal
            score += Math.random() * 2;
            return { playerId, score };
        });
        // Sort by score (higher is more constrained)
        playerScores.sort((a, b) => b.score - a.score);
        // Return the most constrained player
        return PLAYERS[playerScores[0].playerId];
    }
    evalState(state) {
        let score = 0;
        let hashValue = state.hash();
        // Check if we've already computed this state's score
        if (this.hashmap[hashValue] !== undefined) {
            return this.hashmap[hashValue];
        }
        // Add score for each ungrouped player
        score += state.playersLeft.size * this.weights.unseated;
        let emptySeatCount = 0;
        let powerImbalanceCount = 0;
        let powerDiffCount = 0;
        let blacklistCount = 0;
        let historyPenalty = 0;
        let powerDiversityPenalty = 0;
        // For each table
        for (let i = 0; i < state.tables.length; i++) {
            let table = state.tables[i];
            // Count empty seats
            let emptySeats = MAXSEATS - table.seats.size();
            emptySeatCount += emptySeats;
            // Check for power imbalance and blacklists
            let playerIds = Array.from(table.seats.heap);
            // Calculate play history penalty
            for (let j = 0; j < playerIds.length; j++) {
                for (let k = j + 1; k < playerIds.length; k++) {
                    const playerId1 = playerIds[j];
                    const playerId2 = playerIds[k];
                    // Add penalty based on how many times these players have played together
                    if (playerPlayHistory[playerId1] && playerPlayHistory[playerId1][playerId2]) {
                        historyPenalty += playerPlayHistory[playerId1][playerId2];
                    }
                }
            }
            // Skip power diversity calculation for empty tables
            if (playerIds.length === 0) {
                continue;
            }
            // NEW: Calculate power diversity penalty for this table
            // Track both unique powers and highest power for each player
            const powerLevelsAtTable = new Set();
            const playerPowers = new Map(); // playerId -> highest power
            playerIds.forEach(playerId => {
                const player = PLAYERS[playerId];
                if (player) {
                    // Find the player's highest power level
                    let highestPower = 0;
                    player.power.forEach(power => {
                        if (power > highestPower) {
                            highestPower = power;
                        }
                        powerLevelsAtTable.add(power);
                    });
                    playerPowers.set(playerId, highestPower);
                }
            });
            // Calculate power diversity in two ways:
            // 1. Penalize multiple power levels at the same table
            if (powerLevelsAtTable.size > 1) {
                // The more different power levels, the higher the penalty
                powerDiversityPenalty += (powerLevelsAtTable.size - 1) * this.weights.powerDiversity;
            }
            // 2. Check for variance in the highest power of each player at the table
            if (playerIds.length > 1) {
                const powerValues = Array.from(playerPowers.values());
                const maxPower = Math.max(...powerValues);
                const minPower = Math.min(...powerValues);
                // If there's a difference between the highest power levels of players
                if (maxPower !== minPower) {
                    // Penalize based on how different the powers are
                    powerDiversityPenalty += (maxPower - minPower) * this.weights.powerDiversity;
                }
            }
            // Check each player at the table
            for (let j = 0; j < playerIds.length; j++) {
                let playerId = playerIds[j];
                let player = PLAYERS[playerId];
                // Check for blacklisted players at the same table
                if (table.containsBlackList(player)) {
                    blacklistCount++;
                }
                // For each other player at the table
                for (let k = 0; k < playerIds.length; k++) {
                    if (j == k)
                        continue;
                    let otherPlayerId = playerIds[k];
                    let otherPlayer = PLAYERS[otherPlayerId];
                    // Check for power level mismatches
                    if (player.lowestPower < otherPlayer.lowestPower) {
                        powerImbalanceCount++;
                    }
                    // Count powers that don't overlap
                    let nonOverlappingPowers = 0;
                    otherPlayer.power.forEach(power => {
                        if (!player.power.has(power)) {
                            nonOverlappingPowers++;
                        }
                    });
                    powerDiffCount += nonOverlappingPowers;
                }
            }
        }
        // Calculate final score using weights
        score += emptySeatCount * this.weights.emptySeat;
        score += powerImbalanceCount * this.weights.powerImbalance;
        score += powerDiffCount * this.weights.powerDiff;
        score += blacklistCount * this.weights.blacklist;
        score += historyPenalty * this.weights.playHistory;
        score += powerDiversityPenalty; // Add the power diversity penalty
        // Cache score for this state
        this.hashmap[hashValue] = score;
        return score;
    }
}
class Environment {
    constructor(players) {
        this.playersList = players;
        // Calculate a reasonable number of tables based on player count
        const playerCount = players.length;
        // Ensure we have at least 1 table and at most playerCount / 2 tables
        const minTables = 1;
        const idealTablesCount = Math.ceil(playerCount / MAXSEATS);
        const maxTables = Math.max(minTables, Math.ceil(playerCount / 2));
        // Set maxTables to a reasonable value
        this.maxTables = Math.min(idealTablesCount, maxTables);
        // Ensure we have at least 1 table even with no players
        if (this.maxTables < 1) {
            this.maxTables = 1;
        }
        console.log(`Creating environment with ${playerCount} players and ${this.maxTables} tables`);
        this.constructTables();
    }
    constructTables() {
        this.tables = [];
        for (let i = 0; i < this.maxTables; i++) {
            this.tables.push(new Table(i));
        }
    }
    isGoalState(state) {
        // Much more lenient goal state detection to ensure solutions are found
        // A valid goal state can have more unsorted players, especially for larger player groups
        const totalPlayers = this.playersList.length;
        // For large groups, allow up to 25% of players to be unsorted
        // For smaller groups, allow at least 4 players to be unsorted
        const maxUnsortedAllowed = Math.max(4, Math.ceil(totalPlayers * 0.25));
        // Accept as a goal if we have seated most players
        return state.playersLeft.size <= maxUnsortedAllowed;
    }
    legalActions(state, player) {
        // legal seats for player instead of (for each player, for each table) decreases the scope by a considerable margin
        var availableTables = [];
        for (let table of state.tables) {
            if (table.canSeat(player.id)) {
                availableTables.push(table);
            }
        }
        return availableTables;
    }
    getInitialState() {
        let playersIdSet = new Set();
        for (let player of this.playersList) {
            playersIdSet.add(player.id);
        }
        return new State(this.tables, playersIdSet);
    }
}
class State {
    // a possible assignment of variables of course
    constructor(tables, playersLeft) {
        this.tables = [];
        this.playersLeft = new Set(playersLeft);
        this.hashValue = 0;
        for (let i = 0; i < tables.length; i++) {
            this.tables.push(tables[i].copy());
        }
    }
    copy() {
        return new State(this.tables, this.playersLeft);
    }
    totalSeatedPlayers() {
        return this.tables.reduce((prev, curr) => { return prev + curr.seatedPlayers(); }, 0);
    }
    nextState(playerId, toTable) {
        let stateCpy = this.copy();
        stateCpy.tables[toTable].seatPlayer(playerId);
        stateCpy.playersLeft.delete(playerId);
        return stateCpy;
    }
    /*
        Returns a hash of this state.
        State hashes do not care for the table order, a state with two tables of the order
        [(p1, p2, p3), (p4, p5, p6)]
        should contain the same hash as another state with the same players:
        [(p4, p5, p6), (p1, p2, p3)]

        NOTE: the sum of player ids on each table are currently being used to sort players
            this may give a random ordering of tables since a permutation of seated players exist
            that give an equal sum of a different ordering. Thus this method is not perfect unless
            a more unique ordering of playerXtables is given.
        TODO: fix note above
    */
    hash() {
        if (this.hashValue !== 0) {
            return this.hashValue;
        }
        // do I need this?.. yes
        // basically change the whole id list of seats to strings and hash the strings
        var tablestrings = [];
        for (let table of this.tables) {
            if (table.seats.heap.length > 0) {
                // sets shouldnt change order, so ordering doesnt matter 
                let substr = "(";
                for (let seat of table.seats.getOrderedArray()) {
                    substr += seat + ",";
                }
                tablestrings.push(substr += ")");
            }
        }
        let sortedNames = tablestrings.sort().reduce((prev, curr) => { return prev + "-" + curr; }, "");
        this.hashValue = hashString(sortedNames);
        return this.hashValue;
    }
    getSeats() {
        var allSeatsArray = [], tableSeats;
        for (let table of this.tables) {
            tableSeats = [];
            for (let seat of table.seats.getOrderedArray()) {
                tableSeats.push(seat);
            }
            allSeatsArray.push(tableSeats);
        }
        return allSeatsArray;
    }
}
class Agent {
    constructor(heuristic, environment, maxSolutions) {
        this.heuristic = heuristic;
        this.env = environment;
        this.solutions = [];
        this.maxSolutions = maxSolutions;
        this.timeoutAt = Date.now() + TIMEOUT;
        this.unsortedPlayers = new Set();
        this.env.playersList.map((player) => { this.unsortedPlayers.add(player.id); });
        this.nodesGenerated = this.goalsFound = this.nodesSkipped = this.nodesExpanded = 0;
    }
    addSolution(state) {
        // TODO: maybe add a callback here, usable in frontend?
        if (this.solutions.length >= this.maxSolutions) {
            return;
        }
        // Add as a Solution type
        this.solutions.push(state);
    }
    search() {
        throw Error("Base Agent does not implement a search() method");
    }
    initializeFrontier(initialState) {
        this.frontier = new MinHeap((a) => { return this.heuristic.evalState(a); });
        this.frontier.add(initialState);
    }
    start() {
        let initialState = this.env.getInitialState();
        this.initializeFrontier(initialState);
        this.search();
        return this.solutions;
    }
    checkTimeout() {
        if (Date.now() > this.timeoutAt) {
            return true;
        }
        return false;
    }
}
class RandomAgent extends Agent {
    search() {
        var playersLeft = new Set(this.unsortedPlayers);
        var theState = this.frontier.remove();
        // If there are no players or no initial state, try to create a fallback
        if (playersLeft.size === 0 || theState === null) {
            console.log("RandomAgent: No players or invalid initial state, generating fallback");
            const allPlayers = Object.values(PLAYERS);
            if (allPlayers.length > 0) {
                const fallbackSolution = generateFallbackSolution(allPlayers, this.env.maxTables);
                this.solutions = [fallbackSolution];
                this.goalsFound = 1;
                return this.solutions;
            }
            return [];
        }
        while (playersLeft.size > 0) {
            var player = this.heuristic.evalPlayer(playersLeft);
            if (theState != null && player != null) {
                let actions = this.env.legalActions(theState, player);
                // If no legal actions, break out of the loop
                if (actions.length === 0) {
                    console.log(`RandomAgent: No legal actions for player ${player.name}, breaking`);
                    break;
                }
                let action = actions[Math.floor(Math.random() * actions.length)];
                theState = theState.nextState(player.id, action.id);
                playersLeft.delete(player.id);
            }
            else {
                // If player or state is null, break out of the loop
                break;
            }
        }
        if (theState != null) {
            this.addSolution(theState);
        }
        // If no solutions were found, generate a fallback
        if (this.solutions.length === 0) {
            console.log("RandomAgent: No solutions found, generating fallback");
            const allPlayers = Object.values(PLAYERS);
            if (allPlayers.length > 0) {
                const fallbackSolution = generateFallbackSolution(allPlayers, this.env.maxTables);
                this.solutions = [fallbackSolution];
                this.goalsFound = 1;
            }
        }
        return this.solutions;
    }
}
class AStarAgent extends Agent {
    search() {
        // Add early termination for optimal solutions
        let bestScore = Infinity;
        let timeoutChecks = 0;
        let progressUpdateInterval = 250; // Update progress more frequently
        // Reset search progress tracking
        searchProgress.nodesExpanded = 0;
        searchProgress.nodesGenerated = 0;
        searchProgress.nodesSkipped = 0;
        searchProgress.goalsFound = 0;
        searchProgress.bestScore = Infinity;
        searchProgress.progressPercent = 0;
        // Estimate total work - this is a rough approximation
        const totalPlayers = this.unsortedPlayers.size;
        // More realistic estimate of total nodes 
        const estimatedTotalNodes = Math.pow(totalPlayers, 1.5) * this.env.maxTables;
        // Early abort for trivial cases
        if (totalPlayers === 0) {
            console.log("No players to search for.");
            return [];
        }
        // Set a maximum node expansion limit based on problem size
        const maxNodesToExpand = Math.min(1000000, // Hard upper limit
        totalPlayers <= 8 ? 50000 :
            totalPlayers <= 12 ? 150000 :
                totalPlayers <= 16 ? 300000 :
                    500000);
        console.log(`Using max expansion limit of ${maxNodesToExpand} nodes`);
        while (true) {
            // Check for timeout and update progress more frequently
            if (timeoutChecks % progressUpdateInterval === 0) {
                if (this.checkTimeout()) {
                    console.log("Search timed out.");
                    break;
                }
                // Update progress for UI feedback
                const progress = Math.min(100, Math.round((this.nodesExpanded / estimatedTotalNodes) * 100));
                searchProgress.progressPercent = progress;
                searchProgress.nodesExpanded = this.nodesExpanded;
                searchProgress.nodesGenerated = this.nodesGenerated;
                searchProgress.nodesSkipped = this.nodesSkipped;
                searchProgress.goalsFound = this.goalsFound;
                searchProgress.bestScore = bestScore;
                // Dispatch event for UI updates
                const progressEvent = new CustomEvent('searchProgressUpdate', {
                    detail: { progress: searchProgress }
                });
                document.dispatchEvent(progressEvent);
                // Check for node expansion limit
                if (this.nodesExpanded >= maxNodesToExpand) {
                    console.log(`Reached maximum node expansion limit of ${maxNodesToExpand}.`);
                    break;
                }
            }
            timeoutChecks++;
            let topState = this.frontier.remove();
            if (topState === null) {
                console.log("Frontier emptied, search failed.");
                break;
            }
            this.nodesExpanded++;
            // Check if we've reached a goal state
            if (this.env.isGoalState(topState)) {
                // Calculate the score for this goal state
                const scoreValue = this.heuristic.evalState(topState);
                // Only accept the goal state if it has a reasonable score
                if (scoreValue < 5000) { // A high but not infinite threshold
                    this.goalsFound++;
                    this.addSolution(topState);
                    // Track the best score
                    if (scoreValue < bestScore) {
                        bestScore = scoreValue;
                        searchProgress.bestScore = bestScore;
                    }
                    // Early termination if we have enough solutions or a perfect solution
                    // More aggressive termination criteria for small problems
                    if ((totalPlayers <= 8 && this.solutions.length >= 3) ||
                        (this.solutions.length >= this.maxSolutions) ||
                        bestScore < 10) { // Very good solution threshold
                        break;
                    }
                }
                else {
                    console.log(`Skipping goal state with very high score: ${scoreValue}`);
                }
                // Continue searching for better solutions
                continue;
            }
            // IMPROVED PRUNING: More nuanced pruning based on current state evaluation and remaining players
            const currentScore = this.heuristic.evalState(topState);
            // If we already have solutions and this path is much worse, skip it
            // More nuanced pruning - consider problem size and current best score
            const basePruneFactor = totalPlayers <= 8 ? 1.3 : 1.5; // Looser pruning for larger problems
            const solutionCountBonus = Math.min(0.5, this.solutions.length * 0.1); // Each solution makes us slightly more selective
            const remainingPlayersRatio = topState.playersLeft.size / totalPlayers;
            // Calculate pruning factor - be stricter when we have more solutions or fewer players remaining
            // For larger problems, we need to be more lenient
            const pruneFactor = basePruneFactor + (remainingPlayersRatio * 0.8) - solutionCountBonus;
            // If we have any solutions, start pruning - but more carefully for larger problems
            if (this.solutions.length > 0 && currentScore > bestScore * pruneFactor) {
                this.nodesSkipped++;
                continue;
            }
            // Even if we don't have solutions yet, prune extremely poor states
            // This helps focus the search when the state space is very large
            // Be more lenient for larger problems
            const extremePoorThreshold = totalPlayers <= 8 ? 200 :
                totalPlayers <= 12 ? 400 : 800;
            if (currentScore > extremePoorThreshold && topState.playersLeft.size < totalPlayers / 2) {
                this.nodesSkipped++;
                continue;
            }
            // Get a player to seat
            let player = this.heuristic.evalPlayer(topState.playersLeft);
            if (player === null)
                continue;
            // Get valid actions for this player
            let legalActions = this.env.legalActions(topState, player);
            // IMPROVED ACTION ORDERING: Sort actions by how promising they appear before generating states
            // For each legal action, precompute a rough estimate of its quality
            const rankedActions = legalActions.map(table => {
                // Create a more nuanced score based on multiple factors
                let actionScore = 0;
                // TABLE FULLNESS: Prefer to fill tables that already have players
                if (table.seatedPlayers() > 0) {
                    // Prefer tables that are closer to being filled (but not completely full)
                    const emptySeats = MAXSEATS - table.seatedPlayers();
                    if (emptySeats === 1) {
                        actionScore -= 15; // Strong preference for completing a table
                    }
                    else if (emptySeats === 2) {
                        actionScore -= 8; // Good preference for nearly full tables
                    }
                    else {
                        actionScore -= 3; // Slight preference for tables with some players
                    }
                }
                // WHITELIST: Strongly prefer tables with whitelisted players
                if (table.containsWhitelist(player)) {
                    actionScore -= 20; // Much stronger preference for whitelists
                }
                // BLACKLIST: Strongly avoid tables with blacklisted players
                if (table.containsBlackList(player)) {
                    actionScore += 40; // Much stronger avoidance of blacklists
                }
                // POWER LEVEL COMPATIBILITY: Check compatibility with existing players
                // This is the most important factor for proper matching
                const tablePlayers = Array.from(table.seats.heap).map(id => PLAYERS[id]);
                let powerMismatch = 0;
                let powerMatch = 0;
                tablePlayers.forEach(tablePlayer => {
                    // More nuanced power level compatibility calculation
                    // Count powers that match and don't match
                    let exactMatchCount = 0;
                    let notMatchingCount = 0;
                    tablePlayer.power.forEach(power => {
                        if (player.power.has(power)) {
                            exactMatchCount++;
                        }
                        else {
                            notMatchingCount++;
                        }
                    });
                    powerMatch += exactMatchCount;
                    powerMismatch += notMatchingCount;
                    // Check also for power level difference
                    const playerHighestPower = Math.max(...Array.from(player.power));
                    const tablePlayerHighestPower = Math.max(...Array.from(tablePlayer.power));
                    // Strongly penalize different power levels
                    if (playerHighestPower !== tablePlayerHighestPower) {
                        powerMismatch += Math.abs(playerHighestPower - tablePlayerHighestPower) * 3;
                    }
                });
                // MUCH stronger emphasis on power matching
                actionScore -= powerMatch * 5; // Much stronger reward for matches
                actionScore += powerMismatch * 4; // Much stronger penalty for mismatches
                // PLAY HISTORY: Try to seat players who haven't played together much
                let historyScore = 0;
                tablePlayers.forEach(tablePlayer => {
                    const playCount = getPlayCount(player.id, tablePlayer.id);
                    historyScore += playCount * 2; // Penalize frequently paired players
                });
                actionScore += historyScore;
                return { table, score: actionScore };
            });
            // Sort actions by score (lower is better)
            rankedActions.sort((a, b) => a.score - b.score);
            // Be more exploratory for larger problems
            // Limit branching factor based on the number of players and actions
            const maxActionsToExplore = Math.min(legalActions.length, totalPlayers <= 8 ? legalActions.length : // For small groups, try all
                totalPlayers <= 12 ? Math.max(5, Math.ceil(legalActions.length * 0.6)) : // For medium groups, be selective but not too much
                    Math.max(3, Math.ceil(legalActions.length * 0.4)) // For large groups, be very selective
            );
            // Only generate successor states for the most promising actions
            for (let i = 0; i < maxActionsToExplore; i++) {
                if (i >= rankedActions.length)
                    break;
                const action = rankedActions[i];
                let nextState = topState.nextState(player.id, action.table.id);
                this.nodesGenerated++;
                this.frontier.add(nextState);
            }
        }
        // Final progress update
        searchProgress.nodesExpanded = this.nodesExpanded;
        searchProgress.nodesGenerated = this.nodesGenerated;
        searchProgress.nodesSkipped = this.nodesSkipped;
        searchProgress.goalsFound = this.goalsFound;
        searchProgress.bestScore = bestScore;
        searchProgress.progressPercent = 100;
        // If no solutions were found, create a fallback solution
        if (this.solutions.length === 0) {
            console.log("No solutions found by A* search, generating fallback solution");
            // Generate a fallback solution
            const allPlayers = Object.values(PLAYERS);
            const fallbackSolution = generateFallbackSolution(allPlayers, this.env.maxTables);
            // Add it to solutions - using type assertion to tell TypeScript this is ok
            const fallbackSolutions = [fallbackSolution];
            this.solutions = fallbackSolutions;
            this.goalsFound = 1;
            searchProgress.goalsFound = 1;
        }
        console.log("A* search completed.");
        console.log(`Nodes expanded: ${this.nodesExpanded}`);
        console.log(`Nodes generated: ${this.nodesGenerated}`);
        console.log(`Nodes skipped: ${this.nodesSkipped}`);
        console.log(`Goals found: ${this.goalsFound}`);
        console.log(`Best score: ${bestScore}`);
        // Dispatch final event
        const finalEvent = new CustomEvent('searchComplete', {
            detail: { progress: searchProgress }
        });
        document.dispatchEvent(finalEvent);
        return this.solutions;
    }
}
class Table {
    constructor(id) {
        this.id = id;
        this.seats = new MinHeap((a) => { return a; });
    }
    copy() {
        let newTbl = new Table(this.id);
        newTbl.seats = this.seats.copy();
        return newTbl;
    }
    seatPlayer(playerId) {
        if (PLAYERS[playerId]) {
            for (let listPlayerId of PLAYERS[playerId].getPlayPod()) {
                this.seats.add(listPlayerId);
            }
        }
    }
    /*
        Returns True if table is completely empty, or there is spot for a player (and his whitelist)
    */
    canSeat(playerId) {
        return (this.seats.size()) == 0 || (this.seats.size() + PLAYERS[playerId].seatSize()) <= MAXSEATS;
    }
    containsList(player, listAttr) {
        for (let listedPlayer of player[listAttr]) {
            let playerId = listedPlayer;
            for (let player of this.seats.getOrderedArray()) {
                let playerId2 = Number(player);
                if (playerId == playerId2) {
                    return true;
                }
            }
        }
        return false;
    }
    containsBlackList(player) {
        return this.containsList(player, "blacklist");
    }
    containsWhitelist(player) {
        return this.containsList(player, "whitelist");
    }
    seatedPlayers() {
        return this.seats.size();
    }
}
/* The node for a player */
class Player {
    constructor(id, name, power) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = new Set();
        this.blacklist = new Set();
        this.hashValue = hashString(this.name);
        this.lowestPower = (Array.from(this.power).reduce((prev, curr) => { return prev < curr ? prev : curr; }, Infinity));
        this.whitelistChain = [];
    }
    /* Sets the whitelist variable as the set or iterable */
    setWhitelist(whitelist) {
        this.whitelist = whitelist;
    }
    /* Sets the blacklist variable as the set or iterable */
    setBlacklist(blacklist) {
        this.blacklist = blacklist;
    }
    /*
        Returns the total number of player this player occupies
        (and his whitelist chain)
    */
    seatSize() {
        if (this.hasWhitelist()) {
            return this.getPlayPod().length + 1;
        }
        return 1;
    }
    /*
        Recursively call #chainRecursive() of all players that have not been added
        to the current chain, sets the #whitelistChain for future calls
    */
    chainRecursive(chain, added) {
        for (let playerId of this.whitelist) {
            if (added.has(playerId)) {
                continue;
            }
            else {
                // Check if the player exists in PLAYERS before accessing it
                if (!PLAYERS[playerId]) {
                    console.warn(`Player ID ${playerId} not found in PLAYERS dictionary. Skipping in whitelist chain.`);
                    continue;
                }
                // player wasn't added before, add him and call his recursive continuation
                chain.push(playerId);
                added.add(playerId);
                PLAYERS[playerId].chainRecursive(chain, added);
            }
        }
        // after resolving the whole depth of the chain, all Players of the chain
        // will be assigned the same variable so future calls of getPlayPod() yield the same results
        this.whitelistChain = chain;
    }
    /*
        Returns all players that this player has whitelist
        (and iteratively all whitelists they have to themselves)
        The return array is inclusive of the player it was called from.
    */
    getPlayPod() {
        try {
            // If we already computed the chain, return it
            if (this.whitelistChain.length > 0) {
                return this.whitelistChain;
            }
            // If the player has no whitelist, return just this player's ID
            if (!this.hasWhitelist()) {
                this.whitelistChain = [this.id];
                return this.whitelistChain;
            }
            // If the player has a whitelist, compute the chain
            var added = new Set([this.id]);
            var whitelistchain = [this.id];
            this.chainRecursive(whitelistchain, added);
            // Ensure the whitelistChain is never empty
            if (this.whitelistChain.length === 0) {
                this.whitelistChain = [this.id];
            }
            return this.whitelistChain;
        }
        catch (error) {
            console.error(`Error in getPlayPod for player ${this.name} (ID: ${this.id}):`, error);
            // Return just this player's ID as a fallback
            return [this.id];
        }
    }
    hasWhitelist() {
        return this.whitelist.size > 0;
    }
    hasBlacklist() {
        return this.blacklist.size > 0;
    }
    hash() {
        return this.hashValue;
    }
}
function getList(listtype, playerEl) {
    var nodeList = playerEl.querySelector("." + listtype);
    var returnArr = [];
    if (nodeList) {
        for (let i = 0; i < nodeList.children.length; i++) {
            let playerListId = nodeList.children[i].classList[0];
            if (playerListId !== null) {
                returnArr.push(Number(String(playerListId).split("-")[2]));
            }
        }
    }
    return returnArr;
}
/* Returns a list of all added players, instantiated in a list of Player classes */
function collectPlayers() {
    // Clear previous player data
    PLAYERS = {};
    // Collect all players from the UI
    const playersContainer = document.getElementById('players-container');
    if (!playersContainer) {
        console.error("Could not find players container");
        return [];
    }
    console.log(`Found players container with ${playersContainer.children.length} children`);
    // First pass: Create all players and add them to the PLAYERS object
    const playersArr = [];
    let pcount = 0;
    // Create players for everything in the container
    for (let i = 0; i < playersContainer.children.length; i++) {
        const playerEl = playersContainer.children[i];
        if (!playerEl.classList.contains('player-container-instance'))
            continue;
        // Get player name
        const playerNameEl = playerEl.querySelector('.player-name');
        const playerName = playerNameEl ? playerNameEl.textContent || `Player ${pcount}` : `Player ${pcount}`;
        // Get player power level(s)
        const playerPowerContainer = playerEl.querySelector('.player-power-container');
        const powerPills = playerPowerContainer ? playerPowerContainer.querySelectorAll('.powerpill') : [];
        const playerPowers = new Set();
        // Must explicitly use Array.from to convert the NodeList to an array
        Array.from(powerPills).forEach((pill) => {
            const powerAttr = pill.getAttribute('value');
            if (powerAttr) {
                // Parse the power level, handle any potential parsing errors
                try {
                    const powerLevel = parseInt(powerAttr, 10);
                    if (!isNaN(powerLevel) && powerLevel >= 1 && powerLevel <= 4) {
                        playerPowers.add(powerLevel);
                    }
                }
                catch (e) {
                    console.warn(`Invalid power level: ${powerAttr} for player ${playerName}`);
                }
            }
        });
        // Ensure each player has at least one power level
        if (playerPowers.size === 0) {
            console.warn(`Player ${playerName} has no power levels, assigning default power level 2 (Mid)`);
            playerPowers.add(Powerlevel.MEDIUM); // Default to medium power level
        }
        // Create player with the resolved power levels
        const newPlayer = new Player(pcount, playerName, playerPowers);
        console.log(`Created player: ${playerName} (ID: ${pcount}) with power levels: ${Array.from(playerPowers).join(', ')}`);
        // Store in global registry and temporary array
        PLAYERS[pcount] = newPlayer;
        playersArr.push(newPlayer);
        pcount++;
    }
    console.log(`Created ${pcount} players in first pass`);
    // Second pass: Process blacklist and whitelist for each player
    for (let i = 0; i < playersContainer.children.length; i++) {
        const playerEl = playersContainer.children[i];
        if (!playerEl.classList.contains('player-container-instance'))
            continue;
        // Get player ID for this container
        const playerId = getPlayerIdFromElement(playerEl);
        if (playerId === null)
            continue;
        // Get the player object
        const player = PLAYERS[playerId];
        if (!player)
            continue;
        // Process blacklist
        const blacklist = getList('blacklist', playerEl);
        if (blacklist.length > 0) {
            const blacklistSet = new Set(blacklist.filter(id => id in PLAYERS));
            player.setBlacklist(blacklistSet);
            // Ensure bidirectional blacklists
            blacklistSet.forEach(targetId => {
                const targetPlayer = PLAYERS[targetId];
                if (targetPlayer) {
                    targetPlayer.blacklist.add(playerId);
                }
            });
        }
        // Process whitelist
        const whitelist = getList('whitelist', playerEl);
        if (whitelist.length > 0) {
            const whitelistSet = new Set(whitelist.filter(id => id in PLAYERS));
            player.setWhitelist(whitelistSet);
            // Ensure bidirectional whitelists
            whitelistSet.forEach(targetId => {
                const targetPlayer = PLAYERS[targetId];
                if (targetPlayer) {
                    targetPlayer.whitelist.add(playerId);
                }
            });
        }
    }
    // Check if there are enough players to make tables
    if (playersArr.length > 0) {
        // Compute whitelist chains
        console.log("Resolving whitelist chains");
        playersArr.forEach(player => {
            if (player.hasWhitelist()) {
                // Initialize chain with just this player's ID
                const chain = [];
                const added = new Set();
                player.chainRecursive(chain, added);
                player.whitelistChain = chain;
            }
        });
    }
    console.log(`Final player count: ${playersArr.length}`);
    return playersArr;
}
// HELPER FUNCTIONS
// Update playernameSort to work with Player objects
function playernameSort(a, b) {
    if (a.name < b.name) {
        return -1;
    }
    else if (a.name > b.name) {
        return 1;
    }
    return 0;
}
// OC (https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
// donut steel
function hashString(str) {
    var hash = 0, i, chr;
    if (str.length === 0)
        return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
/*
    Adds a value to a dict's value set, if key does not exist, create a new set
    Returns 1 if a new set was created within the record
*/
function addValToDictSet(dictObj, key, value) {
    var added = 0;
    if (!(key in dictObj)) {
        dictObj[key] = new Set();
        added++;
    }
    dictObj[key].add(value);
    return added;
}
// MAIN FUNCTION - comment out or remove this old implementation
/*
function doSearch(agentType:string) {
    let players = collectPlayers();
    let env = new Environment(players);
    let agent:Agent;
    if (agentType == "astar") {
        agent = new AStarAgent(new Heuristic(players.length), env, MAXSOLUTIONS);
    } else if (agentType == "random") {
        agent = new RandomAgent(new Heuristic(players.length), env, MAXSOLUTIONS);
    } else {
        throw Error("No agent type selected");
    }
    try {
        agent.start();
    } catch (e) {
        let logger = console.error;
        let msg = e;
        if (e.message == "Agent timed out during search") {
            logger = console.log;
            msg = e.message;
        }
        logger(msg);
    }
    // add solutions
    for (let i = agent.solutions.length - 1; i >= 0; i--) {
        // reverse iteration shows best first
        let state = agent.solutions[i];
        newSolution(state.getSeats(), agent.heuristic.evalState(state));
    }
    console.log(agent.solutions.length + " solutions found");
    console.log(
        "Nodes generated: ", agent.nodesGenerated,
        " Nodes expanded: ", agent.nodesExpanded,
        " Nodes skipped", agent.nodesSkipped,
        " Total goal nodes: ", agent.goalsFound
    );
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}
*/
// Initialize play history when the page loads
window.addEventListener('load', initPlayHistory);
// Functions to get and set heuristic weights
function getHeuristicWeights() {
    return Object.assign({}, DEFAULT_WEIGHTS);
}
function setHeuristicWeights(weights) {
    Object.assign(DEFAULT_WEIGHTS, weights);
}
// Updated doSearch function to use new configurable weights
function doSearch(agentType) {
    try {
        console.log(`Starting ${agentType} search...`);
        // Collect all players
        let players = collectPlayers();
        if (players.length === 0) {
            console.warn("No players found to arrange");
            showFeedbackToast("No players found to arrange into pods", true);
            return 0;
        }
        let env = new Environment(players);
        let heuristic = new Heuristic(players.length);
        let agent;
        if (agentType === "random") {
            // For random agent, use special weights that prioritize blacklist avoidance
            const randomWeights = Object.assign(Object.assign({}, DEFAULT_WEIGHTS), { blacklist: 100, emptySeat: 10 // Lower penalty for empty seats
             });
            heuristic = new Heuristic(players.length, randomWeights);
            agent = new RandomAgent(heuristic, env, MAXSOLUTIONS);
        }
        else {
            // For A* search, use the current configured weights
            agent = new AStarAgent(heuristic, env, MAXSOLUTIONS);
        }
        console.log(`Using ${agentType} agent to arrange ${players.length} players into up to ${env.maxTables} tables`);
        // Run the search
        let solutionsArr = agent.start();
        console.log(`Found ${solutionsArr.length} solutions`);
        // Handle solutions - all agents now guarantee at least one solution
        // either optimal or fallback
        for (let i = 0; i < solutionsArr.length; i++) {
            console.log(`Processing solution ${i + 1}/${solutionsArr.length}`);
            let seats;
            let score;
            // Check if it's a State solution
            if ('getSeats' in solutionsArr[i]) {
                const stateSolution = solutionsArr[i];
                seats = stateSolution.getSeats();
                score = heuristic.evalState(stateSolution);
            }
            // Check if it's a FallbackSolution
            else if ('seatings' in solutionsArr[i]) {
                const fallbackSolution = solutionsArr[i];
                seats = fallbackSolution.seatings;
                score = fallbackSolution.score;
            }
            else {
                console.error("Invalid solution format:", solutionsArr[i]);
                continue;
            }
            console.log(`Solution ${i + 1} has ${seats.length} tables with score ${score}`);
            newSolution(seats, score);
        }
        // Record play history for the first (best) solution if available
        if (solutionsArr.length > 0) {
            let firstSolution = null;
            const solution = solutionsArr[0];
            try {
                // Check if it's a State solution
                if (solution && typeof solution === 'object' && 'getSeats' in solution) {
                    firstSolution = solution.getSeats();
                }
                // Check if it's a FallbackSolution
                else if (solution && typeof solution === 'object' && 'seatings' in solution) {
                    firstSolution = solution.seatings;
                }
                if (firstSolution && Array.isArray(firstSolution)) {
                    console.log("Recording play history for best solution");
                    recordPlayedTogether(firstSolution);
                    // Also update visual indicators if function exists
                    if (typeof updatePlayHistoryIndicators === 'function') {
                        setTimeout(updatePlayHistoryIndicators, 500);
                    }
                }
                else {
                    console.warn("Could not record play history - invalid solution format");
                }
            }
            catch (error) {
                console.error("Error handling play history:", error);
                // Don't let play history errors block the main function
            }
        }
        return solutionsArr.length;
    }
    catch (error) {
        console.error("Error in doSearch:", error);
        showFeedbackToast("Error arranging players: " + error.message, true);
        // Final error handling for the fallback solution
        try {
            console.log("Attempting to generate emergency fallback solution after error");
            const allPlayers = Object.values(PLAYERS);
            if (allPlayers.length > 0) {
                const tablesToCreate = Math.ceil(allPlayers.length / MAXSEATS);
                try {
                    const fallbackSolution = generateFallbackSolution(allPlayers, tablesToCreate);
                    if (fallbackSolution && fallbackSolution.seatings) {
                        newSolution(fallbackSolution.seatings, fallbackSolution.score);
                        try {
                            recordPlayedTogether(fallbackSolution.seatings);
                        }
                        catch (playHistoryError) {
                            console.error("Error recording play history for emergency fallback:", playHistoryError);
                        }
                        return 1;
                    }
                    else {
                        console.error("Invalid fallback solution generated");
                    }
                }
                catch (fallbackGenerationError) {
                    console.error("Error generating fallback solution:", fallbackGenerationError);
                }
            }
            else {
                console.warn("No players available for emergency fallback solution");
            }
        }
        catch (fallbackError) {
            console.error("Failed to generate emergency fallback:", fallbackError);
        }
        return 0;
    }
}
// Function to generate a fallback solution when A* search fails
function generateFallbackSolution(players, maxTablesCount) {
    console.log("Generating fallback solution...");
    // Validate input
    if (!players || players.length === 0) {
        console.warn("No players provided to generateFallbackSolution");
        // Return a minimal valid solution structure with no tables
        return {
            seatings: [],
            score: 0
        };
    }
    if (maxTablesCount <= 0) {
        console.warn("Invalid maxTablesCount, defaulting to 1");
        maxTablesCount = 1;
    }
    // Filter out any invalid player objects
    const validPlayers = players.filter(player => player && typeof player.id === 'number' &&
        player.power && player.power.size > 0);
    if (validPlayers.length !== players.length) {
        console.warn(`Filtered out ${players.length - validPlayers.length} invalid players`);
    }
    // Create a copy of the players array that we can modify
    const availablePlayers = [...validPlayers];
    // ---------------------------------------------
    // SIGNIFICANTLY IMPROVED GROUPING BY POWER LEVEL
    // ---------------------------------------------
    // Group players strictly by their EXACT power levels
    const playersByExactPower = {};
    // Create empty arrays for each possible power level
    for (let power = Powerlevel.COMP; power >= Powerlevel.CASUAL; power--) {
        playersByExactPower[power.toString()] = [];
    }
    // Sort players by their specific power levels (not ranges)
    availablePlayers.forEach(player => {
        // Get all power levels for this player
        const powers = Array.from(player.power);
        // If a player has multiple power levels, place them based on highest
        if (powers.length > 0) {
            const highestPower = Math.max(...powers);
            playersByExactPower[highestPower.toString()].push(player);
        }
    });
    // Create empty tables
    const tables = Array(maxTablesCount).fill(null).map(() => []);
    // Track whether each player has been assigned to a table
    const assignedPlayers = new Set();
    // Calculate required tables per power level
    let tableIndex = 0;
    console.log("Strict grouping by exact power level:");
    // Process each power level strictly, starting from highest (COMP)
    for (let power = Powerlevel.COMP; power >= Powerlevel.CASUAL; power--) {
        const playersWithThisPower = playersByExactPower[power.toString()];
        if (!playersWithThisPower || playersWithThisPower.length === 0)
            continue;
        console.log(`Processing ${playersWithThisPower.length} players with power level ${power}`);
        // Calculate how many tables needed for this power level
        const tablesNeeded = Math.ceil(playersWithThisPower.length / MAXSEATS);
        // Ensure we don't exceed the max tables
        const actualTablesForThisPower = Math.min(tablesNeeded, maxTablesCount - tableIndex);
        if (actualTablesForThisPower <= 0) {
            console.warn(`Ran out of tables for power level ${power}`);
            continue;
        }
        // Sort by blacklist/whitelist constraints
        playersWithThisPower.sort((a, b) => {
            // Prioritize players with blacklists first (more constrained)
            if (a.blacklist.size !== b.blacklist.size) {
                return b.blacklist.size - a.blacklist.size;
            }
            // Then prioritize players with whitelists
            return b.whitelist.size - a.whitelist.size;
        });
        // Distribute players among tables for this power level
        let playerIndex = 0;
        for (let i = 0; i < actualTablesForThisPower; i++) {
            const currentTableIndex = tableIndex + i;
            if (currentTableIndex >= tables.length)
                break;
            const currentTable = tables[currentTableIndex];
            // Fill this table with up to MAXSEATS players
            for (let j = 0; j < MAXSEATS && playerIndex < playersWithThisPower.length; j++) {
                const player = playersWithThisPower[playerIndex];
                // Skip if player is already assigned
                if (assignedPlayers.has(player.id)) {
                    playerIndex++;
                    j--; // Don't count this attempt
                    continue;
                }
                // Check blacklist constraints
                const hasBlacklistedPlayer = currentTable.some(playerId => player.blacklist.has(playerId) ||
                    (PLAYERS[playerId] && PLAYERS[playerId].blacklist.has(player.id)));
                if (!hasBlacklistedPlayer) {
                    currentTable.push(player.id);
                    assignedPlayers.add(player.id);
                    playerIndex++;
                }
                else {
                    // Try to find another player that fits
                    let foundAlternative = false;
                    for (let alt = playerIndex + 1; alt < playersWithThisPower.length; alt++) {
                        const altPlayer = playersWithThisPower[alt];
                        if (assignedPlayers.has(altPlayer.id))
                            continue;
                        const altHasBlacklist = currentTable.some(playerId => altPlayer.blacklist.has(playerId) ||
                            (PLAYERS[playerId] && PLAYERS[playerId].blacklist.has(altPlayer.id)));
                        if (!altHasBlacklist) {
                            currentTable.push(altPlayer.id);
                            assignedPlayers.add(altPlayer.id);
                            foundAlternative = true;
                            playerIndex++;
                            break;
                        }
                    }
                    if (!foundAlternative) {
                        // If we couldn't find anyone else, use the original player despite blacklist
                        if (j === 0 || currentTable.length === 0) { // Only force if table is empty
                            currentTable.push(player.id);
                            assignedPlayers.add(player.id);
                            playerIndex++;
                        }
                        else {
                            // Otherwise skip this seat
                            j--;
                            playerIndex++;
                        }
                    }
                }
            }
        }
        tableIndex += actualTablesForThisPower;
    }
    // Assign any remaining players, trying to preserve power level grouping
    const unassignedPlayers = availablePlayers.filter(p => !assignedPlayers.has(p.id));
    if (unassignedPlayers.length > 0) {
        console.log(`Assigning ${unassignedPlayers.length} remaining players`);
        // Sort unassigned players by power level (highest first)
        unassignedPlayers.sort((a, b) => {
            // Get highest power level for each player
            const aHighestPower = Math.max(...Array.from(a.power));
            const bHighestPower = Math.max(...Array.from(b.power));
            return bHighestPower - aHighestPower;
        });
        // Try to find the best table for each player
        for (const player of unassignedPlayers) {
            if (assignedPlayers.has(player.id))
                continue;
            let bestTable = -1;
            let bestTableScore = Infinity;
            let playerHighestPower = Math.max(...Array.from(player.power));
            // Find the best table for this player
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                if (table.length >= MAXSEATS)
                    continue; // Skip full tables
                // Skip tables with blacklisted players
                const hasBlacklistedPlayer = table.some(playerId => player.blacklist.has(playerId) ||
                    (PLAYERS[playerId] && PLAYERS[playerId].blacklist.has(player.id)));
                if (hasBlacklistedPlayer)
                    continue;
                // Empty table is a reasonable choice for last resort
                if (table.length === 0) {
                    bestTable = i;
                    bestTableScore = 1; // Good but not perfect
                    continue;
                }
                // Calculate power level match
                const tablePlayers = table.map(id => PLAYERS[id]);
                const tableHighestPowers = tablePlayers.map(p => Math.max(...Array.from(p.power)));
                const tableAveragePower = tableHighestPowers.reduce((a, b) => a + b, 0) / tableHighestPowers.length;
                // Score based on power level match (lower is better)
                let tableScore = Math.abs(playerHighestPower - tableAveragePower) * 10;
                // Strongly prefer tables with the exact same power level
                if (Math.abs(playerHighestPower - tableAveragePower) < 0.1) {
                    tableScore = 0; // Perfect match
                }
                // Prefer tables that are closer to being full
                tableScore -= table.length;
                // Keep track of the best table
                if (tableScore < bestTableScore) {
                    bestTableScore = tableScore;
                    bestTable = i;
                }
            }
            // Assign to the best table or create a new one if needed
            if (bestTable >= 0) {
                tables[bestTable].push(player.id);
                assignedPlayers.add(player.id);
            }
            else {
                // Try to find any table with space
                for (let i = 0; i < tables.length; i++) {
                    if (tables[i].length < MAXSEATS) {
                        tables[i].push(player.id);
                        assignedPlayers.add(player.id);
                        break;
                    }
                }
            }
        }
    }
    // Remove empty tables
    const nonEmptyTables = tables.filter(table => table.length > 0);
    // Check if we assigned everyone
    const missingPlayers = availablePlayers.filter(p => !assignedPlayers.has(p.id));
    if (missingPlayers.length > 0) {
        console.warn(`Failed to assign ${missingPlayers.length} players: ${missingPlayers.map(p => p.name).join(', ')}`);
    }
    // Score the solution using the same heuristic as the A* search
    const heuristic = new Heuristic(MAXSEATS);
    // Build a State object to evaluate the solution
    const tablesAsTableObjects = nonEmptyTables.map((playerIds, idx) => {
        const table = new Table(idx);
        playerIds.forEach(playerId => table.seatPlayer(playerId));
        return table;
    });
    const state = new State(tablesAsTableObjects, []);
    const score = heuristic.evalState(state);
    // Return the final solution
    return {
        seatings: nonEmptyTables,
        score: score
    };
}
//# sourceMappingURL=agent.js.map