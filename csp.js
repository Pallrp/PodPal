// yfirferð todos
// TODO: ath let og var declarations https://stackoverflow.com/questions/762011/what-is-the-difference-between-let-and-var
// TODO: ath python brainrot með for(value of iterable), ekki for(value in iterable)
// TODO: ekki hægt að loop-a dicts með forEach, hægt að nota for (let key in dict) {}

// ########### CONSTANTS ##########
const powerDomain = [
    1, // casual
    2, // medium
    3, // high
    4  // competetive
];
const MAXPOD = 4;

// ########### CSP Classes ##########

class PVar {
    constructor(player) {
        this.id = player.id;
        this.name = player.name;
        this.power = player.power;
        
        this.value = null;
        this.domain = new Set();
        this.constraintScope = new Set();
    }

    /* Adds the domain to the given variable */
    setDomain(domain) {
        if (typeof domain !== 'Set') {
            domain = new Set(domain);
        }
        this.domain = domain;
    }

    addToConstraintScope(constraint) {
        this.constraintScope.add(constraint);
    }

    assignValue(value) {
        this.value = value;
    }

    resetValue() {
        this.value = value;
    }

    /* Removes the value from this variables domain */
    pruneValue(self, value) {
        self.domain.delete(value);
    }

    /* Adds the value from this variables domain */
    unpruneValue(self, value) {
        self.domain.add(value);
    }
}

class Constraint {
    constructor(name, callback, scope) {
        this.name = name;
        this.callback = callback;
        this.weight = 0;
        this.varScope = new Set(scope);
    }

    setScope(scope) {
        this.varScope = scope;
    }

    setWeight(newWeight) {
        this.weight = newWeight;
    }

    getUnassignedVars() {
        // TODO: return unassigned variables from scope
    }

    isSatisfied() {
        return this.callback();
    }
}


class CSPModel {
    constructor(maxPods) {
        this.variables = {};
        this.constraints = new Set();
        this.variablesN = 0; // dicts don't contain length/size values so need to keep track of them here
        this.maxPods = maxPods;
        this.pods = Array.apply(null, Array(maxPods)).map(() => {return new Set()});
    }
    
    /* Adds a variable to the model */
    addVariable(player) {
        let newVar = new PVar(player);
        this.variables[newVar.id] = newVar;
        this.variablesN++;
        return newVar;
    }

    /* Adds a constraint to the model and sets scope for each related variable */
    addConstraint(constraint) {
        this.constraints.add(constraint);
        constraint.scope.forEach((variable) => {
            this.variables[variable.id].addToConstraintScope(constraint);
        });
    }

    /* returns each variable that has an unassigned value */
    getUnassignedVariables() {
        var unassignedVars = [];
        for (let key in this.variables) {
            if (this.variables[key].value === null) {
                unassignedVars.push(this.variables[key].id);
            }
        }
        return unassignedVars;
    }
    
    /* Adds player (pVar) to a pod (this.pods) keeping track how many are in a pod */
    addToPod(pVar, pod) {
        this.pods[pod].add(pVar.id);
    }

    /* Removes player (pVar) from a pod */
    removeFromPod(pVar, pod) {
        this.pods[pod].delete(pVar.id);
    }

    /* Returns True if there is empty space for another player in the given pod */
    isPodFull(pod) {
        return this.pods[pod].size < MAXPOD;
    }

}

// ######### Propagators ############
/*
    propagators have the task to prune values from variable domains once they have been assigned
    a value. This decreases the search space by a considerable margin and is the primary factor
*/

/*
    Check each value from given variable if they satisfy the constraint of that variable's scope
    If a constraint is not satisfied from the value, prune it.
*/
function forwardCheck(pVar) {
    // if all value assignments result in unsatisfied constraints, we should not continue further
    let isSatisfiable = false;
    let prunings = {};
    // construct new iterator for set in case values are pruned and break the pVar.domain iterator
    for (let value of new Set(pVar.domain).entries()) {
        value = value[0];
        pVar.assignValue(value);
        // check for value support (if any value assignment is supported by the constraints of this variable)
        // Alternatively a support dict can be set up for each value, but for the scope of this problem, it might become very memory intensive
        // instead we lose some efficiency here and perform the support search on runtime for each check.
        for (let constraint in pVar.constraintScope.entries()) {
            if (constraint.isSatisfied()) {
                isSatisfiable = true;
            } else {
                // this breaks a constraint, prune the value
                pVar.pruneValue(value);
                prunings[pVar.id] = value;
                break;
            }
        }
        // we're not doing value assignments here, reset the Variable
        pVar.resetValue();
    }
    return isSatisfiable, prunings;
}

function forwardCheckPropagator(CSP, nextVar) {
    var prunings = {};
    var newPrunings = {};
    var varScope = {};
    var pVar = null;
    var shouldContinue = true;
    for (let constraint of CSP.constraints.entries()) {
        constraint = constraint[0];
        varScope = constraint.getUnassignedVars();
        // check each constraint with only one unassigned variable
        if (varScope.size == 1) {
            pVar = varScope.keys().next().value;
            // if new assignments fail to satisfy all constraints, we should not continue
            shouldContinue, newPrunings = forwardCheck(pVar);
            extendDict(
                prunings,
                newPrunings
            );
        }
        // if a single unassigned variable in this constraints scope cannot be assigned a value, we should not continue
        if (!shouldContinue) {
            break;
        }
    }
    return shouldContinue, prunings
}

// ######### Solution finders #########
class Solver {
    constructor(CSP) {
        this.CSP = CSP;
        this.assignments = {};
        this.solutions = [];
        this.assignmentsN = 0;
        this.temporaryConstraints = new Set();
    }

    /*
        Returns the next unassigned variable that's most 'promising'
        promising meaning it has the least number of value iterations from their scope.
        NOTE/TODO: ordering by play numbers is promising inside this function?
    */
    nextVariable() {
        var unassignedVars = this.CSP.getUnassignedVariables();
        if (this.assignmentsN === 0) {
            // doesn't matter which variable we start with, no pruning has been done.
            return unassignedVars[0];
        }
        var lowestVals = [];
        var lowestDomainSize = Infinity;
        for (let i = 0; i < unassignedVars.length; i++) {
            if (lowestDomainSize > unassignedVars[i].domain.size) {
                lowestDomainSize = unassignedVars[i].domain.size;
                lowestVals = [unassignedVars[i]];
            } else if (lowestDomainSize == unassignedVars[i].domain.size) {
                lowestVals.push(unassignedVars[i]);
            }
        }
        // heuristic approach based on domain sizes
        // TODO: additional sort based on play numbers instead of randomizing?
        return lowestVals[Math.floor(Math.random()*lowestVals.length) % lowestVals.length];
    }

    /* Assign a value to a variable */
    assignValue(pVar, value) {
        pVar.assignValue(value); // assign value to variable
        this.assignments[pVar.id] = value; // add (key,val) to assignment dict
        this.assignmentsN ++; // hold onto number of assignments
        this.CSP.addToPod(pVar, value); // add to CSP pod
    }

    resetValue(pVar) {
        delete this.assignments[pVar.id]; // remove assignment
        pVar.resetValue(); // reset value from variable
        this.assignmentsN --; // hold onto number of assignments
        this.CSP.removeFromPod(pVar, value); // remove from CSP pod
    }

    /* Re-add all values to domain scopes from the prunings in the given dict */
    resetPrunings(prunings) {
        prunings.forEach((varKey) => {
            prunings[varKey].forEach((prunedVal) => {
                this.CSP.variables[varKey].unpruneValue(prunedVal);
            });
        });
    }
    
    /* returns true if all values are assigned */
    allAssigned() {
        return this.assignmentsN === this.CSP.variablesN;
    }

    /*
        Returns the current powerlevel of the pod (float)
    */
    getPodPower(podNo){
        let podPower = null;
        if (podNo !== null) {
            // total power
            podPower = Array.from(this.CSP.pods[podNo]).reduce((prev, curr) => {
                return prev + this.CSP.variables[curr].power;
            }, 0);
            // divided by number of peeps
            podPower /= this.CSP.pods[podNo].size;
        }
        return podPower;
    }

    /*
        Mismatching power levels tell if a constraint will need to be added to discourage the given player variable
        from being added to the given pod.
    */
    powerLevelsMatch(pVar, podPower) {
        // TODO: this is rudamentary implementation that matches exact level
        //      future implementations can add a range here (between n-1 and n+1?)
        return pVar.power === Math.floor(podPower);
    }
    /*
        Power level constraints are cardinality constraints that _should_ have their variables scopes set as the pods
        But since pods are not regular variables, they are global, the constraint assignment before activating the solver
        would create n^2 constraints, which is incredibly inefficient.
        Instead, temporary constraints are added so deeper recursions will be able to use them. This way we can immediately prune values since their scopes
        are singletons (each temporary constraint should only require a single variable, describing they should not enter this specific pod)
    */
    addTempPowerConstraint(pVar, podNo, podPower, recursionLevel) {
        // TODO: implement

        let newConstr = new Constraint(
            "PowerConstraint-" + pVar.id + ":" + podPower,
            function () {
                if (pVar.value == podNo && pVar.power != podPower) {

                }
                return true;
            },
            [pVar]
        );
    }

    /*
        This is how normal propagators work, they are checked before assigning new values and prune
        values from domains of the rest of the unassigned variables
    */
    preValuePropagator(nextVar, lastPodNo, recursionLevel) {
        // TODO: pæling, bæta last value added í recursion, og tékka á pod full þannig, svo það þarf ekki að tékka á öllu fyrir hvert recursion
        //      Hérna er hægt að bæta við temporary constraint til að banna fólki að sitjast í sama pod ef power levels matcha ekki
        var shouldContinue;
        var prunings = {};
        var unassignedVars = this.CSP.getUnassignedVariables();
        // pod checking propagation is very difficult to implement since adding variables to the constraints scope is never going to bear fruit unless the last
        // assigned players are being added. which is too late to be pruning values. Instead a special propagator is used for the pods outside of any normal algorithm
        if (lastPodNo) {
            var podPower = this.getPodPower(lastPodNo);
            for (let i = 0; i <  unassignedVars.length; i++) {
                var pVar = unassignedVars[i];
                // last pod that had a value assigned is now full, prune the value from every unassigned variable
                if (this.CSP.isPodFull(lastPodNo)) {
                    prune(pVar, lastPodNo, prunings);
                    if (pVar.scope.size === 0) {
                        // scope exhausted, discontinue
                        return false, prunings;
                    }
                }
                if (!this.powerLevelsMatch(pVar, podPower)) {
                    // values will be pruned if necessary in forward checking
                    // TODO: get a reference of this for the current recursion, to remove this constraint later
                    this.addTempPowerConstraint(pVar, lastPodNo, podPower, recursionLevel);
                }
            }
            // power level propagation here
        }
        if (shouldContinue) {
            // currently implementing forward checking propagation
            // if interested in efficiency from value pruning algorithms, do check out:
            //  * basic backtracking (propagation based on assigned values only)
            //  * Generalized Arc Consistency (bit more complicated, might be faster but is also a memory hog with this many constraints)
            shouldContinue, prunings = forwardCheckPropagator(this.CSP, nextVar);
        }
        return shouldContinue, prunings;
    }

    /*
        When a solution is found it is added to possible solutions
        NOTE: its possible to add more solutions here in the future if needed and have user select the most promising one
            This comes at a much higher computational cost, but could still be neat 8)
    */
    addSolution() {
        // TODO: add current this.assignments to a possible solution
    }

    
    /* Returns an iterable of values from the current pVar sorted for efficiency */
    getValuesIterable(pVar) {
        // TODO: sort values by number of seats left?
        return Array.from(pVar.domain);//.sort((a, b) => {return a.domain.size - b.domain.size});
    }

    /*
        Main algorithm follows a recursive path deeper, assigning each variable a value as it goes.
        Preferrably the value that prunes the most values from the rest of the variables should be picked first,
        but in each recursion, the algorithm tries to prune more possible values, reducing the search space.
        After each iteration of value assignment, all pruned values are added back into the variable domains
        and the variable is reset.
    */
    backtrackSolve(lastValue=null, recursionLevel=0) {
        var shouldContinue, prunings, nextVar;
        if (this.allAssigned() === true) {
            if (this.CSP.allConstraintsSatisfied()) {
                this.addSolution();
            }
            return false;
        }

        nextVar = this.nextVariable();
        shouldContinue, prunings = this.preValuePropagator(nextVar, lastValue, recursionLevel);
        if (shouldContinue === true) {
            if (nextVar !== null) {
                for(var nextValue of this.getValuesIterable(nextVar)) {
                    this.assignValue(nextVar, nextValue);
                    // recursive call deeper
                    this.backtrackSolve(nextValue, recursionLevel);
                    // reset value before next iteration (clears pods)
                    this.resetValue(nextVar);
                }

            }
        }
        // remove prunings from this recursion
        this.resetPrunings(prunings);
        }
    }

    solve() {
        this.backtrackSolve([]);
    }

    getSolution() {

    }
}

// ########### HELPER FUNCTIONS ##########
/*
    Extends dictA with key,value from another dictB
*/
function extendDict(dictA, dictB) {
    dictB.forEach(function (key) {dictA[key] = dictB[key];});
}
/*
    Prune a value from a variable scope if it exists, returns either a new dict or adds it to the supplied dict
*/
function prune(pVar, value, prunings=null) {
    if (prunings === null) {
        prunings = {}
    }
    if (pVar.scope.has(value) === true) {
        // only add pruned value if it was truly pruned
        // we dont want to add it to the pruned set and then re-add it erroneously afterwards
        addValToDictSet(prunings, pVar.id, value);
    }
    return prunings;
}
/* Adds a value to a dict's value set, if key does not exist, create a new set */


// ########### ??? idno what to name this, other stuff that uses CSP stuff but is not directly CSP stuff ##########

/* 
    Collects all players added as an array of players
    [
        Player({id, name, power, whitelist, blacklist}),
        ...
    ]
*/

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
            new Constraint("blacklist-" + p1.id + "-" + p2.id, () => {return p1.value !== p2.value;}, [p1, p2])
        );
    });
    // Add whitelist constraints
    whitelists.forEach((subset) => {
        let p1 = subset[0];
        let p2 = subset[1];
        CSP.addConstraint(
            new Constraint("whitelist-" + p1.id + "-" + p2.id, () => {return p1.value === p2.value;}, [p1, p2])
        );
    });
    // TODO: add power level constraints (O(N^2) surely...)

    
    // TODO: it is possible to define the pod sets right here, but not define them as variables
    //      This will make it so that no postValue assignment propagation is needed, since propagation
    //      will be done after the value is set in the next loop
    //      Each pod constraint will be handled inside the CSP model, never iterated as an 'unassigned variable'
    //      and furthermore be easier to handle and set up instead of iterating after each value assignment loop
    //      when a value is assigned, a pod is populated, and the constraints will fail

    // byrja á að henda powerlevel á nkl sama level, tekur mun styttri tíma út af betri constraints
    // halda þeirri virkni fyrir selection í shuffle og vista "most promising" niðurstöðu, til að birta og hafa alla sem fengu
    // ekki value fara ósortaða til hliðar
}

/* Models the problem as a CSP */
function createCSPProblem() {
    let players = collectPlayers();
    // The search space is heavily influenced by the domains of each variable
    // We assume we can sort players in a pod of 3 at the very least
    // lowering the assignments of players to 2 in a pod will significantly alter the efficiency of this algorithm
    // The entire search space should be around Players^Number of pods
    // (as a sanity check, 24 players with 3 in a pod creates a search space of ~11*10^10, while 2 in a pod makes a ~36*10^15)
    // more constricting black/whitelists will significantly alter the size of the search space, while power levels will
    // alter pod assignments further inside the algorithm when initial players have been assigned a pod
    let maxDomainInt = Math.round(players.length / 3);
    let CSP = new CSPModel(maxDomainInt);

    var pVar;
    players.forEach((player) => {
        pVar = CSP.addVariable(player);
        pVar.setDomain(
            new Set(
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
    return solver.getSolution();
}