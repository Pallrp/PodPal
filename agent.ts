const MAXSEATS = 4;
// id -> Player dictionary for all players
var PLAYERS:Record<number, Player> = {};
// TODO: async


class Heuristic {
    /*
        Score numbers (High = bad)
    */
    HIGHERPOWER:number = 25;    // Cost for each higher power that exist if theres a lower power in the pod
    WHITELIST:number = 0;       // Cost for Whitelist players are at same table
    BLACKLIST:number = 100;     // Cost for Blacklisted players are at same table
    EMPTYSEAT:number = 10;      // Cost for each player who hasnt been seated

    maxPlayers:number;

    constructor(maxplayers:number) {this.maxPlayers = maxplayers;}

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
        // TODO: return "heuristic score" of the state
        var totalScore = 0;
        var totalSeated = state.totalSeatedPlayers();
        // add score for total unseated players
        totalScore += (this.maxPlayers - totalSeated) * this.EMPTYSEAT;
        // search for black- & whitelist + differing powerlevels
        for (var table of state.tables) {
            var tableScore = 0;
            var seatsByPower = {};
            var blackListSet = new Set();
            var whiteListSet = new Set();
            for (let objPlayerId of table.seats) {
                var player:Player = PLAYERS[objPlayerId[0]];
                addValToDictSet(seatsByPower, player.power, player);
                if (player.hasBlacklist()) {
                    if(table.containsBlackList(player)) {
                        blackListSet.add(player);
                    }
                }
                if (player.hasBlacklist()) {
                    if(table.containsWhitelist(player)) {
                        whiteListSet.add(player);
                    }
                }
            }
            // add blacklist score
            tableScore += blackListSet.size * this.BLACKLIST;
            // add whitelist score
            tableScore += whiteListSet.size * this.WHITELIST;
        }
    }
    
}

class Environment {
    playersList:Array<Player>
    maxTables:number
    tables:Set<Table>

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
            this.tables.add(
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
        var availableTables:Array<Table> = []
        for (let table of state.tables) {
            if (!table.isFull()) {
                if (!table.containsBlackList(player)) {
                    availableTables.push(table);
                }
            }
        }
        return availableTables;
    }

    getInitialState() : State {
        return new State(null, this.tables);
    }
}

class State {
    prevState:State|null
    tables:Array<Table>
    // a possible assignment of variables of course
    constructor(prevState:State|null, tables:Set<Table>) {
        this.prevState = prevState;
        this.tables = Array.from(tables);
    }
    totalSeatedPlayers() {
        return this.tables.reduce((prev, curr) => {return prev + curr.seatedPlayers()}, 0);
    }
    hash() {
        // do I need this?
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
        
        // choose which player to order first
        var player:Player|null = this.heuristic.evalPlayer(this.unsortedPlayers);
        // when player has been chosen, choose which table to sit him at
        let actions = this.env.legalActions(currentState, player);
        for (let action in actions) {
            let score = this.heuristic.evalState(player, action);
            if (score == bestScore) {
                bestAction = action
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
/* Adds a value to a dict's value set, if key does not exist, create a new set */
function addValToDictSet(dictObj:Record<number, Set<object>>, key:number, value:object) {
    if (!(key in dictObj)) {
        dictObj[key] = new Set();
    }
    dictObj[key].add(value);
}
// MAIN FUNCTION
function doSearch() {
    let players = collectPlayers();
    let env = new Environment(players);
    let search = new SearchAgent(new Heuristic(players.length), env);
    search.start();
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}