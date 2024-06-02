function loadPage() {
    addPlayer("Maximus Timmy", Powerlevel.CASUAL);
    addPlayer("Bruhman Lower", Powerlevel.MEDIUM);
    addPlayer("John Doe", Powerlevel.MEDIUM);
    addPlayer("Peter Rizzman", Powerlevel.COMP);
    addPlayer("Chad.", Powerlevel.COMP);
}

const playerTemplateEl = (document.getElementById('player-container-template') as HTMLElement);
const playerContainer = (document.getElementById('players-container') as HTMLElement);
var playerCount = 0;

const Powerlevel = {
    CASUAL: 1,
    MEDIUM: 2,
    HIGH: 3,
    COMP: 4
};

function getPowerClass(powerLevel:number) {
    let powerStr = "power-"
    let level = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   level = "casual";   break;
        case (Powerlevel.MEDIUM):   level = "medium";   break;
        case (Powerlevel.HIGH):     level = "high";     break;
        case (Powerlevel.COMP):     level = "comp";     break;
        default:                    level = "err";      break;
    }
    return powerStr + level;
}

function getPowerVerboseName(powerLevel:number):string {
    let powerStr = ""
    switch (powerLevel) {
        case (Powerlevel.CASUAL):   powerStr = "Casual/Precon"; break;
        case (Powerlevel.MEDIUM):   powerStr = "Medium";        break;
        case (Powerlevel.HIGH):     powerStr = "High";          break;
        case (Powerlevel.COMP):     powerStr = "CEDH";          break;
        default:                    powerStr = "Error";         break;
    }
    return powerStr;
}

function removePlayer(playerId:string):undefined {
    let p = document.getElementById(playerId)
    if (p !== null) {
        p.remove();
    }
}

function addPlayer(name:string, powerLevel:number) {
    playerCount++;
    let newPlayerEl = (playerTemplateEl.cloneNode(true) as HTMLElement);
    // replace template id
    let newId = "player-" + playerCount;
    newPlayerEl.setAttribute('id', newId);
    // add attributes
    let a = (newPlayerEl.querySelector('.player-name') as HTMLElement).innerHTML = name;

    let levelCls = getPowerClass(powerLevel);
    let levelName = getPowerVerboseName(powerLevel);
    let powerContainer = (newPlayerEl.querySelector('.player-power-container') as HTMLElement)
    powerContainer.classList.add(levelCls);
    powerContainer.innerHTML = levelName;
    newPlayerEl.setAttribute('value', String(powerLevel));
    
    // add remove button functionalities
    newPlayerEl.querySelector('.rm-player-btn')?.addEventListener("click", function (el) {
        removePlayer(newId);
    });

    // add node to player list
    playerContainer.appendChild(newPlayerEl);
}

loadPage();