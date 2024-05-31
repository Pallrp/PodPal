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
        
        this.value = null;
        this.domain = new Set();
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


class CSPModel {
    constructor() {
        this.variables = new Set();
        this.constraints = new Set();
    }
    
    addVariable(pVar) {
        this.variables.add(pVar);
    }

    addConstraint(constraint) {
        this.constraints.add(constraint);
    }

}

function basicPropagator(CSP, nextVar) {
    let prunings = new Set();
    let constraints = CSP.constraints;
    let allSatisfied = false;
    constraints.every((constr) => {
        if (constr.isSatisfied()) {
            return true;
        }
        allSatisfied = false;
        return false;
    });

    return allSatisfied, prunings;
}

class Solver {
    constructor(CSP) {
        this.CSP = CSP;
        this.assignments = new Set();
    }

    nextVariable() {
        // TODO: heuristic approach based on domain sizes?
        // TODO: additional sort based on play numbers here
        var returnVar = null;
        // This could be more efficient if a set could be iterated through easier...
        // right now its changing arrays from sets
        this.variables.every((varib) => {
            if (!varib.value) {
                returnVar = varib;
                return false;
            }
            return true;
        });
        return returnVar;
    }

    backtrackSolve(assignments) {
        let shouldContinue, prunings;
        
        let nextVar = this.nextVariable();
        shouldContinue, prunings = basicPropagator(this, nextVar);
        if (shouldContinue && nextVar !== null) {
            for(var i = 0; i < nextVar.domain.size; i++) {
                let nextValue = nextVar.domain[i];
                nextVar.assingValue(nextValue);

                // prune other players after power level
            }
        }

    }

    solve() {
        this.backtrackSolve([]);
    }

    getSolution() {

    }
}

// ########### ??? idno what to name this, other stuff that uses CSP stuff but is not directly CSP stuff ##########

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
        let newP = new Player(id, name, power, whitelist, blacklist);
        // TODO: add whitelist
        //newP.setWhitelist(stuff);
        // TODO: add blacklist
        //newP.setBlacklist(stuff);
        playersList.push(newP);
    });
}

function addConstraints(CSP, playersList) {
    /*
    let powerlevelSets = {
        1: new Set(), // casual
        2: new Set(), // medium
        3: new Set(), // high
        4: new Set()  // comp
    };
    */
    
    let blacklists = new Set();
    let whitelists = new Set();
    
    playersList.forEach((p1) => {
        
        // powerlevelSets[p1.power].add(p1);

        p1.blacklists.forEach((p2) => {
            blacklists.add(new Set([p1.id, p2.id]))
        });
        
        p1.whitelist.forEach((p2) => {
            whitelists.add(new Set([p1.id, p2.id]))
        });
    });
    // Add blacklist constraints
    blacklists.forEach((subset) => {
        let p1 = subset[0];
        let p2 = subset[1];
        CSP.addConstraint(
            new Constraint("blacklist-" + p1.id + "-" + p2.id, () => {return p1.value !== p2.value;})
        );
    });
    // Add whitelist constraints
    whitelists.forEach((subset) => {
        let p1 = subset[0];
        let p2 = subset[1];
        CSP.addConstraint(
            new Constraint("whitelist-" + p1.id + "-" + p2.id, () => {return p1.value === p2.value;})
        );
    });
}

/* Models the problem as a CSP */
function createCSPProblem() {
    let CSP = new CSPModel();

    let players = collectPlayers();
    let maxDomainInt = Math.round(players.length / 2);
    players.forEach((player) => {
        CSP.addVariable(player);
        CSP.setDomain(
            Set.from(
                Array(maxDomainInt).keys()
            )
        );
    });
    addConstraints(CSP, players);
    return CSP;
}

/*
    basically the main function
    collects all info from the DOM and performs the search
    returns an array of arrays, with each sub-array containing ids of the pairings
    e.x. [[1, 12, 50, 57], [2, 3, 4, 5], ...]
*/
function sortPlayers() {
    let CSP = createCSPProblem();
    let solver = new Solver(CSP);
    solver.solve();
    solver.getSolution();
}