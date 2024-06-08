///<reference path="main.ts"/>
// timeout ms before search is abruptly stopped
const TIMEOUT = 10000;
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
                                    // Each level higher adds a multiplicative score for each player that's lower
                                    // (1 level diff = 1*players lower, 2 levels diff = 2* players lower)
    WHITELIST:number = 0;           // Cost for Whitelist players are at same table
    BLACKLIST:number = 50;          // Cost for Blacklisted players are at same table
    EMPTYSEAT:number = 10;           // Cost for each empty seat on a table
    UNSEATED:number = 1;           // Encouragement cost -- try get the AI to check results that are closer to the goal 
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
        // return PLAYERS[Array.from(playersSet)[Math.floor(Math.random()*playersSet.size)]];
        // TODO: pick player with estimated least branching paths
        // pick player with most power levels first
        var playerArr = Array.from(playersSet).sort((a, b) => {
            return PLAYERS[b].power.size - PLAYERS[a].power.size;
        });
        // shuffle lowest N players for diversity
        let lowestN:Array<number> = [];
        let n = PLAYERS[playerArr[0]].power.size;
        for (let p of playerArr) {
            if (PLAYERS[p].hasWhitelist() ||PLAYERS[p].hasBlacklist()) {
                // least branches from list players
                return PLAYERS[p];
            }
            if (PLAYERS[p].power.size == n) {
                lowestN.push(p);
            }
        }
        return PLAYERS[lowestN[Math.floor(Math.random() * lowestN.length)]];
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
        var player1:Player,
            player2:Player,
            tableScore:number,
            powerDiff:number,
            totalPowerDiff:number;
        // search for black- & whitelist + differing powerlevels
        for (var table of state.tables) {
            if (table.seats.size() > 0) {
                tableScore = 0;
                totalPowerDiff = 0;
                // add score for each empty seat
                tableScore += (MAXSEATS - table.seats.size()) * this.EMPTYSEAT;

                for (let playerId1 of table.seats.heap) {
                    player1 = PLAYERS[playerId1];
                    for (let playerId2 of table.seats.heap) {
                        if (playerId1 != playerId2) {
                            player2 = PLAYERS[playerId2];
                            // take difference in powerlevel
                            if (player1.whitelist.has(player2.id)) {
                                continue; // powerdiff has no effect on whitelist
                            }
                            if (player2.power.has(player1.lowestPower)) {
                                continue; // player can compete here, no need to check for power mismatch
                            }
                            // there's a power mismatch, count all (higher - lower) instances
                            powerDiff = player1.lowestPower - player2.lowestPower;
                            if (powerDiff > 0) {
                                // we're more concerned with higher power pubstomping rather
                                // than lower power -- 3 low & 1 high will be counted 3 times to totalPowerDiff
                                totalPowerDiff += powerDiff;
                            }
                        }
                    }
                    // add powerdiff multiplier to score
                    tableScore += Math.round(totalPowerDiff * this.POWERDIFF);
                    // check lists
                    if (player1.hasBlacklist()) {
                        if(table.containsBlackList(player1)) {
                            // add blacklist score
                            tableScore += this.BLACKLIST;
                        }
                    }
                }
                totalScore += tableScore;
            }
        }
        // add UNSEATED cost for all unseated players
        totalScore += state.playersLeft.size * this.UNSEATED;
        this.hashmap[stateHash] = totalScore;
        return totalScore;
    }
    
}

class Environment {
    playersList:Array<Player>;
    maxTables:number;
    tables:Array<Table>;

    constructor(players:Array<Player>) {
        this.maxTables = Math.floor(players.length / 3);
        this.constructTables();
        this.playersList = players;
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
        return state.playersLeft.size == 0;
    }

    legalActions(state:State, player:Player) : Array<Table> {
        // legal seats for player instead of (for each player, for each table) decreases the scope by a considerable margin
        var availableTables:Array<Table> = [];
        for (let table of state.tables) {
            if (table.canSeat(player.id)) {
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

class Agent {
    
    heuristic:Heuristic
    env:Environment
    unsortedPlayers:Set<number>
    frontier:MinHeap<State>;
    maxSolutions:number;
    solutions:Array<State>;
    timeoutAt:number;
    // staticstic
    nodesExpanded:number;   // how many states are checked for expansion
    nodesGenerated:number;  // how many states are generated
    nodesSkipped:number;    // how many states are skipped due to already explored
    goalsFound:number;      // how many goal states are generated
    constructor(heuristic:Heuristic, environment:Environment, maxSolutions:number) {
        this.heuristic = heuristic;
        this.env = environment;
        this.solutions = [];
        this.maxSolutions = maxSolutions;
        this.timeoutAt = Date.now() + TIMEOUT;
        this.unsortedPlayers = new Set();
        this.env.playersList.map((player) => {this.unsortedPlayers.add(player.id)});
        this.nodesGenerated = this.goalsFound = this.nodesSkipped = this.nodesExpanded = 0;
    }

    addSolution(state:State) {
        // TODO: maybe add a callback here, usable in frontend?
        if (this.solutions.length >= this.maxSolutions) {
            this.solutions.shift();
        }
        this.solutions.push(state);
    }
    search() {
        throw Error("Base Agent does not implement a search() method");
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
    checkTimeout() {
        if (Date.now() > this.timeoutAt) {
            throw Error("Agent timed out during search");
        }
    }
}

class RandomAgent extends Agent {
    search() {
        var playersLeft = new Set(this.unsortedPlayers);
        var theState = this.frontier.remove();
        while (playersLeft.size > 0) {
            var player = this.heuristic.evalPlayer(playersLeft);
            if (theState != null && player != null) {
                let actions = this.env.legalActions(theState, player);
                let action:Table = actions[Math.floor(Math.random() * actions.length)];
                theState = theState.nextState(player.id, action.id);
                playersLeft.delete(player.id);
            }
        }
        if (theState != null) {
            this.addSolution(theState);
        }
    }
}

class AStarAgent extends Agent {

    search() {
        var bestScore:number = Infinity;
        var exploredStates = new Set();
        var stateScore:number,
            currentState:State,
            currentPlayer:Player,
            actions:Array<Table>;
        
        while (this.frontier.peek() !== null) {
            // take out cheapest state known
            currentState = (this.frontier.remove() as State);
            this.nodesExpanded ++;

            if (this.env.isGoalState(currentState) ) {
                this.goalsFound++;
                if (!(exploredStates.has(currentState.hash()))) {
                    // state has all players sorted, check if we've beat the record
                    stateScore = this.heuristic.evalState(currentState);
                    if (bestScore >= stateScore) {
                        bestScore = stateScore;
                        this.addSolution(currentState);
                        exploredStates.add(currentState.hash());
                    }
                } else {
                    this.nodesSkipped++;
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
                        this.nodesGenerated++;
                    } else {
                        this.nodesSkipped++;
                    }
                }
            } else {
                this.nodesSkipped++;
            }
            this.checkTimeout();
        }
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
        if (PLAYERS[playerId].hasWhitelist()) {
            for (let listplayer of PLAYERS[playerId].whitelist) {
                this.seats.add(listplayer);
            }
        }
    }

    canSeat(playerId:number) : boolean {
        return (this.seats.size() + PLAYERS[playerId].seatSize()) <= MAXSEATS;
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
    id:number;
    name:string;
    power:Set<number>;
    whitelist:Set<number>;
    blacklist:Set<number>;
    hashValue:number;
    lowestPower:number;

    constructor(id:number, name:string, power:Set<number>) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = new Set();
        this.blacklist = new Set();
        this.hashValue = hashString(this.name);
        this.lowestPower = (Array.from(this.power).reduce(
            (prev, curr) => {return prev < curr ? prev : curr;}, Infinity
        ));
    }

    /* Sets the whitelist variable as the set or iterable */
    setWhitelist(whitelist:Set<number>) {
        this.whitelist = whitelist;
    }

    /* Sets the blacklist variable as the set or iterable */
    setBlacklist(blacklist:Set<number>) {
        this.blacklist = blacklist;
    }
    seatSize() : number {
        if (this.hasWhitelist()) {
            return this.whitelist.size + 1;
        }
        return 1;
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
    var playersList:Array<number> = [];
    PLAYERS = {};
    Array.from(playersContainer.children).forEach((function (elem) {
        let id:number = Number(
            (elem.getAttribute("id") as string).split("-")[1]
        );
        let name:string = (elem.querySelector('.player-name') as HTMLElement).innerHTML.trim();
        let power:Set<number> = new Set();
        let powerContainer = (elem.querySelector(".player-power-container") as HTMLElement);
        for (let i = 0; i < powerContainer.children.length; i++) {
            let powerSelection = powerContainer.children[i];
            power.add(Number(powerSelection.getAttribute("value")));
        }
        let newP = new Player(id, name, power);
        // TODO: add blacklist
        newP.setBlacklist(new Set(getList("blacklist", elem)));
        newP.setWhitelist(new Set(getList("whitelist", elem)));
        playersList.push(newP.id);
        PLAYERS[newP.id] = newP;
    }));
    let addedPlayers:Set<number> = new Set();
    let returnList:Array<Player> = [];
    for (let playerId of playersList) {
        if (addedPlayers.has(playerId)) {
            continue;
        }
        returnList.push(PLAYERS[playerId]);
        if (PLAYERS[playerId].hasWhitelist()) {
            for (let listplayer of PLAYERS[playerId].whitelist) {
                addedPlayers.add(listplayer);
            }
        }
        addedPlayers.add(playerId);
    }
    return returnList;
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
