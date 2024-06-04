///<reference path="main.ts"/>

const MAXSEATS = 4;
const MAXSOLUTIONS = 10;
// id -> Player dictionary for all players
var PLAYERS:Record<number, Player> = {};
// TODO: async

class MinHeap<T> {
    heap:Array<T>;
    getval:(T) => number
    constructor(h:(T) => number) {
        this.getval = h;
        this.heap = [];
    }
 
    copy() : MinHeap<T> {
        let a:MinHeap<T> = new MinHeap(this.getval);
        a.heap = Array.from(this.heap);
        return a;
    }
    orderedArrHelper(index:number, outArray:Array<T>) : void {
        outArray.push(this.heap[index]);
        if (this.hasRightChild(index)) {
            this.orderedArrHelper(this.getRightChildIndex(index), outArray);
        }
        if (this.hasLeftChild(index)) {
            this.orderedArrHelper(this.getLeftChildIndex(index), outArray);
        }
    }

    getOrderedArray() : Array<T>{
        let arr:Array<T> = [];
        let clone:MinHeap<T> = this.copy();
        while (clone.heap.length) {
            arr.push((clone.remove() as T));
        }
        return arr;
    }
    // Helper Methods
    getLeftChildIndex(parentIndex:number) : number {
        return 2 * parentIndex + 1;
    }
    size() : number {
        return this.heap.length;
    }
    getRightChildIndex(parentIndex:number) : number {
        return 2 * parentIndex + 2;
    }
    getParentIndex(childIndex:number) : number {
        return Math.floor((childIndex - 1) / 2);
    }
    hasLeftChild(index:number) : boolean {
        return this.getLeftChildIndex(index) < this.heap.length;
    }
    hasRightChild(index:number) : boolean {
        return this.getRightChildIndex(index) < this.heap.length;
    }
    hasParent(index:number) : boolean {
        return this.getParentIndex(index) >= 0;
    }
    leftChild(index:number) : T {
        return this.heap[this.getLeftChildIndex(index)];
    }
    rightChild(index:number) : T {
        return this.heap[this.getRightChildIndex(index)];
    }
    parent(index:number) : T {
        return this.heap[this.getParentIndex(index)];
    }
 
    // Functions to create Min Heap
     
    swap(indexOne:number, indexTwo:number) : undefined {
        const temp:T= this.heap[indexOne];
        this.heap[indexOne] = this.heap[indexTwo];
        this.heap[indexTwo] = temp;
    }
 
    peek() : T|null {
        if (this.heap.length === 0) {
            return null;
        }
        return this.heap[0];
    }
     
    // Removing an element will remove the
    // top element with highest priority then
    // heapifyDown will be called 
    remove() : T|null {
        if (this.heap.length === 0) {
            return null;
        }
        const item = this.heap[0];
        this.heap[0] = this.heap[this.heap.length - 1];
        this.heap.pop();
        this.heapifyDown();
        return item;
    }
 
    add(item:T) : undefined {
        this.heap.push(item);
        this.heapifyUp();
    }
 
    heapifyUp() : undefined {
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.getval(this.parent(index)) > this.getval(this.heap[index])) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }
 
    heapifyDown() : undefined {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.getval(this.rightChild(index)) < this.getval(this.leftChild(index))) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.getval(this.heap[index]) < this.getval(this.heap[smallerChildIndex])) {
                break;
            } else {
                this.swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }
}

class Heuristic {
    /*
        Score numbers (High = bad)
    */
    /*
        Heuristic guide:
            powerdiff > empty seat:
                Pods are preferrably emptier instead of introducing a higher powerlevel to the pod
            powerdiff > (empty seat) * 2:
                Pods are heavily discouraged from having a higher powerlevel, a pod of 2 players is better than
                introducing a higher powerlevel
            powerdiff < empty seat:
                Pods are preferrably filled by filling with different powerlevels instead of unfilled pods
            powerdiff < (empty seat) * 2:
                Pods are heavily discouraged from being empty, going as far as introducing a much higher powerlevel
                to fill the 4th spot instead of being empty
            blacklist < powerdiff * 3:
                Two blacklisted players are encouraged to play with eachother at the same powerlevel
                instead of moving one of them to another pod of a different level
            blacklist > powerdiff * 3:
                Two blacklisted players are discouraged to be podded, regardless of a power difference
                they will be moved to a pod with differing powerlevel
    */
    POWERDIFF:number = 15;          // Cost for level higher power that exist if theres a lower power in the pod
                                    // Each level higher adds a squared multiplier to this score (1 level diff = 2x, 2 levels diff = 4x)
    WHITELIST:number = -25;           // Cost for Whitelist players are at same table
    BLACKLIST:number = 100;          // Cost for Blacklisted players are at same table
    EMPTYSEAT:number = 10;          // Cost for each player who hasnt been seated (default cost)
    // SEAT:number = // Cost for seating a player TODO: do we need this?

    maxPlayers:number;
    hashmap:Record<number, number>; // hash: value
    constructor(maxplayers:number) {
        this.maxPlayers = maxplayers;
        this.hashmap = {};
    }

    evalPlayer(playersSet:Set<number>) : Player|null {
        if (playersSet.size == 0) {
            return null;
        }
        return PLAYERS[Array.from(playersSet)[Math.floor(Math.random()*playersSet.size)]];
        // TODO: pick player with estimated least branching paths
        var setLength:number = playersSet.size;
        var i:number = 1;
        for (let objPlayerID of playersSet) {
            var player:Player = PLAYERS[objPlayerID];
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
        return playersSet[Math.floor(Math.random()*playersSet.size)];
    }

    evalState(state:State) {
        let stateHash = state.hash();
        if ((stateHash) in this.hashmap) {
            return this.hashmap[stateHash];
        }
        var totalScore = 0;
        // var totalSeated = state.totalSeatedPlayers();
        var player:Player,
            tableScore:number,
            totalDifferingPowers:number,
            seatsByPower:Record<number, Set<number>>;
        // search for black- & whitelist + differing powerlevels
        for (var table of state.tables) {
            if (table.seats.size() > 0) {
                tableScore = 0;
                seatsByPower = {};
                totalDifferingPowers = 0;
                // add score for each empty seat
                tableScore += (MAXSEATS - table.seats.size()) * this.EMPTYSEAT;

                for (let objPlayerId of table.seats.heap) {
                    player = PLAYERS[objPlayerId];
                    totalDifferingPowers += addValToDictSet(seatsByPower, player.power, player.id);
                    if (player.hasBlacklist()) {
                        if(table.containsBlackList(player)) {
                            // add whitelist score
                            tableScore += this.BLACKLIST;
                        }
                    }
                    if (player.hasWhitelist()) {
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
        }
        this.hashmap[stateHash] = totalScore;
        return totalScore;
    }
    
}

class Environment {
    playersList:Array<Player>;
    maxTables:number;
    tables:Array<Table>;

    constructor(players:Array<Player>) {
        this.maxTables = Math.round(players.length / 2);
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
        this.tables = [];
        for (let i = 0; i < this.maxTables; i++) {
            this.tables.push(
                new Table(i)
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
        for (let player of this.playersList) {
            playersIdSet.add(player.id);
        }
        return new State(this.tables, playersIdSet);
    }
}

class State {
    tables:Array<Table>;
    playersLeft:Set<number>;
    hashValue:number;
    // a possible assignment of variables of course
    constructor(tables:Array<Table>, playersLeft:Set<number>|Array<number>) {
        this.tables = [];
        this.playersLeft = new Set(playersLeft);
        this.hashValue = 0;
        for (let i = 0; i < tables.length; i++) {
            this.tables.push(tables[i].copy())
        }
    }

    copy() : State {
        return new State(this.tables, this.playersLeft);
    }
    totalSeatedPlayers() {
        return this.tables.reduce((prev, curr) => {return prev + curr.seatedPlayers()}, 0);
    }
    nextState(playerId:number, toTable:number) : State {
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
    hash() : number {
        if (this.hashValue !== 0) {
            return this.hashValue;
        }
        // do I need this?.. yes

        // basically change the whole id list of seats to strings and hash the strings
        var tablestrings:Array<string> = [];
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
        let sortedNames = tablestrings.sort().reduce((prev, curr) => {return prev + "-" + curr}, "")
        this.hashValue = hashString(sortedNames);
        return this.hashValue;
    }

    getSeats() : Array<Array<number>> {
        var allSeatsArray:Array<Array<number>> = [],
            tableSeats:Array<number>;
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

class SearchAgent {
    heuristic:Heuristic
    env:Environment
    unsortedPlayers:Set<number>
    frontier:MinHeap<State>;
    maxSolutions:number;
    solutions:Set<State>;
    constructor(heuristic:Heuristic, environment:Environment, maxSolutions) {
        this.heuristic = heuristic;
        this.env = environment;
        this.solutions = new Set();
        this.maxSolutions = maxSolutions;

        this.unsortedPlayers = new Set();
        this.env.playersList.map((player) => {this.unsortedPlayers.add(player.id)});
    }

    addSolution(state:State) {
        // TODO: maybe add a callback here, usable in frontend?
        console.log("Solution found");
        this.solutions.add(state);
        console.log(state.hash());
        newSolution(state.getSeats(), this.heuristic.evalState(state));
    }

    search() {

        var bestAction:State|null = null;
        var bestScore:number = Infinity;
        var exploredStates = new Set();
        var stateScore:number,
            currentState:State,
            currentPlayer:Player,
            actions:Array<Table>;
        
        while (this.frontier.peek() !== null) {
            // take out cheapest state known
            currentState = (this.frontier.remove() as State);

            if (this.env.isGoalState(currentState) && !(exploredStates.has(currentState.hash()))) {
                // state has all players sorted, check if we've beat the record
                stateScore = this.heuristic.evalState(currentState);
                if (bestScore >= stateScore) {
                    bestScore = stateScore;
                    bestAction = currentState;
                    this.addSolution(currentState);
                    exploredStates.add(currentState.hash());
                }
                if (this.solutions.size >= this.maxSolutions) {
                    return;
                }
            } else if (!(exploredStates.has(currentState.hash()))) {
                // add state to explored
                exploredStates.add(currentState.hash());
                // get next player to sort
                currentPlayer = (this.heuristic.evalPlayer(currentState.playersLeft) as Player);
                // add possible continuations to frontier
                actions = this.env.legalActions(currentState, currentPlayer);
                for (let action of actions) {
                    let nextState = currentState.nextState(currentPlayer.id, action.id);
                    if (!(exploredStates.has(nextState.hash()))) {
                        //stateScore = this.heuristic.evalState(nextState);
                        // Add all states
                        this.frontier.add(nextState);
                    }
                    
                }
            }
        }
    }

    initializeFrontier(initialState:State) : undefined {
        this.frontier = new MinHeap((a) => {return this.heuristic.evalState(a)});
        this.frontier.add(initialState);
    }

    start() {
        let initialState:State = this.env.getInitialState();
        this.initializeFrontier(initialState);
        this.search();
    }
}

class Table {
    id:number
    seats:MinHeap<number>

    constructor(id:number) {
        this.id = id;
        this.seats = new MinHeap((a) => {return a});
    }

    copy() : Table {
        let newTbl = new Table(this.id);
        newTbl.seats = this.seats.copy();
        return newTbl;
    }

    seatPlayer(playerId:number) {
        this.seats.add(playerId);
    }
    
    isFull() : boolean {
        return this.seats.size() >= MAXSEATS;
    }

    containsList(player:Player, listAttr:string) : boolean {
        for (let listedPlayer of player[listAttr]) {
            let playerId:number = listedPlayer;
            for (let player of this.seats.getOrderedArray()) {
                let playerId2:number = Number(player)
                if (playerId == playerId2) {
                    return true;
                }
            }
        }
        return false;
    }

    containsBlackList(player:Player) {
        return this.containsList(player, "blacklist");
    }
    
    containsWhitelist(player:Player) {
        return this.containsList(player, "whitelist");
    }
    
    seatedPlayers() {
        return this.seats.size();
    }
}

/* The node for a player */
class Player {
    id:number
    name:string
    power:number
    whitelist:Set<number>
    blacklist:Set<number>
    hashValue:number

    constructor(id:number, name:string, power:number) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = new Set();
        this.blacklist = new Set();
        this.hashValue = hashString(this.name);
    }
    /* Sets the whitelist variable as the set or iterable */
    setWhitelist(whitelist:Set<number>) {
        this.whitelist = whitelist;
    }

    /* Sets the blacklist variable as the set or iterable */
    setBlacklist(blacklist:Set<number>) {
        this.blacklist = blacklist;
    }

    hasWhitelist():boolean {
        return this.whitelist.size > 0;
    }
    hasBlacklist():boolean {
        return this.blacklist.size > 0;
    }
    hash() : number{
        return this.hashValue;
    }
}
function getList(listtype:string, playerEl:Element) : Array<number>{
    var nodeList = playerEl.querySelector("." + listtype);
    var returnArr:Array<number> = [];
    if (nodeList) {
        for (let i = 0; i < nodeList.children.length; i++) {
            let playerListId:string = nodeList.children[i].classList[0];
            if (playerListId !== null) {
                returnArr.push(
                    Number(String(playerListId).split("-")[2])
                );
            }
        }
    }
    return returnArr;
}
/* Returns a list of all added players, instantiated in a list of Player classes */
function collectPlayers():Array<Player> {
    let playersContainer = (document.getElementById('players-container') as HTMLElement);
    let playersList = new Array();

    Array.from(playersContainer.children).forEach((function (elem) {
        let id:number = Number(
            (elem.getAttribute("id") as string).split("-")[1]
        );
        let name:string = (elem.querySelector('.player-name') as HTMLElement).innerHTML.trim();
        let power:number = Number(elem.querySelector(".player-power-container")?.getAttribute("value") as string);
        let newP = new Player(id, name, power);
        // TODO: add whitelist
        newP.setBlacklist(new Set(getList("blacklist", elem)));
        newP.setWhitelist(new Set(getList("whitelist", elem)));
        //newP.setWhitelist(stuff);
        // TODO: add blacklist
        //newP.setBlacklist(stuff);
        playersList.push(newP);
    }));
    return playersList;
}
// HELPER FUNCTIONS
function playernameSort(a:number, b:number) :number {
    if (PLAYERS[a].name < PLAYERS[b].name) {
        return 1;
    } else if (PLAYERS[a].name < PLAYERS[b].name) {
        return -1;
    }
    return 0;
}

// OC (https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
// donut steel
function hashString(str:string) : number {
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
    let agent = new SearchAgent(new Heuristic(players.length), env, MAXSOLUTIONS);
    agent.start();
    console.log(agent.solutions.size + " solutions found");
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}