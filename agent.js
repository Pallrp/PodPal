const MAXSEATS = 4;


class Heuristic {
    constructor() {

    }
    evalPlayer(playersSet) {

    }
    evalSeat(player, tablesSet) {

    }
    
}

class Environment {
    constructor(players) {
        this.players = players;
        this.maxTables = Math.round(players.length / 3);
        this.constructTables();
    }

    constructTables() {
        for (let i = 0; i < this.maxTables; i++) {
            this.tables.push(
                new Table(i + 1)
            );
        }
    }
    
    isGoalState(state) {
        // return true if all seats filled
        return state.totalSeatedPlayers() == this.players.length;        
    }

    legalActions(state, player) {
        // legal seats for player instead of (for each player, for each table) decreases the scope by a considerable margin
    }
}

class State {
    // what constitutes as a state?
    // a possible assignment of variables of course
    constructor(tables) {
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
    constructor(heuristic, environment) {
        this.heuristic = heuristic;
        this.env = environment;
        this.unsortedPlayers = new Set(environment.players);
    }

    recursiveSearch(currentState) {
        if (this.env.isGoalState(currentState)) {
            
            return;
        }
        // choose which player to order first
        var bestAction = null;
        var bestScore = Infinity;
        var player = this.heuristic.evalPlayer(this.unsortedPlayers);
        // when player has been chosen, choose which table to sit him at
        let actions = this.env.legalActions(currentState, player);
        for (let action in actions) {
            let score = this.heuristic.evalSeat(player, action);
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
        let initialState = this.env.getState();
        recursiveSearch();
    }
}

class Table {
    constructor(id) {
        this.id = id;
        this.seats = new Set();
    }
    isFull() {
        return this.seats.size <= MAXSEATS;
    }
    containsBlackList(player) {
        for (let blacklistedPlayer of player.blacklist.entries()) {
            if (blacklistedPlayer in this.seats) {
                return true;
            }
        }
        return false;
    }
    containsWhitelist(player) {
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
    constructor(id, name, power) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = new Set();
        this.blacklist = new Set();
    }
    /* Sets the whitelist variable as the set or iterable */
    setWhitelist(whitelist) {
        if (typeof whitelist !== 'Set') {
            whitelist = new Set(whitelist);
        }
        this.whitelist = whitelist;
    }

    /* Sets the blacklist variable as the set or iterable */
    setBlacklist(blacklist) {
        if (typeof blacklist !== 'Set') {
            blacklist = new Set(blacklist);
        }
        this.blacklist = blacklist;
    }
}
/* Returns a list of all added players, instantiated in a list of Player classes */
function collectPlayers() {
    document.getElementById('players-added-container');
    let playersList = new Array();

    document.childNodes.forEach(function (elem) {
        let id = elem.id;
        id = id.split("-")[1];
        let name = elem.querySelector('player-name').innerHTML.trim();
        let newP = new Player(id, name, power, whitelist, blacklist);
        // TODO: add whitelist
        //newP.setWhitelist(stuff);
        // TODO: add blacklist
        //newP.setBlacklist(stuff);
        playersList.push(newP);
    });
}

function doSearch() {
    let players = collectPlayers();
    let env = new Environment(players);
    let search = new SearchAgent(new Heuristic(), env);
    search.start();
    // return multiple solutions, maybe add a solution to the DOM each time a solution is found?
}