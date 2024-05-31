// ########### CSP Classes ##########
const powerDomain = [
    1, // casual
    2, // medium
    3, // high
    4  // competetive
];

class PVar {
    constructor(player) {
        this.id = player.id;
        this.name = player.name;
        this.power = player.power;
        this.whitelist = new Set();
        if (player.whitelist.length) {
            this.setWhitelist(player.whitelist);
        }
        this.blacklist = new Set();
        if (player.blacklist.length) {
            this.setBlacklist(player.blacklist);
        }
        
        this.value = null;
        this.domain = new Set();
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

    /* Adds the domain to the given variable */
    setDomain(domain) {
        if (typeof domain !== 'Set') {
            domain = new Set(domain);
        }
        this.domain = domain;
    }

    /* Removes the value from this variables domain */
    pruneValue(self, value) {

    }

    /* Adds the value from this variables domain */
    unpruneValue(self, value) {

    }
}

class Constraint {
    constructor(name, callback) {
        this.name = name;
        this.callback = callback;
        this.weight = 0;
    }

    setWeight(newWeight) {
        this.weight = newWeight;
    }

    isSatisfied() {
        return this.callback();
    }
}

class Heuristics {
    constructor () {}

    selectVariable() {

    }

}

class CSPModel {
    constructor() {
        this.variables = new Set();
        this.constraints = new Set();
    }
    
    addVariable(player) {

    }

    solve() {

    }
}
// ########### ??? idno what to name this, other stuff that uses CSP stuff but is not directly CSP stuff ##########

class Player {
    constructor(id, name, power, whitelist, blacklist) {
        this.id = id;
        this.name = name;
        this.power = power;
        this.whitelist = whitelist;
        this.blacklist = blacklist;
    }
}

/* 
    Collects all players added as an array of players
    [
        Player({id, name, power, whitelist, blacklist}),
        ...
    ]
*/
function collectPlayers() {
    document.getElementById('players-added-container');
    let playersList = new Array();

    document.childNodes.forEach(function (elem) {
        let id = elem.id;
        id = id.split("-")[1];
        let name = elem.querySelector('player-name').innerHTML.trim();
        // TODO: add whitelist
        let whitelist = new Set();
        // TODO: add blacklist
        let blacklist = new Set();
        
        playersList.push(
            new Player(id, name, power, whitelist, blacklist)
        );
    });
}

/* Models the */
function createCSPProblem() {
    let CSP = new CSPModel();

    let players = collectPlayers();
    players.forEach((player) => {
        CSP.addVariable(player);
    });

    let blacklists = new Set();
    let whitelsits = new Set();
}