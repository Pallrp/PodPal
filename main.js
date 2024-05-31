function loadPage() {
    addPlayer("Maximus Timmy", Powerlevel.CASUAL);
    addPlayer("Bruhman Lower", Powerlevel.MIDLOWER);
    addPlayer("John Doe", Powerlevel.MID);
    addPlayer("Peter Rizzman", Powerlevel.MIDUPPER);
    addPlayer("Chad.", Powerlevel.COMP);
}

const playerTemplateEl = document.getElementById('player-container-template');
const playerContainer = document.getElementById('players-added-container');
var playerCount = 0;

const Powerlevel = {
    CASUAL: 1,
    MIDLOWER: 2,
    MID: 3,
    MIDUPPER: 4,
    COMP: 5
};

function getPowerClass(powerLevel) {
    let powerStr = "power-"
    let level = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   level = "casual";   break;
        case (Powerlevel.MIDLOWER): level = "lowermid"; break;
        case (Powerlevel.MID):      level = "mid";      break;
        case (Powerlevel.MIDUPPER): level = "uppermid"; break;
        case (Powerlevel.COMP):     level = "comp";     break;
        default:                    level = "err";      break;
    }
    return powerStr + level;
}

function getPowerVerboseName(powerLevel) {
    let powerStr = ""
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   powerStr = "Casual";        break;
        case (Powerlevel.MIDLOWER): powerStr = "Lower mid";     break;
        case (Powerlevel.MID):      powerStr = "Mid";           break;
        case (Powerlevel.MIDUPPER): powerStr = "Upper mid";     break;
        case (Powerlevel.COMP):     powerStr = "Competetive";   break;
        default:                    powerStr = "Error";         break;
    }
    return powerStr;
}

function removePlayer(playerId) {
    document.getElementById(playerId).remove();
}

function addPlayer(name, powerLevel) {
    playerCount++;
    let newPlayerEl = playerTemplateEl.cloneNode(true);
    // replace template id
    let newId = "player-" + playerCount;
    newPlayerEl.setAttribute('id', newId);
    // add attributes
    newPlayerEl.querySelector('.player-name').innerHTML = name;

    let levelCls = getPowerClass(powerLevel);
    newPlayerEl.querySelector('.player-power-container').classList.add(levelCls);
    
    let levelName = getPowerVerboseName(powerLevel);
    newPlayerEl.querySelector('.player-power-container').innerHTML = levelName;
    
    // add remove button functionalities
    newPlayerEl.querySelector('.rm-player-btn').addEventListener("click", function (el) {
        removePlayer(newId);
    })

    // add node to player list
    playerContainer.appendChild(newPlayerEl);
}

loadPage();