const MAXSEATS = 4;
// id -> Player dictionary for all players
const PLAYERS = {};
// TODO: async


class Heuristic {
    constructor() {

    }
    evalPlayer(playersSet:Set<number>) : Player|null {
        // TODO: pick player with estamated least branching paths
        return null;
    }
    evalState(state:State) {
        // TODO: return "heuristic score" of the state
    }
    
}

class Environment {
    players:Array<Player>
    maxTables:number
    tables:Set<Table>

    constructor(players:Array<Player>) {
        this.players = players;
        this.maxTables = Math.round(players.length / 3);
        this.constructTables();
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
        return state.totalSeatedPlayers() == this.players.length;        
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
        environment.players.map((player) => {this.unsortedPlayers.add(player.id)});
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
    seats:Set<Player>

    constructor(id:number) {
        this.id = id;
        this.seats = new Set();
    }
    isFull() {
        return this.seats.size <= MAXSEATS;
    }
    containsBlackList(player:Player) {
        for (let blacklistedPlayer of player.blacklist.entries()) {
            if (blacklistedPlayer in this.seats) {
                return true;
            }
        }
        return false;
    }
    containsWhitelist(player:Player) {
        for (let whitelistedPlayer of player.whitelist.entries()) {
            if (whitelistedPlayer in this.seats) {
                return true;
            }
        }
        return false;
    }
    getPower() {
        let podPower = Array.from(this.seats).reduce((prev, curr) => {
            return prev + curr.power;
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

function doSearch() {
    let players = collectPlayers();
    let env = new Environment(players);
    let search = new SearchAgent(new Heuristic(), env);
    search.start();
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}