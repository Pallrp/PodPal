const MAXSEATS = 4;
// id -> Player dictionary for all players
var PLAYERS:Record<number, Player> = {};
// TODO: async

class MinHeap {
    heap:Array<State>;
    h:Heuristic
    constructor(h:Heuristic) {
        this.h = h;
        this.heap = [];
    }
 
    // Helper Methods
    getLeftChildIndex(parentIndex:number) {
        return 2 * parentIndex + 1;
    }
    getRightChildIndex(parentIndex:number) {
        return 2 * parentIndex + 2;
    }
    getParentIndex(childIndex:number) {
        return Math.floor((childIndex - 1) / 2);
    }
    hasLeftChild(index:number) {
        return this.getLeftChildIndex(index) < this.heap.length;
    }
    hasRightChild(index:number) {
        return this.getRightChildIndex(index) < this.heap.length;
    }
    hasParent(index:number) {
        return this.getParentIndex(index) >= 0;
    }
    leftChild(index:number) {
        return this.heap[this.getLeftChildIndex(index)];
    }
    rightChild(index:number) {
        return this.heap[this.getRightChildIndex(index)];
    }
    parent(index:number) {
        return this.heap[this.getParentIndex(index)];
    }
 
    // Functions to create Min Heap
     
    swap(indexOne:number, indexTwo:number) {
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
 
    add(item:State) {
        this.heap.push(item);
        this.heapifyUp();
    }
 
    heapifyUp() {
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.parent(index) > this.heap[index]) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }
 
    heapifyDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.rightChild(index) < this.leftChild(index)) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.heap[index] < this.heap[smallerChildIndex]) {
                break;
            } else {
                this.swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }
     
    printHeap() {
        var heap =` ${this.heap[0]} `
        for(var i = 1; i<this.heap.length;i++) {
            heap += ` ${this.heap[i]} `;
        }
        console.log(heap);
    }
}

class Heuristic {
    /*
        Score numbers (High = bad)
    */
    POWERDIFF:number = 25;          // Cost for level higher power that exist if theres a lower power in the pod
                                    // Each level higher adds a squared multiplier to this score (1 level diff = 2x, 2 levels diff = 4x)
    WHITELIST:number = 0;           // Cost for Whitelist players are at same table
    BLACKLIST:number = 100;         // Cost for Blacklisted players are at same table
    EMPTYSEAT:number = 10;          // Cost for each player who hasnt been seated (default cost)

    maxPlayers:number;
    hashmap:Record<number, number>; // hash: value
    constructor(maxplayers:number) {
        this.maxPlayers = maxplayers;
        this.hashmap = {};
    }

    evalPlayer(playersSet:Set<number>) : Player|null {
        // TODO: pick player with estimated least branching paths
        var setLength:number = playersSet.size;
        var i:number = 1;
        for (let objPlayerID of playersSet) {
            var player:Player = PLAYERS[objPlayerID[0]];
            if (player.hasBlacklist()) {
                // better to sort list players first
                return player;
            } else if (player.hasWhitelist()) {
                // better to sort list players first
                return player;
            } else if (i == setLength) {
                // last player
                return player;
            }
            i++;
        }
        return null;
    }

    evalState(state:State) {
        let stateHash = state.hash();
        if ((stateHash) in this.hashmap) {
            return this.hashmap[stateHash];
        }
        // TODO: return "heuristic score" of the state
        var totalScore = 0;
        var totalSeated = state.totalSeatedPlayers();
        var player:Player;
        // add score for total unseated players
        totalScore += (this.maxPlayers - totalSeated) * this.EMPTYSEAT;
        // search for black- & whitelist + differing powerlevels
        for (var table of state.tables) {
            var tableScore = 0;
            var seatsByPower:Record<number, Set<number>> = {};
            var totalDifferingPowers = 0;
            
            for (let objPlayerId of table.seats) {
                player = PLAYERS[objPlayerId[0]];
                totalDifferingPowers += addValToDictSet(seatsByPower, player.power, player.id);
                if (player.hasBlacklist()) {
                    if(table.containsBlackList(player)) {
                        // add whitelist score
                        tableScore += this.BLACKLIST;
                    }
                }
                if (player.hasBlacklist()) {
                    if(table.containsWhitelist(player)) {
                        // add blacklist score
                        tableScore += this.WHITELIST;
                    }
                }
            }
            // check powerlevels
            if (totalDifferingPowers > 1) {
                var differingPowers = 0;
                var powerLevel:string, playerSet:Set<number>;

                for ([powerLevel, playerSet] of Object.entries(seatsByPower)) {
                    // more higher power than lower are preferrable over more lower over higher
                    // for each player at higher, increment by one 
                    let PL:number = Number(powerLevel);
                    if (String(PL + 1) in seatsByPower) {
                        differingPowers += playerSet.size * 1;
                    }
                    if (String(PL + 2) in seatsByPower) {
                        differingPowers += playerSet.size * 2;
                    }
                    if (String(PL + 3) in seatsByPower) {
                        differingPowers += playerSet.size * 4;
                    }
                }
                tableScore += differingPowers * this.POWERDIFF;
            }
            totalScore += tableScore;
        }
        return totalScore;
    }
    
}

class Environment {
    playersList:Array<Player>;
    maxTables:number;
    tables:Array<Table>;

    constructor(players:Array<Player>) {
        this.maxTables = Math.round(players.length / 3);
        this.constructTables();
        this.loadPlayersToGlobal(players);
        this.playersList = players;
    }
    loadPlayersToGlobal(players:Array<Player>) {
        PLAYERS = {};
        for (let player of players) {
            PLAYERS[player.id] = player;
        }
    }

    constructTables() {
        for (let i = 0; i < this.maxTables; i++) {
            this.tables.push(
                new Table(i + 1)
            );
        }
    }
    
    isGoalState(state:State) {
        // return true if all seats filled
        return state.totalSeatedPlayers() == this.playersList.length;        
    }

    legalActions(state:State, player:Player) : Array<Table> {
        // legal seats for player instead of (for each player, for each table) decreases the scope by a considerable margin
        var availableTables:Array<Table> = [];
        for (let table of state.tables) {
            if (!table.isFull()) {
                availableTables.push(table);
            }
        }
        return availableTables;
    }

    getInitialState() : State {
        let playersIdSet:Set<number> = new Set();
        Array.prototype.forEach((player) => {playersIdSet.add(player.id)}, this.playersList);
        return new State(null, this.tables, playersIdSet);
    }
}

class State {
    prevState:State|null;
    tables:Array<Table>;
    playersLeft:Set<number>;
    // a possible assignment of variables of course
    constructor(prevState:State|null, tables:Array<Table>, playersLeft:Set<number>|Array<number>) {
        this.prevState = prevState;
        this.tables = [];
        this.playersLeft = new Set(playersLeft);
        Array.prototype.forEach((table) => {this.tables.push(table.copy())}, tables);
    }

    copy() : State {
        return new State(this.prevState, this.tables, this.playersLeft);
    }
    totalSeatedPlayers() {
        return this.tables.reduce((prev, curr) => {return prev + curr.seatedPlayers()}, 0);
    }
    nextState(playerId:number, toTable:number) : State {
        let stateCpy = this.copy();
        stateCpy.tables[toTable].seatPlayer(playerId);
        return stateCpy;
    }
    hash() : number {
        // do I need this?.. yes
        // OC (https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
        // donut steel

        // basically change the whole id list of seats to strings and hash the strings
        var str = "";
        let table:Table;
        for (table of this.tables) {
            // sets shouldnt change order, so ordering doesnt matter 
            for (let player of table.seats.entries()) {
                str += String(player[0]) + "-";
            }
        }
        var hash = 0,
            i:number, chr:number;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

}

class SearchAgent {
    heuristic:Heuristic
    env:Environment
    unsortedPlayers:Set<number>
    constructor(heuristic:Heuristic, environment:Environment) {
        this.heuristic = heuristic;
        this.env = environment;
        this.unsortedPlayers = new Set();
        environment.playersList.map((player) => {this.unsortedPlayers.add(player.id)});
    }

    recursiveSearch(previousState:State) {
        if (this.env.isGoalState(previousState)) {    
            return previousState;
        }

        var bestAction:number|null = null;
        var bestScore:number = Infinity;
        var frontier:Array<State> = [];
        // choose which player to order first
        var player:Player|null = this.heuristic.evalPlayer(this.unsortedPlayers);
        // when player has been chosen, choose which table to sit him at
        if (player !== null) {
            let actions = this.env.legalActions(previousState, player);
            for (let action in actions) {
                let score = this.heuristic.evalState(player, action);
                if (score == bestScore) {
                    bestAction = action
                }
            }
        }
        // pick best value first, recursively check deeper until all are assigned
        // save results
        // then check if theres a better option
        // hash table?

    }

    start() {
        let initialState:State = this.env.getInitialState();
        this.recursiveSearch(initialState);
    }
}

class Table {
    id:number
    seats:Set<number>

    constructor(id:number) {
        this.id = id;
        this.seats = new Set();
    }

    copy() {
        let newTbl = new Table(this.id);
        this.seats.forEach(seat => {
            newTbl.seats.add(seat);
        });
    }

    seatPlayer(playerId:number) {
        this.seats.add(playerId);
    }
    
    isFull() {
        return this.seats.size <= MAXSEATS;
    }

    containsBlackList(player:Player) {
        for (let blacklistedPlayer of player.blacklist.entries()) {
            let playerId:number = blacklistedPlayer[0];
            if (playerId in this.seats) {
                return true;
            }
        }
        return false;
    }
    
    containsWhitelist(player:Player) {
        for (let whitelistedPlayer of player.whitelist.entries()) {
            let playerId:number = whitelistedPlayer[0];
            if (playerId in this.seats) {
                return true;
            }
        }
        return false;
    }
    
    getPower() {
        let podPower = Array.from(this.seats).reduce((prev, curr) => {
            return prev + PLAYERS[curr].power;
        }, 0);
        return podPower / this.seats.size;
    }
    
    seatedPlayers() {
        return this.seats.size;
    }
}

/* The node for a player */
class Player {
    id:number
    name:string
    power:number
    whitelist:Set<number>
    blacklist:Set<number>

    constructor(id:number, name:string, power:number) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = new Set();
        this.blacklist = new Set();
    }
    /* Sets the whitelist variable as the set or iterable */
    setWhitelist(whitelist) {
        this.whitelist = whitelist;
    }

    /* Sets the blacklist variable as the set or iterable */
    setBlacklist(blacklist) {
        this.blacklist = blacklist;
    }

    hasWhitelist():boolean {
        return this.whitelist.size > 0;
    }
    hasBlacklist():boolean {
        return this.blacklist.size > 0;
    }
}
/* Returns a list of all added players, instantiated in a list of Player classes */
function collectPlayers():Array<Player> {
    let playersContainer = (document.getElementById('players-container') as HTMLElement);
    let playersList = new Array();

    Array.from(playersContainer.children).forEach((function (elem) {
        let id:number = Number(
            (elem.getAttribute("id") as string).split("-")[1]
        );
        let name:string = (elem.querySelector('player-name') as HTMLElement).innerHTML.trim();
        let power:number = Number(elem.getAttribute("value") as string);
        let newP = new Player(id, name, power);
        // TODO: add whitelist
        //newP.setWhitelist(stuff);
        // TODO: add blacklist
        //newP.setBlacklist(stuff);
        playersList.push(newP);
    }));
    return playersList;
}
// HELPER FUNCTIONS
/*
    Adds a value to a dict's value set, if key does not exist, create a new set
    Returns 1 if a new set was created within the record 
*/
function addValToDictSet(dictObj:Record<number, Set<number>>, key:number, value:number): number {
    var added = 0;
    if (!(key in dictObj)) {
        dictObj[key] = new Set();
        added ++;
    }
    dictObj[key].add(value);
    return added;
}
// MAIN FUNCTION
function doSearch() {
    let players = collectPlayers();
    let env = new Environment(players);
    let search = new SearchAgent(new Heuristic(players.length), env);
    search.start();
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}